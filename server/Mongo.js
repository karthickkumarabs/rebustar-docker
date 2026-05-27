/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { Config } from '../config/AppConfig.js'
import { Logger } from '../utils/Logger.js'

const Mongo = async () => {
  // Logger
  const logger = new Logger()
  try {
    // Options
    const options = {
      useNewUrlParser: true,
      autoIndex: false // Don't build indexes
      // useMongoClient: false,
      // useFindAndModify: false,
      // reconnectTries: 30, // Retry up to 30 times
      // reconnectInterval: 500, // Reconnect every 500ms
      // poolSize: 10, // Maintain up to 10 socket connections
      // // If not connected, return errors immediately rather than waiting for reconnect
      // bufferMaxEntries: 0
    }

    const connectionString = Config.database

    const establishCon = await new Promise((resolve, reject) => {
      mongoose
        .connect(connectionString, options)
        .then(() => {
          logger.log(`MongoDB connection established.`, 'info')
          resolve('Connection Established')
        })
        .catch((err) => {
          logger.log(`MongoDB connection unsuccessful : \n ${err}`, 'error')
          reject(new Error('Connection has some issue.'))
        })
    })

    return establishCon
  } catch (error) {
    logger.log(`MongoDB connection unsuccessful : \n ${error.message}`, 'error')
    process.exit(1)
  }
}

export { Mongo }
