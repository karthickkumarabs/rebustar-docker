/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

import Trips from '../../models/ServiceModule/Trip.js'
import Customer from '../../models/Auth/Customer.js'
import Partner from '../../models/Auth/Partner.js'
import Messages from './models/Message.js'
import MessageDelivery from './models/MessageDelivery.js'

import { NotifcationController } from '../../controllers/Notification/Index.js'
import { SocketIO } from './index.js'
import { RedisHelper } from '../../helpers/RedisHelper.js'
import { SocketMiddleware } from '../../middlewares/SocketMiddleware.js'
import { Enum } from '../../utils/Enum.js'

const { authorize } = SocketMiddleware
const RedisDB = new RedisHelper()
const ChatRequest = SocketIO.of('/chatRequest')
ChatRequest.use(authorize)

const sendNotification = async (data) => {
  try {
    const { content, title, template = '', templateData = {}, userId, userRole } = data
    if (!content || !title || !userId || !userRole) throw new Error('BAD_REQUEST')

    let pushToken = null
    if (userRole == Enum.ROLES.CUSTOMER) {
      const customer = await Customer.findOne({ _id: mongoose.Types.ObjectId(userId) }, { fcmId: 1 })
        .lean()
        .exec()
      pushToken = customer.fcmId || null
    } else if (userRole == Enum.ROLES.PARTNER) {
      const partner = await Partner.findOne({ _id: mongoose.Types.ObjectId(userId) }, { fcmId: 1 })
        .lean()
        .exec()
      pushToken = partner.fcmId || null
    } else {
      throw new Error('BAD_REQUEST')
    }
    if (!pushToken) throw new Error('BAD_REQUEST')
    await NotifcationController.createNotification({
      processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
      data: {
        pushToken: pushToken,
        title: title,
        body: content,
        template: template,
        templateData: templateData
      }
    })
  } catch (error) {
    console.error('Chat Notification: ', error)
  }
}

ChatRequest.on('connection', async (socket) => {
  try {
    socket.on('connectChatRequest', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        let { tripId = null } = data
        const { userId, role } = socket.authInfo
        if (!userId || !tripId) throw new Error('UNPROCESSABLE_REQUEST')

        tripId = mongoose.Types.ObjectId(tripId)
        const tripData = await Trips.findOne({
          _id: tripId,
          $or: [{ 'customer.id': userId }, { 'partner.id': userId }]
        })
          .lean()
          .exec()
        if (!tripData) throw new Error('NOT_ALLOWED')

        const conChannel = `${Enum.SOCKET.CHAT}_${tripId}`
        socket.join(conChannel)
        await RedisDB.__addChatUser({ userId, role, socketId: socket.id })
        console.log('connectChatRequest', userId)
        response.data = {
          conChannel: conChannel,
          tripId: tripId,
          user: userId
        }
        response.message = 'CONNECTION_ESTABLISED'
        response.status = true
        response.code = 200
      } catch (error) {
        response.data = {}
        response.message = error.message
        response.status = false
        response.code = 500
      }
      if (typeof callback === 'function') callback(response)
    })

    socket.on('sendMessage', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        let { tripId = null, content, type = 'text', contextid = null } = data
        const { userId, role } = socket.authInfo
        if (!tripId || !userId) throw new Error('UNPROCESSABLE_REQUEST')
        tripId = mongoose.Types.ObjectId(tripId)
        const tripData = await Trips.findOne({
          _id: tripId,
          $or: [{ 'customer.id': userId }, { 'partner.id': userId }],
          status: { $in: [Enum.TRIP.STATUS.ARRIVED, Enum.TRIP.STATUS.ACCEPTED] }
        })
          .lean()
          .exec()
        if (!tripData) throw new Error('NOT_ALLOWED')
        const message = {
          userId: userId,
          userType: role,
          tripId: tripId,
          type: type,
          content: content,
          context: contextid
        }
        const newMessage = await Messages.create(message)
        if (!newMessage) throw new Error('MESSAGE_NOT_STORED')
        const receiverData = {
          userId: role == Enum.ROLES.CUSTOMER ? tripData.partner.id : tripData.customer.id,
          userName: role == Enum.ROLES.CUSTOMER ? tripData.partner.name : tripData.customer.name,
          userRole: role == Enum.ROLES.CUSTOMER ? Enum.ROLES.PARTNER : Enum.ROLES.CUSTOMER
        }
        const deliveryData = [
          {
            messageId: newMessage._id,
            senderId: userId,
            receiverId: userId
          },
          {
            messageId: newMessage._id,
            senderId: userId,
            receiverId: receiverData.userId
          }
        ]
        const deliveryRecord = await MessageDelivery.create(deliveryData)
        if (!deliveryRecord) throw new Error('MESSAGE_NOT_DELIVERED')

        console.log('messageBroadcast', `${Enum.SOCKET.CHAT}_${tripId}`)

        socket.to(`${Enum.SOCKET.CHAT}_${tripId}`).emit('messageBroadcast', {
          data: {
            messages: [newMessage],
            tripId: tripId
          }
        })
        sendNotification({
          content,
          title: 'Message',
          userId: receiverData.userId,
          userRole: receiverData.userRole
        })
        response.data = {
          messages: [newMessage],
          tripId: tripId
        }
        response.message = 'MESSAGE_DELIVERED'
        response.status = true
        response.code = 200
      } catch (error) {
        console.log(error)
        response.data = {}
        response.message = error.message
        response.status = false
        response.code = 500
      }
      if (typeof callback === 'function') callback(response)
    })

    socket.on('seenMessage', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        const nowDate = new Date()
        let { tripId = null } = data
        const { userId } = socket.authInfo
        if (!tripId || !userId) throw new Error('UNPROCESSABLE_REQUEST')
        tripId = mongoose.Types.ObjectId(tripId)
        const tripData = await Trips.findOne({
          _id: tripId,
          $or: [{ 'customer.id': userId }, { 'partner.id': userId }]
        })
          .lean()
          .exec()
        if (!tripData) throw new Error('NOT_ALLOWED')
        await MessageDelivery.updateMany(
          {
            tripId: tripId,
            createdAt: { $lte: nowDate },
            receiverId: { $ne: userId }
          },
          { $set: { seenAt: nowDate, updatedAt: nowDate } }
        )
        const findData = await MessageDelivery.distinct('messageId', {
          tripId: tripId,
          createdAt: { $lte: nowDate },
          receiverId: { $ne: userId }
        })
        await Messages.updateMany(
          {
            tripId: tripId,
            _id: { $in: findData },
            seen: false,
            createdAt: { $lte: nowDate }
          },
          { $set: { seen: true, updatedAt: nowDate } }
        )
        console.log('messageSawBroadcast', `${Enum.SOCKET.CHAT}_${tripId}`)
        socket.to(`${Enum.SOCKET.CHAT}_${tripId}`).emit('messageSawBroadcast', {
          data: {
            userId: userId,
            date: nowDate,
            tripId: tripId
          }
        })
        response.data = {
          userId: userId,
          date: nowDate,
          tripId: tripId
        }
        response.message = 'MESSAGES_UPDATED_TO_SEEN'
        response.status = true
        response.code = 200
      } catch (error) {
        console.log(error)
        response.data = {}
        response.message = error.message
        response.status = false
        response.code = 500
      }
      if (typeof callback === 'function') callback(response)
    })

    socket.on('disconnect', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        const { userId } = socket.authInfo
        console.log('SocketChanneldisconnect!')
        socket.leaveAll()

        if (userId) {
          const removeChannelUser = await RedisDB.__getChatUser({ userId })
          if (removeChannelUser) {
            await RedisDB.__deleteChannelUser({ userId })
          }
        }
        response.data = {}
        response.message = 'USER_REMOVED_FROM_REDIS'
        response.status = true
        response.code = 200
      } catch (error) {
        response.data = {}
        response.message = error.message
        response.status = false
        response.code = 500
      }
      if (typeof callback === 'function') callback(response)
    })
  } catch (error) {
    console.error('Rooms Connect Issue :', error)
  }
})

export { ChatRequest }
