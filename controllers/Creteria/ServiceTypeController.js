/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../BaseController.js'

import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'
import { CreteriaService } from '../../services/Creteria/CreteriaServices.js'
import { ServiceTypeValidator } from '../../validators/Creteria/ServiceTypeValidator.js'

import mongoose from 'mongoose'
import ServiceType from '../../models/Creteria/ServiceType.js'

import { ValidationError } from '../../utils/ErrorHandler.js'
const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ServiceTypeController extends BaseController {
  constructor() {
    super()
  }

  static getServicesType = async (req, res) => {
    try {
      const validation = await ServiceTypeValidator.validateData(req.query, 'getServicesType')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      // const queryObj = {}
      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(ServiceType, queryData)
      queryObject = queryBuilder.queryObject
      console.log(queryObject, 'queryObject')
      if (paramData.serviceTypeId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.serviceTypeId)
      }

      const getDataCount = await ServiceType.find(queryObject).count()
      const getData = await ServiceType.find(queryObject).skip(skip).limit(perPage)

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_SERVICE_TYPE'
      )({ message: 'SUCCESS', admin: getData, total: getDataCount })
    } catch (error) {
      console.log(error, 'error')
      return requestHandler.sendError(req, res, error)
    }
  }

  static createServicesType = async (req, res) => {
    try {
      const body = req.body

      const validation = await ServiceTypeValidator.validateData(body, 'createServicesType')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await CreteriaService.getServicesType(body)
      if (account?.status) throw new ValidationError('EXISTS')
      const newDoc = new ServiceType({
        name: body.name,
        description: body.description,
        types: body.types && body.types != '' ? body.types.split(',') : [],

        order: body.order,
        gender: body.gender,
        features: body.features && body.features != '' ? body.features.split(',') : [],
        seats: body.seats,
        weight: body.weight,

        status: body.status,
        scheduleLater: body.scheduleLater,
        lowerServicesType:
          body.lowerServicesType && body.lowerServicesType != '' ? body.lowerServicesType.split(',') : []
      })
      if (req.files?.['file1']) newDoc.image = req.files['file1'][0]?.path
      if (req.files?.['file2']) newDoc.topViewImage = req.files['file2'][0]?.path

      const serviceType = await newDoc.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_SERVICE_TYPE'
      )({ message: 'CREATED|SERVICE_TYPE', serviceType: serviceType })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateServicesType = async (req, res) => {
    try {
      const body = req.body
      const serviceTypeId = req.params.serviceTypeId
      body.exceptId = serviceTypeId
      const validation = await ServiceTypeValidator.validateData(body, 'createServicesType')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      // const account = await CreteriaService.getServicesType(body)

      // if (account?.status) throw new Error('EXISTS')
      const serviceType = await ServiceType.findOne({ _id: mongoose.Types.ObjectId(serviceTypeId) })

      serviceType.name = body.name || serviceType.name
      serviceType.description = body.description || serviceType.description
      serviceType.types = body.types && body.types != '' ? body.types.split(',') : serviceType.types
      serviceType.order = body.order || serviceType.order
      serviceType.gender = body.gender || serviceType.gender
      serviceType.features =
        body.features && body.features != '' ? body.features.split(',') : serviceType.features
      serviceType.seats = body.seats || serviceType.seats
      serviceType.weight = body.weight || serviceType.weight
      serviceType.status = body.status || serviceType.status
      serviceType.scheduleLater = body.scheduleLater || serviceType.scheduleLater
      serviceType.lowerServicesType =
        body.lowerServicesType && body.lowerServicesType != ''
          ? body.lowerServicesType.split(',')
          : serviceType.lowerServicesType
      // if (req.file) serviceType.image = req.file.path || serviceType.image
      if (req.files?.['file1']) serviceType.image = req.files['file1'][0]?.path || serviceType.image
      if (req.files?.['file2'])
        serviceType.topViewImage = req.files['file2'][0].path || serviceType.topViewImage
      const serviceTypeUpdated = await serviceType.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_SERVICE_TYPE'
      )({ message: 'UPDATED|SERVICE_TYPE', serviceType: serviceTypeUpdated })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteServicesType = async (req, res) => {
    try {
      const body = req.body
      const serviceTypeId = req.params.serviceTypeId || req.body.serviceTypeId
      body.serviceTypeId = serviceTypeId
      body._id = serviceTypeId

      const validation = await ServiceTypeValidator.validateData(body, 'createServicesType')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await CreteriaService.getServicesType(body)
      if (!account && !account.status) throw new ValidationError('EXISTS')

      const serviceType = await ServiceType.findById(serviceTypeId).remove().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_SERVICE_TYPE'
      )({ message: 'DELETED|SERVICE_TYPE', serviceType: serviceType })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static listAllServiceType = async (req, res) => {
    try {
      const validation = await ServiceTypeValidator.validateData(req.query, 'getServicesType')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryData = req.query

      const queryObj = {}
      if (queryData.name) {
        queryObj.name = { $regex: queryData.name, $options: 'i' }
      }
      const getDataCount = await ServiceType.find(queryObj).count()
      const getData = await ServiceType.find(queryObj).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ALL_SERVICE_TYPE'
      )({ message: 'LISTED|SERVICE_TYPE', ServiceType: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { ServiceTypeController }
