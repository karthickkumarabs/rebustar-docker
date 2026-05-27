/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { SocketIO } from './index.js'
import { Enum } from '../../utils/Enum.js'
import { RedisHelper } from '../../helpers/RedisHelper.js'

import Trip from '../../models/ServiceModule/Trip.js'
import ServiceTracker from '../../models/ServiceModule/ServiceTracker.js'

import { SocketMiddleware } from '../../middlewares/SocketMiddleware.js'

const { authorize } = SocketMiddleware
const RedisDB = new RedisHelper()
const ServiceRequest = SocketIO.of('/serviceRequest')
ServiceRequest.use(authorize)
ServiceRequest.on('connection', async (socket) => {
  try {
    async function addServiceTracker(tripDetail) {
      try {
        const serviceTracker = await ServiceTracker.findOne({ tripId: tripDetail._id }).lean().exec()
        if (!serviceTracker) {
          ServiceTracker.create({
            requestId: tripDetail._id,
            startcoords: tripDetail.startcoords,
            endcoords: tripDetail.endcoords
          })
        }
        return true
      } catch (error) {
        console.error('Add Service Tracker Error', error)
        return false
      }
    }

    async function updateServiceTracker(tripDetail, location, bearing = 0) {
      try {
        let updateData = {}
        if (tripDetail.status == Enum.TRIP.STATUS.PROGRESS)
          updateData = { $push: { 'dropPolyline.coordinates': location }, $set: { lastcoords: location } }
        else
          updateData = { $push: { 'pickupPolyline.coordinates': location }, $set: { lastcoords: location } }

        updateData['$set']['bearing'] = bearing

        ServiceTracker.findOneAndUpdate({ requestId: tripDetail._id }, updateData, { upsert: true })
          .lean()
          .exec()
        return true
      } catch (error) {
        console.error('Update Service Tracker Error', error)
      }
    }

    socket.on('connectServiceRequest', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        const { requestId } = data
        const { userId, role } = socket.authInfo
        console.log('connectServiceRequest', userId)
        const tripDetail = await Trip.findOne(
          {
            _id: mongoose.Types.ObjectId(requestId),
            $or: [{ 'customer.id': userId }, { 'partner.id': userId }]
          },
          { _id: 1, startcoords: 1, endcoords: 1 }
        )
          .lean()
          .exec()

        if (!tripDetail) throw new Error('DETAILS_MISMATCHED')

        addServiceTracker(tripDetail)
        const connectionId = `${Enum.SOCKET.SERVICE}:${requestId}`
        await RedisDB.__addServiceRequestUser({
          userId: socket.authInfo.userId,
          role: role,
          socketId: socket.id
        })
        socket.join(connectionId)

        response.data = {
          userId: socket.authInfo.userId,
          socketId: socket.id,
          connectionId: connectionId
        }
        response.message = 'CONNECTION_ESTABLISHED'
        response.status = false
        response.code = 200
      } catch (error) {
        console.error('ConnectServiceRequest Error: ', error.message)
        response.data = {}
        response.message = error.message
        response.status = false
        response.code = 503
      }
      if (typeof callback === 'function') callback(response)
    })

    socket.on('updateServiceLocation', async (data, callback) => {
      const response = {
        data: {},
        message: 'SERVICE_UNAVAILABLE',
        status: false,
        code: 503
      }
      try {
        const { requestId, latitude = 0.0, longitude = 0.0, bearing = 0 } = data

        // console.log(`updateServiceLocation [${latitude},${longitude}]`)
        const { userId, role } = socket.authInfo
        const tripDetail = await Trip.findOne(
          {
            _id: mongoose.Types.ObjectId(requestId),
            $or: [{ 'customer.id': userId }, { 'partner.id': userId }]
          },
          { _id: 1, startcoords: 1, endcoords: 1, status: 1 }
        )
          .lean()
          .exec()
        if (!tripDetail) throw new Error('DETAILS_MISMATCHED')

        updateServiceTracker(tripDetail, [longitude, latitude], bearing)
        const checkUserPresent = await RedisDB.__getServiceRequestUser({ userId, role })
        if (!checkUserPresent) throw new Error('ACTIVITY_NOT_ADDED')

        const connectionId = `${Enum.SOCKET.SERVICE}:${requestId}`
        response.data = {
          bearing: bearing,
          latitude: latitude,
          longitude: longitude
        }
        response.message = 'LOCATION_UPDATED'
        response.status = true
        response.code = 200
        socket.broadcast.to(connectionId).emit('getServiceLocation', response)
      } catch (error) {
        console.error('UpdateServiceLocation Error: ', error.message)
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

        if (userId) {
          const removeChannelUser = await RedisDB.__getServiceRequestUser({ userId })
          if (removeChannelUser) {
            await RedisDB.__deleteServiceRequestUser({ userId })
          }
        }
        console.log('Service Request Disconnected: ', userId)
        response.data = {}
        response.message = 'USER_REMOVED_FROM_REDIS'
        response.status = true
        response.code = 200
      } catch (error) {
        response.data = {}
        response.message = error.message
        response.status = false
        response.code = 503
      }
      if (typeof callback === 'function') callback(response)
    })
  } catch (error) {
    console.error('ServiceRequest Disconnect Error: ', error)
  }
})

export { ServiceRequest }
