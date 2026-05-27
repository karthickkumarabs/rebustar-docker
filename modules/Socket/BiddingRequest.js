/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

import Trips from '../../models/ServiceModule/Trip.js'
import Customer from '../../models/Auth/Customer.js'
import Partner from '../../models/Auth/Partner.js'

import { NotifcationController } from '../../controllers/Notification/Index.js'
import { SocketIO } from './index.js'
import { RedisHelper } from '../../helpers/RedisHelper.js'
import { SocketMiddleware } from '../../middlewares/SocketMiddleware.js'
import { Enum } from '../../utils/Enum.js'
import { BiddingController } from '../Bidding/controllers/BiddingController.js'

const { authorize } = SocketMiddleware
const RedisDB = new RedisHelper()
const BiddingRequest = SocketIO.of('/biddingRequest')
BiddingRequest.use(authorize)

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
const checkTripdata = async (tripId) => {
  const tripData = await Trips.findOne({
    _id: tripId,
    status: { $in: [Enum.TRIP.STATUS.REQUESTED, Enum.TRIP.STATUS.PROCESSING] }
  })
    .lean()
    .exec()
  return tripData
}

const checkUsertype = async (userId) => {
  const isPartner = await Partner.exists({ _id: mongoose.Types.ObjectId(userId) })
  return isPartner ? Enum.ROLES.PARTNER : Enum.ROLES.CUSTOMER
}

const triggerNotification = async (userIds, content, userId, userType, amount) => {
  const senderIdStr = userId.toString()
  const tasks = userIds
    .filter((id) => id.toString() !== senderIdStr)
    .map(async (targetUserId) => {
      let message
      switch (content) {
        case 'Update':
          message = `Your ${userType} has bidded the amount of ${amount}.`
          break
        case 'Accepted':
          message = `Your ${userType} accepted the bidding amount of ${amount}.`
          break
        case 'Rejected':
          message = `Your ${userType} rejected the bidding amount of ${amount}.`
          break
        default:
          return
      }
      const targetUserType = await checkUsertype(targetUserId)
      return sendNotification({
        content: message,
        title: Enum.SOCKET.BIDDING,
        userId: targetUserId,
        userRole: targetUserType
      })
    })
  await Promise.all(tasks)
}

const checkjoinedUsers = async (BiddingRequest, tripId) => {
  const roomName = `${Enum.SOCKET.BIDDING}_${tripId}`
  const socketsInRoom = await BiddingRequest.in(roomName).fetchSockets()
  const userIds = []

  for (const socket of socketsInRoom) {
    const userId = socket?.authInfo?.userId
    if (userId) userIds.push(userId)
  }
  return userIds
}

BiddingRequest.on('connection', async (socket) => {
  try {
    socket.on('connectBiddingRequest', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        let { tripId = null, amount = 0, userId } = data
        if (!userId || !tripId) throw new Error('UNPROCESSABLE_REQUEST')
        tripId = mongoose.Types.ObjectId(tripId)
        userId = mongoose.Types.ObjectId(userId)
        const tripData = await checkTripdata(tripId)
        const role = await checkUsertype(userId)
        if (!tripData) throw new Error('NOT_ALLOWED')
        const conChannel = `${Enum.SOCKET.BIDDING}_${tripId}`
        socket.join(conChannel)
        await RedisDB.__addChatUser({ userId, role, socketId: socket.id })
        const createBidding = await BiddingController.create(userId, role, tripData, Number(amount))
        if (createBidding.success == false) throw new Error(createBidding.message)
        response.data = {
          conChannel: conChannel,
          tripId: tripId,
          user: userId,
          BiddindData: createBidding.data
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

    socket.on('update', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        let { tripId = null, userId } = data
        if (!tripId || !userId) throw new Error('UNPROCESSABLE_REQUEST')
        tripId = mongoose.Types.ObjectId(tripId)
        userId = mongoose.Types.ObjectId(userId)
        const tripData = await checkTripdata(tripId)
        const role = await checkUsertype(userId)
        if (!tripData) throw new Error('NOT_ALLOWED')
        const updatebidding = await BiddingController.update(userId, role, data, tripData)
        if (updatebidding.success == false) throw new Error(updatebidding.message)
        socket.to(`${Enum.SOCKET.BIDDING}_${tripId}`).emit('messageBroadcast', {
          data: {
            messages: updatebidding,
            tripId: tripId
          }
        })
        const checkUser = await checkjoinedUsers(BiddingRequest, tripId)
        await triggerNotification(checkUser, 'Update', userId, role, data.amount)
        response.data = {
          messages: updatebidding,
          tripId: tripId
        }
        response.message = 'BIDDING_UPDATED'
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

    socket.on('accept', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        let { tripId = null, messageId = null, userId } = data
        if (!tripId || !userId) throw new Error('UNPROCESSABLE_REQUEST')
        tripId = mongoose.Types.ObjectId(tripId)
        userId = mongoose.Types.ObjectId(userId)
        const tripData = await checkTripdata(tripId)
        const role = await checkUsertype(userId)
        if (!tripData) throw new Error('NOT_ALLOWED')
        let BiddingStatus = Enum.BIDDING.BIDDINGSTATUS.OPEN
        if (role == Enum.ROLES.PARTNER) {
          await Trips.updateOne({ _id: tripId }, { $set: { Bidding: true } })
          BiddingStatus = Enum.BIDDING.BIDDINGSTATUS.CLOSE
        }
        const updatebidding = await BiddingController.updateAmtinESTfare(
          tripData,
          BiddingStatus,
          Enum.BIDDING.BIDDINGTRANSACTIONSTATUS.ACCEPTED,
          messageId
        )
        if (updatebidding.success == false) throw new Error(updatebidding.message)
        socket.to(`${Enum.SOCKET.BIDDING}_${tripId}`).emit('messageBroadcast', {
          data: {
            messages: updatebidding,
            tripId: tripId
          }
        })
        const checkUser = await checkjoinedUsers(BiddingRequest, tripId)
        await triggerNotification(checkUser, 'Accepted', userId, role, data.amount)
        response.data = {
          messages: updatebidding,
          tripId: tripId
        }
        response.message = 'BIDDING_ACCEPTED'
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
    socket.on('reject', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        let { tripId = null, messageId = null, userId } = data
        if (!tripId || !userId) throw new Error('UNPROCESSABLE_REQUEST')
        tripId = mongoose.Types.ObjectId(tripId)
        userId = mongoose.Types.ObjectId(userId)
        const tripData = await checkTripdata(tripId)
        const updatebidding = await BiddingController.updateAmtinESTfare(
          tripData,
          Enum.BIDDING.BIDDINGSTATUS.OPEN,
          Enum.BIDDING.BIDDINGTRANSACTIONSTATUS.REJECTED,
          messageId
        )
        if (updatebidding.success == false) throw new Error(updatebidding.message)
        socket.to(`${Enum.SOCKET.BIDDING}_${tripId}`).emit('messageBroadcast', {
          data: {
            messages: updatebidding,
            tripId: tripId
          }
        })
        const checkUser = await checkjoinedUsers(BiddingRequest, tripId)
        const role = await checkUsertype(userId)
        await triggerNotification(checkUser, 'Rejected', userId, role, data.amount)
        response.data = {
          messages: updatebidding,
          tripId: tripId
        }
        response.message = 'BIDDING_REJECTED'
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

export { BiddingRequest }
