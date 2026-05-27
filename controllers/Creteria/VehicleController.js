/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from './../BaseController.js'
import Vehicle from '../../models/Creteria/Vehicle.js'
import Partner from '../../models/Auth/Partner.js'
import ServiceType from '../../models/Creteria/ServiceType.js'
import { RequestHandler } from './../../utils/RequestHandler.js'
import { Logger } from './../../utils/Logger.js'
import { VehicleValidator } from './../../validators/Creteria/VehicleValidator.js'
import mongoose from 'mongoose'
import { Enum } from '../../utils/Enum.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'

import { ValidationError, NotFoundError } from '../../utils/ErrorHandler.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class VehicleController extends BaseController {
  constructor() {
    super()
  }

  // Get all vechicle

  static getVehicle = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params
      const perPage = parseInt(queryData.limit) || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const orCond = []

      let queryObject = {}
      console.log(queryData, 'queryData')

      const queryBuilder = await QueryBuilder.getSearchable(Vehicle, queryData)
      queryObject = queryBuilder.queryObject || queryObject
      queryObject['deletedAt'] = null

      if (paramData.vehicleId) {
        orCond.push(
          { _id: mongoose.Types.ObjectId(paramData.vehicleId) },
          { ownerId: mongoose.Types.ObjectId(paramData.vehicleId) }
        )
        queryObject['$or'] = orCond
      }
      const getDataCount = await Vehicle.find(queryObject).count()

      const makePipeline = [{ $eq: ['$$makesid', '$_id'] }]
      // if (queryData.makename) makePipeline.push({ $eq: ['$name', new RegExp(queryData.makename, 'i')] })
      if (queryData.makename)
        makePipeline.push({
          $regexMatch: {
            input: '$name',
            regex: queryData.makename,
            options: 'i'
          }
        })

      const modelPipeline = [{ $eq: ['$$modelid', '$_id'] }]
      if (queryData.modelname)
        modelPipeline.push({
          $regexMatch: {
            input: '$name',
            regex: queryData.modelname,
            options: 'i'
          }
        })

      const partnerPipeline = [{ $eq: ['$$partnerid', '$_id'] }]
      if (queryData.partnername)
        partnerPipeline.push({
          $regexMatch: {
            input: '$fname',
            regex: queryData.partnername,
            options: 'i'
          }
        })

      const pipeline = [
        { $match: queryObject },
        {
          $lookup: {
            from: 'makes',
            let: { makesid: '$makeid' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: makePipeline
                  }
                }
              }
            ],
            as: 'makeinfo'
          }
        },
        {
          $unwind: {
            path: '$makeinfo',
            preserveNullAndEmptyArrays: !queryData.makename
          }
        },
        {
          $lookup: {
            from: 'models',
            let: { modelid: '$model' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: modelPipeline
                  }
                }
              }
            ],
            as: 'modelinfo'
          }
        },
        {
          $unwind: {
            path: '$modelinfo',
            preserveNullAndEmptyArrays: !queryData.modelname
          }
        },
        {
          $lookup: {
            localField: 'servicetype',
            from: 'servicetypes',
            foreignField: '_id',
            as: 'servicetypeinfo'
          }
        },
        {
          $unwind: {
            path: '$servicetypeinfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'partners',
            let: { partnerid: '$partnerId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: partnerPipeline
                  }
                }
              }
            ],
            as: 'partnerinfo'
          }
        },
        {
          $unwind: {
            path: '$partnerinfo',
            preserveNullAndEmptyArrays: !queryData.partnername
          }
        },
        {
          $lookup: {
            from: 'companys',
            let: { ownerId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$ownerType', 'PARTNER']
                  }
                }
              }
              // {
              //   $lookup: {
              //     from: 'partners',
              //     localField: 'ownerId',
              //     foreignField: '_id',
              //     as: 'partnersdata',
              //   },
              // },
            ],
            as: 'companyinfo'
          }
        },
        {
          $unwind: {
            path: '$companyinfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            ownerId: 1,
            partnersdata: 1,
            companyinfo: 1,
            ownername: '$companyinfo.name',
            ownerType: 1,
            partnerId: 1,
            partnername: '$partnerinfo.fname',
            registrationnumber: 1,
            makeid: 1,
            makename: '$makeinfo.name',
            model: 1,
            modelname: '$modelinfo.name',
            year: 1,
            color: 1,
            servicetype: 1,
            servicetypename: '$servicetypeinfo.name',
            status: 1,
            deletedAt: 1,
            document: 1,
            events: 1,
            createdAt: 1,
            updatedAt: 1,
            __v: 1
          }
        }
      ]

      console.log('pipleine', JSON.stringify(pipeline))

      const getData = await Vehicle.aggregate(pipeline).sort({ _id: -1 }).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_VEHICLE'
      )({ message: 'SUCCESS', Vehicle: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPartnerVehicle = async (req, res) => {
    try {
      // const queryData = req.query

      // const perPage = queryData.limit || 10
      // const page = queryData.page || 1
      // const skip = perPage * page - perPage || 0
      const authData = req.auth
      const partnerId =
        authData.role == Enum.ROLES.PARTNER ? authData.userId : mongoose.Types.ObjectId(req.params.partnerId)

      const queryObj = {
        partnerId: partnerId,
        deletedAt: null
      }

      const getDataCount = await Vehicle.find(queryObj).count()

      const getData = await Vehicle.aggregate([
        { $match: queryObj },
        {
          $lookup: {
            localField: 'makeid',
            from: 'makes',
            foreignField: '_id',
            as: 'makeinfo'
          }
        },
        {
          $unwind: {
            path: '$makeinfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            localField: 'model',
            from: 'models',
            foreignField: '_id',
            as: 'modelinfo'
          }
        },
        {
          $unwind: {
            path: '$modelinfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            localField: 'servicetype',
            from: 'servicetypes',
            foreignField: '_id',
            as: 'servicetypeinfo'
          }
        },
        {
          $unwind: {
            path: '$servicetypeinfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            localField: 'partnerId',
            from: 'partners',
            foreignField: '_id',
            as: 'partnerinfo'
          }
        },
        {
          $unwind: {
            path: '$partnerinfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            ownerId: 1,
            ownerType: 1,
            partnerId: 1,
            partnername: '$partnerinfo.fname',
            registrationnumber: 1,
            makeid: 1,
            makename: '$makeinfo.name',
            model: 1,
            modelname: '$modelinfo.name',
            year: 1,
            color: 1,
            servicetype: 1,
            servicetypename: '$servicetypeinfo.name',
            servicetypeimage: '$servicetypeinfo.image',
            status: 1,
            deletedAt: 1,
            document: 1,
            events: 1,
            createdAt: 1,
            updatedAt: 1,
            __v: 1
          }
        }
      ])
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PARTNER_VEHICLE'
      )({ message: 'LISTED|PARTNER_VEHICLE', Vehicle: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createVehicle = async (req, res) => {
    try {
      const body = req.body
      const auth = req.auth
      const validation = await VehicleValidator.validateData(body, 'createVehicle')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      console.log('body.registrationnumber', body.registrationnumber)
      const checkData = await Vehicle.findOne({
        registrationnumber: body.registrationnumber,
        deletedAt: null
      })
        .lean()
        .exec()
      console.log('checkData', checkData)
      if (checkData) return requestHandler.sendError(req, res, 'VEHICLE_ALREADY_EXISTS')

      let ownerId = null
      let ownerType = null
      let partnerId = null

      if (auth.role == Enum.ROLES.ADMIN) {
        ownerId = body.ownerId
        ownerType = body.ownerType
        partnerId = body.partnerId
      } else {
        ownerId = auth.userId
        ownerType = auth.role
        partnerId = auth.userId
      }

      // Restrict adding more than one vehicle
      const checkVehicle = await Vehicle.findOne({ partnerId: partnerId, deletedAt: null }).lean().exec()
      console.log('checkVehicle', checkVehicle)
      if (checkVehicle) return requestHandler.sendError(req, res, 'CANT_ADD_MORE_THAN_ONE_VEHICLE')

      const newDoc = new Vehicle({
        ownerId: ownerId,
        ownerType: ownerType,
        partnerId: partnerId,
        registrationnumber: body.registrationnumber,
        makeid: mongoose.Types.ObjectId(body.makeid),
        model: mongoose.Types.ObjectId(body.model),
        year: body.year,
        color: body.color,
        servicetype: mongoose.Types.ObjectId(body.servicetype)
      })

      const createVehicle = await newDoc.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_VEHICLE'
      )({ message: 'CREATED|VEHICLE', Vehicle: createVehicle })
    } catch (error) {
      console.log('Error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateVehicle = async (req, res) => {
    try {
      const body = req.body
      const auth = req.auth
      const validation = await VehicleValidator.validateData(body, 'updateVehicle')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const vehicleId = req.params.vehicleId

      const checkData = await Vehicle.findOne({
        _id: { $ne: mongoose.Types.ObjectId(vehicleId) },
        registrationnumber: body.registrationnumber,
        deletedAt: null
      })
        .lean()
        .exec()
      if (checkData) return requestHandler.sendError(req, res, 'VEHICLE_ALREADY_EXISTS')

      const vechicleData = await Vehicle.findOne({ _id: mongoose.Types.ObjectId(vehicleId) })
      if (!vechicleData) return requestHandler.sendError(req, res, 'NOT_FOUND|VEHICLE')

      let ownerId
      let ownerType
      if (auth.role == Enum.ROLES.ADMIN || auth.role == Enum.ROLES.PARTNER) {
        ownerId = body.ownerId
        ownerType = body.ownerType
      } else {
        ownerId = req.auth.ownerId
        ownerType = req.auth.role
      }

      // to check user already have vehicle
      const partnerId = vechicleData.partnerId

      const existingVehicle = await Vehicle.findOne({
        _id: { $ne: mongoose.Types.ObjectId(vehicleId) },
        partnerId: partnerId
      })
        .lean()
        .exec()
      if (existingVehicle) throw new ValidationError('USER_ALREADY_HAS_VEHICLE')

      vechicleData.ownerId = ownerId || vechicleData.ownerId
      vechicleData.ownerType = ownerType || vechicleData.ownerType

      vechicleData.partnerId = body.partnerId || vechicleData.partnerId
      vechicleData.registrationnumber = body.registrationnumber || vechicleData.registrationnumber
      vechicleData.makeid = body.makeid || vechicleData.makeid
      vechicleData.model = body.model || vechicleData.model
      vechicleData.year = body.year || vechicleData.year
      vechicleData.color = body.color || vechicleData.color

      // In future we have to work
      // if (auth.role == Enum.ROLES.ADMIN)
      console.log(
        mongoose.Types.ObjectId(body.servicetype).toString(),
        vechicleData.servicetype.toString(),
        mongoose.Types.ObjectId(body.servicetype).toString() != vechicleData.servicetype.toString()
      )
      if (mongoose.Types.ObjectId(body.servicetype).toString() != vechicleData.servicetype.toString()) {
        console.log('servicetypename', body.servicetypename)
        const serviceData = await ServiceType.findOne({ _id: body.servicetype }).exec()
        if (!serviceData) throw new ValidationError('NOT_FOUND|SERVICE')
        await Partner.findOneAndUpdate(
          { _id: partnerId },
          {
            $set: {
              curService: serviceData._id
            }
          },
          {
            new: true
          }
        )
      }
      vechicleData.servicetype = body.servicetype || vechicleData.servicetype

      vechicleData.status = body.status || vechicleData.status
      vechicleData.updatedBy.userId = req.auth.userId || vechicleData.updatedBy.userId
      vechicleData.updatedBy.role = req.auth.role || vechicleData.updatedBy.role
      const vechicleDataUpdated = await vechicleData.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_VEHICLE'
      )({ message: 'UPDATED|VEHICLE', vechicleData: vechicleDataUpdated })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteVechicle = async (req, res) => {
    try {
      const vechicleData = await Vehicle.findOne({ _id: mongoose.Types.ObjectId(req.params.vehicleId) })
      if (!vechicleData) return requestHandler.sendError(req, res, 'Vehicle not found')

      vechicleData.deletedAt = new Date()
      const vechicleDataUpdated = await vechicleData.save()

      await Partner.findOne(
        {
          _id: vechicleData.partnerId,
          activeVechicle: req.params.vehicleId
        },
        { activeVechicle: null }
      )

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_VEHICLE'
      )({ message: 'DELETED|VEHICLE', vechicleData: vechicleDataUpdated })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static listAllVehicles = async (req, res) => {
    try {
      const queryData = req.query

      const queryObj = {}
      if (queryData.registrationnumber) {
        queryObj.registrationnumber = { $regex: queryData.registrationnumber, $options: 'i' }
      }
      const getDataCount = await Vehicle.find(queryObj).count()
      const getData = await Vehicle.find(queryObj).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ALL_VEHICLE'
      )({ message: 'LISTED|VEHICLE', vehicles: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static activeVehicle = async (req, res) => {
    try {
      const params = req.query
      const Auth = req.auth

      let userId = Auth.userId
      if (Auth && Auth.role == Enum.ROLES.ADMIN) userId = params.partnerId

      const vehicleId = params.vehicleId
      if (!vehicleId) throw new ValidationError('PLEASE_PASS_THE_VEHICLE_ID')

      const vehicleData = await Vehicle.findOne({ $and: [{ partnerId: userId }, { _id: vehicleId }] })
      if (!vehicleData) throw new ValidationError('NOT_FOUND|VEHICLE')

      const serviceData = await ServiceType.findOne({ _id: vehicleData.servicetype }).exec()
      if (!serviceData) throw new ValidationError('NOT_FOUND|SERVICE')

      for (const itreator of vehicleData.document) {
        if (itreator.status == 'pending' || itreator.status == 'rejected') {
          throw new ValidationError('YOUR_VEHICLE_DOCUMENT_IS_NOT_APPROVED')
        }
      }

      const updateActive = await Vehicle.findOneAndUpdate(
        { _id: vehicleId },
        {
          $set: {
            status: 'active'
          }
        },
        {
          new: true
        }
      )

      await Partner.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            activeVechicle: vehicleId,
            curService: serviceData._id
          }
        },
        {
          new: true
        }
      )
      if (updateActive.status != 'active') throw new ValidationError('VEHICLE_NOT_UPDATED')

      const otherVehicles = await Vehicle.find({ partnerId: userId, _id: { $ne: vehicleId } })
      if (updateActive.status == 'active' && otherVehicles.length > 1) {
        const updateInactive = await Vehicle.updateMany(
          { _id: { $ne: vehicleId }, partnerId: userId },
          {
            $set: {
              status: 'inactive'
            }
          }
        )
        if (updateInactive.modifiedCount == 0) {
          await Vehicle.updateOne(
            { _id: vehicleId },
            {
              $set: {
                status: 'inactive'
              }
            }
          )
          await Partner.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                activeVechicle: null
              }
            },
            {
              new: true
            }
          )
          throw new NotFoundError('VEHICLE_NOT_UPDATED')
        }
      }

      return requestHandler.sendSuccess(req, res, 'ACTIVE_VEHICLE')({ message: 'VEHICLE_SWITCHED_SUCCESS' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static vehicleStatus = async (req, res) => {
    try {
      let { status, userId = null } = req.body
      const auth = req.auth
      const vehicleId = req.params.vehicleId
      userId = auth.role === Enum.ROLES.PARTNER ? auth.userId : userId

      const vehicleData = await Vehicle.findOne({
        partnerId: userId,
        _id: vehicleId
      })
      if (!vehicleData) throw new ValidationError('NOT_FOUND|VEHICLE')
      const vehicleDocument = vehicleData.document
      if (vehicleDocument.length == 0) throw new ValidationError('Upload Document before approving')
      if (vehicleDocument.length > 0) {
        const filtered = vehicleDocument.filter(
          (doc) => doc.status === 'pending' || doc.status === 'rejected'
        )
        if (filtered.length > 0)
          throw new ValidationError('Approve vehicle document before approving vehicle')
      }

      if (status === 'active') {
        const updateActive = await Vehicle.findOneAndUpdate(
          { _id: vehicleId },
          {
            status: 'active'
          },
          {
            new: true
          }
        )

        if (!updateActive || updateActive.status !== 'active')
          throw new ValidationError('NOT_UPDATED|VEHICLE')

        const updatePartner = await Partner.findOneAndUpdate(
          { _id: userId },
          {
            activeVechicle: vehicleId,
            curService: updateActive.servicetype
          },
          {
            new: true
          }
        )

        if (!updatePartner?.activeVechicle) throw new ValidationError('NOT_UPDATED|PARTNER')

        if (updatePartner && updateActive.status === 'active') {
          await Vehicle.updateMany(
            { _id: { $ne: vehicleId }, deletedAt: null, partnerId: userId },
            {
              status: 'inactive'
            }
          )
        }
      } else {
        const updateInActive = await Vehicle.findOneAndUpdate(
          { _id: vehicleId },
          {
            status: 'inactive'
          },
          {
            new: true
          }
        )

        if (updateInActive && updateInActive.status === 'inactive') {
          const updatePartner = await Partner.findOneAndUpdate(
            { _id: userId },
            {
              activeVechicle: null,
              curService: null,
              status: 'Inactive'
            },
            {
              new: true
            }
          )

          if (!updatePartner || updatePartner.activeVechicle) throw new ValidationError('NOT_UPDATED|PARTNER')
          if (updatePartner) {
            await NotifcationController.createNotification({
              processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
              data: {
                pushToken: updatePartner.fcmId,
                title: 'InactivePartner',
                body: '',
                template: 'accountInactive',
                templateData: {}
              }
            })
          }
        }
      }

      const message = status === 'active' ? 'VEHICLE_ACTIVE' : 'VEHICLE_INACTIVE'
      return requestHandler.sendSuccess(req, res, message)({ message: 'VEHICLE_SWITCHED_SUCCESS' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { VehicleController }
