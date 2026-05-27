/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import Autocomplete from '../models/Autocomplete.js'
import { RedisHelper } from '../../../helpers/RedisHelper.js'
const RedisDB = new RedisHelper()

class RedisAutocomplete {
  constructor() {
    this.Redis = RedisDB.Redis
  }
  async importAutocomplete() {
    try {
      const data = await Autocomplete.find({})
      for (const item of data) {
        const { query, countryCode, predictions } = item
        const redisKey = `autocomplete:${query}:${countryCode}`
        await this.storeAutocompletRedis(redisKey, {
          query: query,
          countryCode: countryCode,
          predictions: predictions
        })
      }
    } catch (error) {
      console.error(error)
      throw new Error('Import Autocomplete Failed')
    }
  }
  async storeAutocompletRedis(key, data) {
    const redisClient = await this.Redis.getConnection()
    return await redisClient.json.set(key, '.', data)
  }

  async createRedisIndex() {
    try {
      console.log('Starting create index')

      const redisClient = await this.Redis.getConnection()
      console.log('Redis connection established')

      const indexInfo = await redisClient.ft.info('autocompleteIdx').catch((err) => {
        console.log('Index does not exist, creating a new one.')
        return null
      })

      if (indexInfo) {
        console.log('Redis Autocomplete Index exists')
        // await redisClient.ft.dropIndex('autocompleteIdx')
        // console.log('Index dropped.')
        return
      }
      await redisClient
        .sendCommand([
          'FT.CREATE',
          'autocompleteIdx',
          'ON',
          'JSON',
          'PREFIX',
          '1',
          'autocomplete:',
          'SCHEMA',
          '$.query',
          'AS',
          'query',
          'TEXT',
          '$.countryCode',
          'AS',
          'countryCode',
          'TAG',
          '$.predictions[*].description',
          'AS',
          'description',
          'TEXT'
        ])
        .then((res) => {
          console.log('Redis Index created successfully')
        })
        .catch((err) => {
          console.error('Error creating index:', err)
        })
    } catch (err) {
      console.error('Error creating index:', err.message)
    }
  }

  async searchAutocompleteRedis(searchTerm, countryCode) {
    try {
      const redisClient = await this.Redis.getConnection()

      let results = await redisClient.ft.search(
        'autocompleteIdx',
        `@query:${searchTerm}* @description:${searchTerm}* @countryCode:{${countryCode}}`
      )
      console.log(results, '======================>')

      if (results.total > 0) {
        return results.documents
      }

      results = await redisClient.ft.search(
        'autocompleteIdx',
        `@query:${searchTerm}* @description:${searchTerm}*`
      )

      return results.documents
    } catch (error) {
      console.error('Search Autocomplete Failed:', error)
      throw new Error('Search Autocomplete Failed')
    }
  }
}

export { RedisAutocomplete }
