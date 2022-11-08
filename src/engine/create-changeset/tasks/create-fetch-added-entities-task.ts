import {Entry} from 'contentful'
import {ListrTask} from 'listr2'
import {chunk, pick} from 'lodash'
import {LogLevel} from '../../logger/types'
import {CreateChangesetContext} from '../types'

function cleanEntity(entry: Entry<any>): any {
  return {...entry, sys: pick(entry.sys, ['id', 'type', 'revision', 'contentType', 'locale'])}
}

export function createFetchAddedEntitiesTask(shouldExecute: boolean): ListrTask {
  return {
    title: 'Fetch full payload for added entities',
    skip: !shouldExecute,
    task: async (context: CreateChangesetContext, task) => {
      const {client, ids: {added}, sourceEnvironmentId, changeSet, limit, logger} = context
      logger.log(LogLevel.INFO,  'Start createFetchAddedEntitiesTask')

      task.title = `Fetch full payload for ${added.length} added entities`

      const idChunks = chunk(added, limit)
      let iterator = 0

      for (const chunk of idChunks) {
        task.output = `Fetching ${limit} entities ${++iterator * limit}/${added.length}`
        const query = {'sys.id[in]': chunk.join(','), locale: '*', limit}
        // eslint-disable-next-line no-await-in-loop
        const entries = await client.cda.entries.getMany({
          environment: sourceEnvironmentId,
          query,
        }).then(response => response.items)

        for (const entry of entries) {
          const item = changeSet.items.find(item => item.entity.sys.id === entry.sys.id)
          if (item && item.changeType === 'added') {
            item.data = cleanEntity(entry)
          }
        }
      }
    },
  }
}
