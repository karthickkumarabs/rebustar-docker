/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as fs from 'fs'
import path from 'path'

import { BaseService } from '../../services/BaseService.js'
import DatabaseLogs from './DatabaseModel.js'

class DatabaseServices extends BaseService {
  static modifyDatabaseLog = async (data) => {
    // try {
    let databaseLog = null
    if (data.logId) databaseLog = DatabaseLogs.findOne({ _id: data.logId })
    else databaseLog = new DatabaseLogs()

    if (!databaseLog) throw new Error('SOMETHING_WENT_WRONG')

    databaseLog.fileName = data.fileName
    if (data.actionBy) databaseLog.actionBy = data.actionBy
    const databaseLogData = await databaseLog.save()
    return databaseLogData
    // } catch (error) {
    //   throw error
    // }
  }

  static deleteDatabaseLog = async (data) => {
    // try {
    let filterQuery = null
    if (data.fileNames && Array.isArray(data.fileNames)) filterQuery = { fileName: { $in: data.fileNames } }
    if (data.logId) filterQuery = { _id: data.logId }
    if (!filterQuery) throw new Error('SOMETHING_WENT_WRONG')
    const databaseLogData = await DatabaseLogs.find(filterQuery)
    const deletedDatabaseLog = await DatabaseLogs.deleteMany(filterQuery)
    if (data.logId && databaseLogData && databaseLogData.length > 0) {
      for (const databaseLog of databaseLogData) {
        const filePath = path.join(data.BACKUP_FOLDER, databaseLog.fileName)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
    }
    return deletedDatabaseLog
    // } catch (error) {
    // throw error
    // }
  }
}

export { DatabaseServices }
