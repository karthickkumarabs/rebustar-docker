/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { SosValidator } from './SosValidator.js'
import SOS from './SosModel.js'
import { BaseController } from '../../../controllers/BaseController.js'
import { QueryBuilder } from '../../../helpers/QueryBuilder.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import { ServiceModuleError } from '../../../utils/ErrorHandler.js'
import { ServiceConfig } from '../../../config/ServiceConfig.js'
import { NotifcationController } from '../../../controllers/Notification/Index.js'
import Partner from '../../../models/Auth/Partner.js'
import { Enum } from '../../../utils/Enum.js'
import { Config } from '../../../config/AppConfig.js'
import SosModel from './SosModel.js'
import mongoose from 'mongoose'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class SosController extends BaseController {
  constructor() {
    super()
  }

  static getSosContent = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params
      const perPage = parseInt(queryData.limit) || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0
      // console.log(queryData, 'queryData')

      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(SOS, queryData)
      queryObject = queryBuilder.queryObject || queryObject
      queryObject['deletedAt'] = null

      if (paramData.id) {
        queryObject._id = new mongoose.Types.ObjectId(paramData.id)
      }

      const pipeline = [
        { $match: queryObject },
        {
          $facet: {
            data: [{ $sort: { displayOrder: 1 } }, { $skip: skip }, { $limit: perPage }],
            count: [
              {
                $count: 'totalCount'
              }
            ]
          }
        }
      ]
      const getData = await SOS.aggregate(pipeline)
      console.log('RESULT', JSON.stringify(getData))
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_SOS_CONTENT'
      )({ message: 'SUCCESS', data: getData[0].data, total: getData[0].count[0]?.totalCount || 0 })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addSosContent = async (req, res) => {
    try {
      const body = req.body
      const validation = await SosValidator.validateData(body, 'addData')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existSosData = await SOS.findOne({
        title: body.title,
        deletedAt: null
      })

      if (existSosData) {
        throw new ServiceModuleError('SOS_CONTENT_ALREADY_EXIST')
      }

      const document = new SOS({
        ...body,
        image: req.file?.path ?? ''
      })

      await document.save()

      return requestHandler.sendSuccess(req, res, 'SOS_CONTENT_ADDED')({ message: 'SUCCESS', data: document })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateSosContent = async (req, res) => {
    try {
      const body = req.body
      const validation = await SosValidator.validateData(body, 'updateData')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      // to avoid duplicate document creation in the document
      const data = await SOS.findOne({
        _id: { $ne: body._id },
        title: body.title,
        deletedAt: null
      })

      if (data) throw new ServiceModuleError('SOS_EXISTS_WITH_SAME_CREDENTIAL')

      const existSosData = await SOS.findOne({
        _id: body._id,
        deletedAt: null
      })

      if (!existSosData) {
        throw new ServiceModuleError('SOSDATA_NOT_FOUND')
      }

      existSosData.title = body.title || existSosData.title
      existSosData.subTitle = body.subTitle || existSosData.subTitle
      existSosData.status = body.status || existSosData.status
      existSosData.image = req.file?.path || existSosData.image
      existSosData.displayOrder = body.displayOrder || existSosData.displayOrder
      await existSosData.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'SOS_CONTENT_UPDATED'
      )({ message: 'SUCCESS', data: existSosData })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteSosContent = async (req, res) => {
    try {
      const id = req.params.id
      const sosContent = await SOS.findOneAndUpdate(
        {
          _id: id
        },
        { deletedAt: new Date() }
      )

      if (!sosContent) {
        throw new ServiceModuleError('SOMETHING_WENT_WRONG')
      }

      return requestHandler.sendSuccess(req, res, 'SOS_CONTENT_DELETED')({ message: 'DELETED' })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static sendAlert = async (req, res) => {
    try {
      const requestRadius = ServiceConfig.basics.requestRadius
      const requestLimit = ServiceConfig.basics.requestLimit
      const body = req.body
      const findQuery = []
      const authData = req.auth || {}
      const partnerId =
        authData.role == Enum.ROLES.PARTNER ? authData.userId : null /* "68651ec6178d677d62731055"*/

      const adminData = await Admin.findOne({})
      const adminFCMId = adminData?.fcmId ?? null

      const partnerData = await Partner.findById(partnerId)
      if (!partnerData) throw new ServiceModuleError('PARTNER_NOT_FOUND')
      const sosData = await SosModel.findById(body.issueId)
      if (!sosData) throw new ServiceModuleError('SOS_DATA_NOT_FOUND')

      findQuery.push({
        $geoNear: {
          near: {
            type: 'Point',
            key: 'location',
            coordinates: [parseFloat(body.longitude), parseFloat(body.latitude)]
          },
          maxDistance: requestRadius,
          spherical: true,
          distanceField: 'distance'
        }
      })

      findQuery.push(
        {
          $match: {
            status: 'Active',
            online: true,
            curStatus: 'free'
          }
        },
        {
          $project: {
            _id: 1,
            fcmId: 1
          }
        }
      )
      const availablePartners = await Partner.aggregate(findQuery).limit(requestLimit).exec()
      const fcmIds = availablePartners.map((item) => item.fcmId)
      await NotifcationController.createNotification({
        processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
        data: {
          pushToken: fcmIds,
          title: 'Emergency',
          body: '',
          template: 'sosAlert',
          templateData: {
            driverName: partnerData.fname
          },
          additionalInfo: {
            title: sosData.title,
            description: sosData.subTitle,
            latitude: body.latitude,
            longitude: body.longitude,
            url: Config.app.shareTrip + body.tripId.toString()
          }
        }
      })

      if (adminFCMId)
        await NotifcationController.createNotification({
          processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
          data: {
            pushToken: adminFCMId,
            title: 'Emergency',
            body: '',
            template: 'sosAlert',
            templateData: {
              driverName: partnerData.fname
            },
            additionalInfo: {
              title: sosData.title,
              description: sosData.subTitle,
              latitude: body.latitude,
              longitude: body.longitude,
              url: Config.app.shareTrip + body.tripId.toString()
            }
          }
        })

      return requestHandler.sendSuccess(req, res, 'SUCCESS')({ message: 'SUCCESS' })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { SosController }
