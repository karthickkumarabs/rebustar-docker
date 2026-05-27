/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import mongoose from 'mongoose'
import { BaseController } from '../../../controllers/BaseController.js'

import MessageDelivery from '../models/MessageDelivery.js'
import Trip from '../../../models/ServiceModule/Trip.js'

import { SocketValidator } from '../../../validators/Module/SocketValidator.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ChatController extends BaseController {
  constructor() {
    super()
  }

  static getMessages = async (req, res) => {
    try {
      const queryData = req.query
      const validation = await SocketValidator.validateData(queryData, 'getMessages')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const userId = mongoose.Types.ObjectId(req.auth.userId)
      // const userRole = req.auth.userRole
      const tripId = mongoose.Types.ObjectId(queryData.tripId)

      const tripData = await Trip.findOne({
        _id: tripId,
        $or: [{ 'customer.id': userId }, { 'partner.id': userId }]
      })
        .lean()
        .exec()
      if (!tripData) throw new Error('NOT_FOUND|TRIP')

      const messages = await MessageDelivery.aggregate([
        { $match: { receiverId: userId } },
        {
          $lookup: {
            from: 'messages',
            let: {
              messageId: '$messageId'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$_id', '$$messageId'] }, { $eq: ['$tripId', tripId] }]
                  }
                }
              }
            ],
            as: 'message'
          }
        },
        { $unwind: { path: '$message' } },
        { $limit: Number(perPage) },
        { $skip: Number(skip) },
        {
          $project: {
            'message.context': 1,
            'message.content': 1,
            'message.seen': 1,
            'message.userId': 1,
            'message.createdAt': 1
          }
        }
      ])
      return requestHandler.sendSuccess(
        req,
        res,
        'MESSAGE_LISTED'
      )({ message: 'MESSAGE_LISTED|SOCKETMESSAGE', messages })
    } catch (error) {
      console.log(error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteMessages = async (req, res) => {
    try {
      const nowDate = new Date()
      let { messageId } = req.query
      let messagedata = []
      if (messageId) {
        messageId = JSON.parse(messageId)
        const ids = messageId.split(',')
        await MessageDelivery.updateMany(
          {
            messageId: { $in: ids },
            deletedAt: null
          },
          { $set: { deletedAt: nowDate } }
        )
        messagedata = await MessageDelivery.find({
          messageId: { $in: ids },
          deletedAt: null
        })
      } else {
        await MessageDelivery.updateMany(
          {
            createdAt: nowDate,
            deletedAt: null
          },
          { $set: { deletedAt: nowDate } }
        )
        messagedata = await MessageDelivery.find({
          createdAt: { $lte: nowDate }
        })
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'MESSAGE_DELETED'
      )({ message: 'MESSAGE_DELETED|SOCKETMESSAGE', messagedata })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}
export { ChatController }
