/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

import { parentPort, workerData } from 'worker_threads'
import { DatabaseServices } from './DatabaseService.js'
import { Mongo } from '../../server/Mongo.js'

import { exec } from 'child_process'
import * as fs from 'fs'
import path from 'path'

// import { dirname } from 'node:path'
// import { fileURLToPath } from 'node:url'

// const __dirname = dirname(fileURLToPath(import.meta.url))

// Configuration
const BACKUP_FOLDER = workerData.BACKUP_FOLDER
const BACKUP_LIMIT = workerData.BACKUP_LIMIT

// Ensure backup folder exists
if (!fs.existsSync(BACKUP_FOLDER)) {
  fs.mkdirSync(BACKUP_FOLDER)
}

// // parseURL
// const parseMongoUrl = (MONGO_URI) => {
//   // Remove the "mongodb://" prefix
//   const WITHOUT_PREFIX = MONGO_URI.replace('mongodb://', '')

//   // Split the URL into the credentials part and the rest
//   const [CREDENTIALS,HOSTANDDB] = WITHOUT_PREFIX.split('@')

//   // Extract username and password
//   const [DATABASE_USER = null, DATABASE_PASS = null] = CREDENTIALS ? CREDENTIALS.split(':') : []

//   // Extract database name (the part after the last slash)
//   const DATABASE_NAME = HOSTANDDB.split('/')[1]

//   return {
//     DATABASE_USER,
//     DATABASE_PASS,
//     DATABASE_NAME
//   }
// }

function parseMongoUrl(MONGO_URI) {
  const regex = /^mongodb:\/\/(?:([^:]+):([^@]+)@)?([^:\/]+):(\d+)\/([^?\/]+)/
  const matches = MONGO_URI.match(regex)
  if (matches) {
    const DATABASE_USER = matches[1] || null
    const DATABASE_PASS = matches[2] || null
    const DATABASE_HOST = matches[3]
    const DATABASE_PORT = parseInt(matches[4], 10)
    const DATABASE_NAME = matches[5]
    return {
      DATABASE_USER,
      DATABASE_PASS,
      DATABASE_HOST,
      DATABASE_PORT,
      DATABASE_NAME
    }
  }
  return null // Return null if the URL doesn't match the pattern
}

// Function to create a database backup
const createBackup = () => {
  const CONFIG_DATA = workerData
  console.log('createBackup', workerData, CONFIG_DATA.MONGO_URI)
  return new Promise((resolve, reject) => {
    Mongo()
      .then(async (data) => {
        try {
          let {
            DATABASE_NAME = null,
            DATABASE_USER = null,
            DATABASE_PASS = null,
            DATABASE_HOST = null,
            DATABASE_PORT = null
          } = CONFIG_DATA
          if (CONFIG_DATA.MONGO_URI && CONFIG_DATA.MONGO_URI != '')
            ({
              DATABASE_NAME,
              DATABASE_USER = null,
              DATABASE_PASS = null,
              DATABASE_HOST,
              DATABASE_PORT
            } = parseMongoUrl(CONFIG_DATA.MONGO_URI))

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const backupName = `db_backup_${timestamp}.gz`
          const backupPath = path.join(BACKUP_FOLDER, backupName)

          console.log(`Creating backup for database: ${DATABASE_NAME}`)

          // Command preparation
          let DUMP_COMMAND = null
          if (DATABASE_USER && DATABASE_PASS)
            DUMP_COMMAND = `mongodump --host ${DATABASE_HOST} --port ${DATABASE_PORT} --username ${DATABASE_USER} --password ${DATABASE_PASS} --db ${DATABASE_NAME} --archive=${backupPath} --gzip`
          else DUMP_COMMAND = `mongodump --db ${DATABASE_NAME} --archive=${backupPath} --gzip`

          // Command to dump the specified MongoDB database
          exec(DUMP_COMMAND, async (error, stdout, stderr) => {
            if (error) {
              mongoose.connection.close()
              reject(error)
            } else {
              try {
                await manageBackups()
                await DatabaseServices.modifyDatabaseLog({
                  fileName: backupName,
                  actionBy: CONFIG_DATA?.actionBy || 'CRON'
                })
                mongoose.connection.close()
                resolve(backupPath)
              } catch (error) {
                mongoose.connection.close()
                reject(error)
              }
            }
          })
        } catch (error) {
          mongoose.connection.close()
          reject(error)
        }
      })
      .catch((error) => {
        reject(error)
      })
  })
}

// Function to keep only the last 3 backups
const manageBackups = async () => {
  try {
    const files = fs
      .readdirSync(BACKUP_FOLDER)
      .filter((file) => file.endsWith('.gz'))
      .map((file) => ({ file, time: fs.statSync(path.join(BACKUP_FOLDER, file)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time)

    if (files.length > BACKUP_LIMIT) {
      const filesToDelete = files.slice(BACKUP_LIMIT)
      const selectedFilenames = []
      console.log('filesToDelete', JSON.stringify(filesToDelete))
      filesToDelete.forEach(({ file }) => {
        const filePath = path.join(BACKUP_FOLDER, file)
        fs.unlinkSync(filePath)
        selectedFilenames.push(file)
        console.log(`Deleted old backup: ${file}`)
      })
      await DatabaseServices.deleteDatabaseLog({ fileNames: selectedFilenames })
    }
  } catch (error) {
    console.error('MANAGE_BACKUPS_ERROR', error)
  }
}

// Function to start the backup worker with a daily interval
// let intervalId
// const start = () => {
//   if (intervalId) {
//     console.log('Backup worker is already running.')
//     return
//   }
//   const ONE_DAY = 24 * 60 * 60 * 1000
//   intervalId = setInterval(createBackup, ONE_DAY)
//   createBackup() // Initial backup
//   console.log('Backup worker started. Scheduled to run daily.')
// }

// // Function to stop the backup worker
// const stop = () => {
//   if (intervalId) {
//     clearInterval(intervalId)
//     intervalId = null
//     console.log('Backup worker stopped.')
//   } else {
//     console.log('Backup worker is not running.')
//   }
// }

// Export start and stop functions
// Listen for messages from the main thread
parentPort.on('message', async (databaseConfig) => {
  try {
    // const backupPath = await createBackup(databaseConfig)
    const backupPath = await createBackup()
    parentPort.postMessage({ success: true, path: backupPath })
  } catch (error) {
    console.log('iam error', JSON.stringify(databaseConfig))
    parentPort.postMessage({ success: false, error })
  }
})
