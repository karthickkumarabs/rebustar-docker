/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../BaseController.js'

import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'

import { CreteriaService } from '../../services/Creteria/CreteriaServices.js'
import { ServiceAreaValidator } from '../../validators/Creteria/ServiceAreaValidator.js'

import mongoose from 'mongoose'
import ServiceArea from '../../models/Creteria/ServiceArea.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ServiceAreaController extends BaseController {
  constructor() {
    super()
  }

  static listServiceArea = async (req, res) => {
    try {
      const validation = await ServiceAreaValidator.validateData(req.query, 'getServiceArea')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const paramData = req.params
      const queryObj = {}

      if (paramData.serviceAreaId) {
        queryObj._id = mongoose.Types.ObjectId(paramData.serviceAreaId)
      }

      const selectObj = {
        _id: 1,
        name: 1
      }

      const getData = await ServiceArea.find(queryObj, selectObj).lean().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_SERVICE_AREA'
      )({ message: 'LISTED|SERVICE_AREA', serviceArea: getData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getServiceArea = async (req, res) => {
    try {
      const validation = await ServiceAreaValidator.validateData(req.query, 'getServiceArea')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      // const queryObj = {}
      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(ServiceArea, queryData)
      queryObject = queryBuilder.queryObject

      console.log(queryObject, 'queryObject')
      if (paramData.serviceAreaId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.serviceAreaId)
      }

      const getDataCount = await ServiceArea.find(queryObject).count()
      const getData = await ServiceArea.find(queryObject).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_SERVICE_AREA'
      )({ message: 'SUCCESS', serviceZone: getData, total: getDataCount })
    } catch (error) {
      console.log(error, 'error')
      return requestHandler.sendError(req, res, error)
    }
  }

  static createServiceArea = async (req, res) => {
    try {
      const body = req.body
      const validation = await ServiceAreaValidator.validateData(body, 'createServiceArea')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const exists = await ServiceArea.findOne({
        $or: [{ name: body.name }, { 'polygon.coordinates': body.polygon }]
      }).lean()

      exists?.name === body.name
        ? (() => {
            throw new Error('SERVICE AREA NAME ALREADY EXISTS')
          })()
        : exists?.polygon?.coordinates?.toString() === body.polygon?.toString()
        ? (() => {
            throw new Error('SERVICE AREA POLYGON ALREADY EXISTS')
          })()
        : null

      const newDoc = new ServiceArea({
        name: body.name,
        centerPoint: [body.longitude || 0, body.latitude || 0],
        polygon: {
          type: 'Polygon',
          coordinates: body.polygon || []
        },

        cityId: body.cityId,
        stateId: body.stateId,
        countryId: body.countryId,

        customerPrefix: body.customerPrefix,
        partnerPrefix: body.partnerPrefix,
        tripPrefix: body.tripPrefix,

        status: body.status
      })
      const serviceType = await newDoc.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_SERVICE_AREA'
      )({ message: 'CREATED|SERVICE_AREA', serviceZone: serviceType })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateServiceArea = async (req, res) => {
    try {
      const body = req.body
      const serviceAreaId = req.params.serviceAreaId
      body.serviceAreaId = serviceAreaId
      body.exceptId = serviceAreaId

      const validation = await ServiceAreaValidator.validateData(body, 'updateServiceArea')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      // const exists = await CreteriaService.getServiceArea(body)
      // if (exists && exists.status) throw new Error('EXISTS')

      const serviceArea = await ServiceArea.findOne({ _id: mongoose.Types.ObjectId(serviceAreaId) }).exec()
      serviceArea.name = body.name || serviceArea.name
      serviceArea.centerPoint = [
        body.longitude || serviceArea.centerPoint[0],
        body.latitude || serviceArea.centerPoint[1]
      ]
      serviceArea.polygon = {
        type: 'Polygon',
        coordinates: body.polygon || []
      }

      serviceArea.cityId = body.cityId || serviceArea.cityId
      serviceArea.stateId = body.stateId || serviceArea.stateId
      serviceArea.countryId = body.countryId || serviceArea.countryId

      serviceArea.customerPrefix = body.customerPrefix || serviceArea.customerPrefix
      serviceArea.partnerPrefix = body.partnerPrefix || serviceArea.partnerPrefix
      serviceArea.tripPrefix = body.tripPrefix || serviceArea.tripPrefix

      serviceArea.status = body.status || serviceArea.status

      const serviceAreaUpdated = await serviceArea.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_SERVICE_AREA'
      )({ message: 'UPDATED|SERVICE_AREA', serviceArea: serviceAreaUpdated })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteServiceArea = async (req, res) => {
    try {
      const body = req.body
      const serviceAreaId = req.params.serviceAreaId || req.body.serviceAreaId
      body.serviceAreaId = serviceAreaId
      body._id = serviceAreaId

      const validation = await ServiceAreaValidator.validateData(body, 'deleteServiceArea')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await CreteriaService.getServiceArea(body)
      if (!account?.status) {
        throw new Error('NOT_EXISTS')
      }
      const serviceArea = await ServiceArea.findById(serviceAreaId).remove().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_SERVICE_AREA'
      )({ message: 'DELETED|SERVICE_AREA', serviceArea: serviceArea })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { ServiceAreaController }
