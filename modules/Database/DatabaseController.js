/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import DatabaseLogs from './DatabaseModel.js'
import { Worker } from 'worker_threads'

import path from 'path'
import * as fs from 'fs'

import { Config } from './../../config/AppConfig.js'
import { QueryBuilder } from './../../helpers/QueryBuilder.js'
import { RequestHandler } from './../../utils/RequestHandler.js'
import { Logger } from './../../utils/Logger.js'

import { DatabaseServices } from './DatabaseService.js'
import { BaseController } from '../../controllers/BaseController.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

const BACKUP_LIMIT = 3
const BACKUP_FOLDER = 'public/database'

class DatabaseController extends BaseController {
  constructor() {
    super()
  }

  // Read all logs
  static getLogs = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(DatabaseLogs, queryData)
      queryObject = queryBuilder.queryObject

      // filter for filename
      if (queryData.fileName) {
        queryObject.fileName = { $regex: queryData.fileName, $options: 'i' }
      }

      // filter by type
      if (queryData.actionBy) {
        queryObject.actionBy = { $regex: queryData.actionBy, $options: 'i' }
      }

      const getDataCount = await DatabaseLogs.find(queryObject).count()
      const getData = await DatabaseLogs.find(queryObject).sort({ _id: -1 }).skip(skip).limit(perPage)

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_DATABASE_LOG'
      )({ message: 'DATABASE_LOG', databaseLog: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  // Read a single log by ID
  static getParticularLog = async (req, res) => {
    try {
      const log = await DatabaseLogs.findById(req.params.logId)
      if (!log) throw new Error('LOG_NOT_FOUND')

      return requestHandler.sendSuccess(req, res, 'GET_PARTICULAR_DATABASE_LOG', {
        message: 'PARTICULAR_DATABASE_LOG',
        databaseLog: log
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  // Create a new log
  static createLog = async (req, res) => {
    try {
      const getFileName = await new Promise((resolve, reject) => {
        const BACKUP_FOLDER_PATH = path.join(process.cwd(), BACKUP_FOLDER)
        const workerData = {
          MONGO_URI: Config.database,
          BACKUP_LIMIT: BACKUP_LIMIT,
          BACKUP_FOLDER: BACKUP_FOLDER_PATH,
          actionBy: 'MANUAL'
        }

        const worker = new Worker('./modules/Database/DatabaseWorker.js', {
          workerData: workerData
        })

        worker.postMessage(workerData) // Trigger the 'message' event in the worker

        worker.on('message', (message) => {
          if (message.error) {
            reject(message.error)
          } else {
            console.log('Database Backup Succeed')
            resolve(message)
          }
        })

        worker.on('error', (error) => {
          reject(error)
        })
      })

      console.log('getFileName', getFileName)
      // const savedLog = await DatabaseServices.modifyDatabaseLog(req.body)

      return requestHandler.sendSuccess(req, res, 'CREATE_DATABASE_LOG')({ message: 'CREATED|DATABASE_LOG' })
    } catch (error) {
      console.error('CREATE_DATABASE_LOG_ERROR:', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  // Update a log by ID
  static updateLog = async (req, res) => {
    try {
      const updateData = req.body
      updateData['logId'] = req.params.logId
      const log = DatabaseServices.modifyDatabaseLog(updateData)
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_PARTICULAR_DATABASE_LOG'
      )({ message: 'UPDATE_PARTICULAR_DATABASE_LOG', databaseLog: log })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  // Delete a log by ID
  static deleteLog = async (req, res) => {
    try {
      const log = await DatabaseServices.deleteDatabaseLog({
        logId: req.params.logId,
        BACKUP_FOLDER: path.join(process.cwd(), BACKUP_FOLDER)
      })
      console.log('DELETED_LOGS', log)
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_PARTICULAR_DATABASE_LOG'
      )({ message: 'DELETE_PARTICULAR_DATABASE_LOG' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  // Download a .gz file by ID

  static downloadLog = async (req, res) => {
    try {
      const log = await DatabaseLogs.findById(req.params.logId)
      console.log('🚀 ~ DatabaseController ~ downloadLog= ~ log:', log)
      if (!log) throw new Error('LOG_NOT_FOUND')

      const filePath = path.join(process.cwd(), BACKUP_FOLDER, log.fileName)
      console.log(filePath)

      if (!fs.existsSync(filePath)) {
        throw new Error('FILE_NOT_FOUND')
      }
      // await fs.access(filePath, fs.constants.F_OK) // Check if file exists

      res.setHeader('Content-Type', 'application/gzip') // Set content type
      res.setHeader('Content-Disposition', `attachment; filename=${log.fileName}`) // Set download filename

      const fileStream = fs.createReadStream(filePath)
      fileStream.pipe(res)

      fileStream.on('error', (err) => {
        console.error(err)
        res.status(500).send('Error downloading file')
      })

      // res.download(filePath, log.fileName, (err) => {
      //   if (err) {
      //     console.error(err)
      //     res.status(500).send('Error downloading file')
      //   }
      // })
    } catch (error) {
      console.log(error)
      return res.status(500).send('Error downloading file')
    }
  }
}

export { DatabaseController }
