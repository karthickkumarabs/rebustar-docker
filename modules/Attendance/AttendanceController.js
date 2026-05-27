/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import Attendance from './Attendance.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'

import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class AttendanceController {
  static getAttendance = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const queryBuilder = await QueryBuilder.getSearchable(Attendance, queryData)
      const queryObject = queryBuilder.queryObject

      const getDataCount = await Attendance.find(queryObject).count()
      const getData = await Attendance.find(queryObject).skip(skip).limit(perPage)

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ATTENDANCE'
      )({ message: 'GET_ATTENDANCE', admin: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateAttendance = async (req, res) => {
    try {
      const body = req.body
      const partnerId = req.params.partnerId || req.body.partnerId

      const attendance = await Attendance.findById(partnerId).exec()

      attendance.requested = body.requested || attendance.requested
      attendance.completed = body.completed || attendance.completed
      attendance.cancelled = body.cancelled || attendance.cancelled
      attendance.notresponded = body.notresponded || attendance.notresponded
      attendance.onlineTime = body.onlineTime || attendance.onlineTime
      attendance.lastOn = body.lastOn || attendance.lastOn
      attendance.lastOff = body.lastOff || attendance.lastOff
      attendance.payable = body.payable || attendance.payable
      attendance.commision = body.commision || attendance.commision
      attendance.reference = body.reference || attendance.reference

      const updatedAttendance = await attendance.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_ATTENDANCE'
      )({ message: 'UPDATE|ATTENDANCE', attendance: updatedAttendance })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static attendanceService = async ({ partnerId, status, reference }) => {
    try {
      const todayDate = new Date()
      const findQuery = {
        partner: partnerId,
        createdAt: {
          $gte: new Date(todayDate.setHours(0, 0, 0, 0)),
          $lt: new Date(todayDate.setHours(23, 59, 59, 999))
        }
      }
      const todayData = await Attendance.findOne(findQuery).lean().exec()
      if (todayData && (status === 1 || status === 0)) {
        const updateData = {}
        if (status === 1) {
          updateData['lastOn'] = todayDate
        } else {
          const timeDifference = todayDate - new Date(todayData.lastOn)
          const totalDuration = timeDifference + todayData.onlineTime
          updateData['lastOff'] = todayDate
          updateData['onlineTime'] = totalDuration
        }
        updateData['$push'] = {
          events: {
            type: status === 1 ? 'ONLINE' : 'OFFLINE',
            description: `Last on ${todayData.lastOn} Last off ${todayData.lastOff}`
          }
        }

        await Attendance.findOneAndUpdate(findQuery, updateData, {
          new: true,
          runValidators: true
        })
      } else if (!todayData && status === 1) {
        const addData = {
          partner: partnerId,
          reference,
          lastOn: todayDate,
          events: [
            {
              type: status === 1 ? 'ONLINE' : 'OFFLINE',
              description: `Last on ${todayDate}`
            }
          ]
        }
        const newDoc = await Attendance.create(addData)
        return newDoc
      } else {
        throw new Error('Unproccessable Entry')
      }
    } catch (error) {
      console.error(error.message)
    }
  }
}

export { AttendanceController }
