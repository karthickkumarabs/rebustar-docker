/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import moment from 'moment'
import _ from 'lodash'
import { Config } from '../../../config/AppConfig.js'
import { BaseController } from '../../../controllers/BaseController.js'

import { Logger } from '../../../utils/Logger.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { ShareRideValidator } from '../validator/ShareRideValidator.js'
import { ShareRideModuleError } from '../../../utils/ErrorHandler.js'
import { ServiceModuleController as ServiceModule } from '../../../controllers/ServiceModule/ServiceModuleController.js'
import { ShareRideModuleController as ShareRideModule } from '../ShareRideModule.js'
// import ServiceType from '../../../models/Creteria/ServiceType.js'
import { MapServices } from '../../Map/index.js'
import Partner from '../../../models/Auth/Partner.js'
import Vehicle from '../../../models/Creteria/Vehicle.js'
import ShareRidePost from '../models/ShareRidePost.js'
import ShareRide from '../models/shareRide.js'
import Customer from '../../../models/Auth/Customer.js'
import { ShareRideMatch } from './ShareRideMatchFunctions.js'
const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ShareRideController extends BaseController {
  constructor() {
    super()
  }
  static createShareRide = async (req, res) => {
    try {
      const body = req.body || {}
      const auth = req.auth || {}
      console.log(auth)
      const validation = await ShareRideValidator.validateData(body, 'createShareRideRequest')
      console.log('validation', validation)
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      let partnerId
      if (auth.role == 'ADMIN') {
        partnerId = body.id
        console.log('partnerId', partnerId)
      } else {
        partnerId = auth.userId ? auth.userId : body.id
        console.log('partnerId', partnerId)
      }
      const pickupLocation = body.pickupLat + ',' + body.pickupLng
      const pickupLocationArr = [body.pickupLng, body.pickupLat]
      const dropLocation = body.dropLat + ',' + body.dropLng
      const dropLocationArr = [body.dropLng, body.dropLat]
      // let coupon = null
      const serviceCity = await ServiceModule.checkServiceArea(pickupLocationArr)
      const partnerData = await Partner.findOne({ _id: mongoose.Types.ObjectId(partnerId) }).exec()
      if (!partnerData) throw new ShareRideModuleError('NOT_FOUND|PARTNER')
      const travelInfo = await MapServices.getLocationData([pickupLocation], [dropLocation])
      console.log('travelInfo', travelInfo)
      if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
      const unitDistance = travelInfo.data.distanceValue
      // const distanceMetric = travelInfo.data.distanceMetric || Config.app.distanceMetric
      // const timeMetric = travelInfo.data.timeMetric || Config.app.timeMetric
      const unitTime = travelInfo.data.timeValue
      const scheduleOn = body.scheduleOn && body.scheduleOn != '' ? new Date(body.scheduleOn) : new Date()
      scheduleOn.setSeconds(0)
      let getEncodePath = body.enpath ? body.enpath : ''

      if (getEncodePath == '' || getEncodePath == undefined) {
        getEncodePath = await ShareRideMatch.getEncodePathToStore(pickupLocation, dropLocation)
        // getEncodePath = await getEncodePathToStore(tripsData.dsp.start, tripsData.dsp.end)
      }

      const paramsLatLng = {
        fromlat: body.pickupLat,
        tolat: body.dropLat,
        fromlang: body.pickupLng,
        tolang: body.dropLng
      }
      const LatLngDirection = await ShareRideMatch.getLatLngDirection(paramsLatLng)
      const partnerVehicleData = await Vehicle.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(body.serviceTypeId)
          }
        },
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
          $project: {
            _id: 1,
            registrationnumber: 1,
            makeid: 1,
            makename: '$makeinfo.name',
            model: 1,
            modelname: '$modelinfo.name',
            year: 1,
            color: 1,
            servicetype: 1,
            servicetypename: '$servicetypeinfo.name',
            description: '$servicetypeinfo.description',
            image: '$servicetypeinfo.image',
            features: '$servicetypeinfo.features',
            seats: '$servicetypeinfo.seats'
          }
        }
      ])
      console.log('partnerVehicleData', partnerVehicleData)
      if (partnerVehicleData.length) {
        body.makename = partnerVehicleData[0].makename
        body.model = partnerVehicleData[0].model
        body.year = partnerVehicleData[0].year
        body.color = partnerVehicleData[0].color
        body.registrationNo = partnerVehicleData[0].registrationnumber
        body.vehicleId = partnerVehicleData[0]._id
        body.basicFeatures = partnerVehicleData[0].features
        body.description = partnerVehicleData[0].description
        body.image = partnerVehicleData[0].image
        body.noOfSeats = partnerVehicleData[0].seats
        body.servicetype = partnerVehicleData[0].servicetype
        body.servicetypename = partnerVehicleData[0].servicetypename
      }

      const shareRideData = {
        requestFrom: body.requestFrom,
        module: body.module,
        isScheduleLater: body.isScheduleLater,
        bookingType: body.bookingType,
        utc: Config.utcOffset,
        partnerId: partnerId,
        serviceAreaId: serviceCity._id,
        serviceAreaName: serviceCity.name,
        serviceType: body.servicetype,
        serviceTypeName: body.servicetypename,
        noOfSeats: body.noOfSeats,
        availableSeats: body.noOfSeats,
        perSeatRate: body.perSeatRate,
        currency: body.currency,
        start: body.pickupAddress || travelInfo.data.originLabel,
        end: body.dropAddress || travelInfo.data.destinationLabel,
        startcoords: pickupLocationArr,
        endcoords: dropLocationArr,
        scheduleOn: body.scheduleOn ? new Date(body.scheduleOn).toUTCString() : new Date(),
        timeZone: body.timeZone,
        vehicle: {
          makename: body.makename,
          model: body.model,
          year: body.year,
          registrationNo: body.registrationNo,
          color: body.color,
          vehicleId: body.vehicleId,
          basicFeatures: body.basicFeatures,
          description: body.description,
          image: body.image
        },
        distkm: unitDistance,
        estTime: unitTime,
        // latdirection: latdirection,
        // lngdirection: lngdirection,
        notes: body.notes,
        features: {
          luggageAllowed: body.luggageAllowed,
          noOfLuggages: body.noOfLuggages,
          petAllowed: body.petAllowed,
          childAllowed: body.childAllowed,
          noOfChildSeats: body.noOfChildSeats,
          smokingAllowed: body.smokingAllowed,
          handicapAllowed: body.handicapAllowed
        },
        enpath: getEncodePath,
        latdirection: LatLngDirection.latdirection,
        lngdirection: LatLngDirection.lngdirection
      }
      const responseData = await ShareRideModule.sendRequest(shareRideData)
      console.log(responseData)
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_REQUEST'
      )({
        message: 'SHARE_RIDE_POSTED',
        requestId: responseData.shareRideData._id,
        isScheduleLater: responseData.shareRideData.isScheduleLater
      })
    } catch (error) {
      console.log('CREATE_REQUEST', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static listAllShareRide = async (req, res) => {
    try {
      // const queryData = req.query
      const queryObj = {}
      queryObj['deletedAt'] = null
      const shareRideData = await ShareRidePost.find(queryObj).lean().exec()
      const getDataCount = await ShareRidePost.find(queryObj).count()
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ALL_SHARE_RIDES'
      )({ message: 'LISTED|SHARERIDE', ShareRide: shareRideData, total: getDataCount })
    } catch (err) {
      console.log('LIST_SHARE_RIDE', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateShareRide = async (req, res) => {
    const body = req.body || {}
    const auth = req.auth || {}
    const shareRideId = req.params.shareRideId
    console.log(auth)
    const validation = await ShareRideValidator.validateData(body, 'updateShareRideRequest')
    if (!validation.status) return requestHandler.sendError(req, res, validation.data)
    let partnerId
    if (auth.role == 'ADMIN') {
      partnerId = body.partnerId
      console.log('partnerId1', partnerId)
    } else {
      partnerId = auth.userId ? auth.userId : body.partnerId
      console.log('partnerId2', partnerId)
    }
    const shareRideData = await ShareRidePost.findOne({ _id: mongoose.Types.ObjectId(shareRideId) })
    if (!shareRideData) return requestHandler.sendError(req, res, 'NOT_FOUND|SHARERIDE')

    shareRideData.requestFrom = body.requestFrom ? body.requestFrom : shareRideData.requestFrom
    shareRideData.module = body.module ? body.module : shareRideData.module
    shareRideData.isScheduleLater = body.isScheduleLater
      ? body.isScheduleLater
      : shareRideData.isScheduleLater
    shareRideData.bookingType = body.bookingType ? body.bookingType : shareRideData.bookingType
    shareRideData.partnerId = body.partnerId ? body.partnerId : shareRideData.partnerId
    shareRideData.perSeatRate = body.perSeatRate ? body.perSeatRate : shareRideData.perSeatRate
    shareRideData.currency = body.currency ? body.currency : shareRideData.currency

    const partnerData = await Partner.findOne({ _id: mongoose.Types.ObjectId(partnerId) }).exec()
    if (!partnerData) throw new ShareRideModuleError('NOT_FOUND|PARTNER')
    let pickupLocation = ''
    let dropLocation = ''
    if (body.pickupLat && body.pickupLng) {
      pickupLocation = body.pickupLat + ',' + body.pickupLng
      const pickupLocationArr = [body.pickupLng, body.pickupLat]
      const serviceCity = await ServiceModule.checkServiceArea(pickupLocationArr)

      shareRideData.startcoords = pickupLocationArr ? pickupLocationArr : shareRideData.startcoords
      shareRideData.start = body.pickupAddress ? body.pickupAddress : shareRideData.start
      shareRideData.serviceAreaId = serviceCity._id ? serviceCity._id : shareRideData.serviceAreaId
      shareRideData.serviceAreaName = serviceCity.name ? serviceCity.name : shareRideData.serviceAreaName
    }
    if (body.dropLat && body.dropLng) {
      dropLocation = body.dropLat + ',' + body.dropLng
      const dropLocationArr = [body.dropLng, body.dropLat]
      shareRideData.endcoords = dropLocationArr ? dropLocationArr : shareRideData.endcoords
      shareRideData.end = body.dropAddress ? body.dropAddress : shareRideData.end
    }
    if (pickupLocation != '' && dropLocation != '') {
      const travelInfo = await MapServices.getLocationData([pickupLocation], [dropLocation])
      console.log('travelInfo', travelInfo)
      if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
      const unitDistance = travelInfo.data.distanceValue
      // const distanceMetric = travelInfo.data.distanceMetric || Config.app.distanceMetric
      // const timeMetric = travelInfo.data.timeMetric || Config.app.timeMetric
      const unitTime = travelInfo.data.timeValue
      shareRideData.distkm = unitDistance ? unitDistance : shareRideData.distkm
      shareRideData.estTime = unitTime ? unitTime : shareRideData.estTime
    }
    const scheduleOn = body.scheduleOn && body.scheduleOn != '' ? new Date(body.scheduleOn) : new Date()
    scheduleOn.setSeconds(0)
    shareRideData.scheduleOn = scheduleOn ? scheduleOn : shareRideData.scheduleOn
    shareRideData.timeZone = body.timeZone ? body.timeZone : shareRideData.timeZone

    let getEncodePath = body.enpath ? body.enpath : ''

    if (getEncodePath == '' || getEncodePath == undefined) {
      getEncodePath = await ShareRideMatch.getEncodePathToStore(pickupLocation, dropLocation)
      // getEncodePath = await getEncodePathToStore(tripsData.dsp.start, tripsData.dsp.end)
    }
    shareRideData.enpath = getEncodePath ? getEncodePath : shareRideData.enpath

    const paramsLatLng = {
      fromlat: body.pickupLat,
      tolat: body.dropLat,
      fromlang: body.pickupLng,
      tolang: body.dropLng
    }
    const LatLngDirection = await ShareRideMatch.getLatLngDirection(paramsLatLng)
    shareRideData.latdirection = LatLngDirection.latdirection
      ? LatLngDirection.latdirection
      : shareRideData.latdirection
    shareRideData.lngdirection = LatLngDirection.lngdirection
      ? LatLngDirection.lngdirection
      : shareRideData.lngdirection

    if (body.serviceTypeId) {
      const partnerVehicleData = await Vehicle.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(body.serviceTypeId)
          }
        },
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
          $project: {
            _id: 1,
            registrationnumber: 1,
            makeid: 1,
            makename: '$makeinfo.name',
            model: 1,
            modelname: '$modelinfo.name',
            year: 1,
            color: 1,
            servicetype: 1,
            servicetypename: '$servicetypeinfo.name',
            description: '$servicetypeinfo.description',
            image: '$servicetypeinfo.image',
            features: '$servicetypeinfo.features',
            seats: '$servicetypeinfo.seats'
          }
        }
      ])
      const vehicleDetail = shareRideData.vehicle
      if (partnerVehicleData.length) {
        shareRideData.vehicle = {
          makename: partnerVehicleData[0].makename ? partnerVehicleData[0].makename : vehicleDetail.makename,
          model: partnerVehicleData[0].model ? partnerVehicleData[0].model : vehicleDetail.model,
          year: partnerVehicleData[0].year ? partnerVehicleData[0].year : vehicleDetail.year,
          registrationNo: partnerVehicleData[0].registrationNo
            ? partnerVehicleData[0].registrationNo
            : vehicleDetail.registrationNo,
          color: partnerVehicleData[0].color ? partnerVehicleData[0].color : vehicleDetail.color,
          vehicleId: partnerVehicleData[0].vehicleId
            ? partnerVehicleData[0].vehicleId
            : vehicleDetail.vehicleId,
          basicFeatures: partnerVehicleData[0].basicFeatures
            ? partnerVehicleData[0].basicFeatures
            : vehicleDetail.basicFeatures,
          description: partnerVehicleData[0].description
            ? partnerVehicleData[0].description
            : vehicleDetail.description,
          image: partnerVehicleData[0].image ? partnerVehicleData[0].image : vehicleDetail.image
        }
        shareRideData.noOfSeats = partnerVehicleData[0].seats
          ? partnerVehicleData[0].seats
          : shareRideData.noOfSeats
        shareRideData.availableSeats = partnerVehicleData[0].seats
          ? partnerVehicleData[0].seats
          : shareRideData.noOfSeats
        shareRideData.serviceType = partnerVehicleData[0].servicetype
          ? partnerVehicleData[0].servicetype
          : shareRideData.serviceType
        shareRideData.serviceTypeName = partnerVehicleData[0].servicetypename
          ? partnerVehicleData[0].servicetypename
          : shareRideData.serviceTypeName
      }
    }
    const shareRidefeatures = shareRideData.features
    shareRideData.features = {
      luggageAllowed: body.luggageAllowed ? body.luggageAllowed : shareRidefeatures.luggageAllowed,
      noOfLuggages: body.noOfLuggages ? body.noOfLuggages : shareRidefeatures.noOfLuggages,
      petAllowed: body.petAllowed ? body.petAllowed : shareRidefeatures.petAllowed,
      childAllowed: body.childAllowed ? body.childAllowed : shareRidefeatures.childAllowed,
      noOfChildSeats: body.noOfChildSeats ? body.noOfChildSeats : shareRidefeatures.noOfChildSeats,
      smokingAllowed: body.smokingAllowed ? body.smokingAllowed : shareRidefeatures.smokingAllowed,
      handicapAllowed: body.handicapAllowed ? body.handicapAllowed : shareRidefeatures.handicapAllowed
    }
    const shareRideDataUpdated = await shareRideData.save()
    return requestHandler.sendSuccess(
      req,
      res,
      'UPDATE_SHARERIDE'
    )({ message: 'UPDATED|SHARERIDE', shareRideData: shareRideDataUpdated })
  }

  static deleteShareRide = async (req, res) => {
    try {
      const shareRideData = await ShareRidePost.findOne({
        _id: mongoose.Types.ObjectId(req.params.shareRideId)
      })
      if (!shareRideData) return requestHandler.sendError(req, res, 'Share Ride not found')
      shareRideData.deletedAt = new Date()
      const shareRideDataUpdated = await shareRideData.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_SHARERIDE'
      )({ message: 'DELETED|SHARERIDE', shareRideData: shareRideDataUpdated })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getMatchForShareRide = async (req, res) => {
    const body = req.body || {}
    const auth = req.auth || {}
    const validation = await ShareRideValidator.validateData(body, 'matchForShareRide')
    if (!validation.status) return requestHandler.sendError(req, res, validation.data)

    let CustomerId
    if (auth.role == 'ADMIN') {
      CustomerId = body.id
      console.log('CustomerId', CustomerId)
    } else {
      CustomerId = auth.userId ? auth.userId : body.id
      console.log('CustomerId', CustomerId)
    }
    if (body.isScheduleLater == 'true') {
      body.isScheduleLater = true
    }
    if (body.isScheduleLater == 'false') {
      body.isScheduleLater = false
    }

    const pickupLocation = body.pickupLat + ',' + body.pickupLng
    console.log('pickupLocation', pickupLocation)
    const pickupLocationArr = [body.pickupLng, body.pickupLat]
    console.log('pickupLocationArr', pickupLocationArr)
    const dropLocation = body.dropLat + ',' + body.dropLng
    console.log('dropLocation', dropLocation)
    const dropLocationArr = [body.dropLng, body.dropLat]
    console.log(dropLocationArr)
    // let coupon = null
    const serviceCity = await ServiceModule.checkServiceArea(pickupLocationArr)
    console.log(serviceCity)
    const CustomerData = await Customer.findOne({ _id: mongoose.Types.ObjectId(CustomerId) }).exec()
    if (!CustomerData) throw new ShareRideModuleError('NOT_FOUND|CUSTOMER')
    const travelInfo = await MapServices.getLocationData([pickupLocation], [dropLocation])
    console.log('travelInfo', travelInfo)
    if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
    const unitDistance = travelInfo.data.distanceValue
    // const distanceMetric = travelInfo.data.distanceMetric || Config.app.distanceMetric
    // const timeMetric = travelInfo.data.timeMetric || Config.app.timeMetric
    // const unitTime = travelInfo.data.timeValue
    const scheduleOn = body.scheduleOn && body.scheduleOn != '' ? new Date(body.scheduleOn) : new Date()
    scheduleOn.setSeconds(0)
    const requestRadius = Config.radius ? Config.radius : 5000
    const startTime = moment().subtract(1, 'hours').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
    const endTime = moment().add(1, 'hours').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
    console.log('startTime', startTime, 'endTime', endTime)
    const matchQuery = {
      module: body.module,
      noOfSeats: { $gte: Number(body.noOfSeats) },
      // 'departureDetails.startFDT': { $gte: new Date(dateTime) },
      $and: [{ scheduleOn: { $gte: new Date(startTime) } }, { scheduleOn: { $lte: new Date(endTime) } }],
      status: { $nin: ['FINISHED', 'CANCELLED', 'NORESPONSE'] },
      postStatus: { $in: ['active'] },
      isScheduleLater: body.isScheduleLater
    }
    if (body.serviceTypeId) {
      matchQuery['serviceType'] = mongoose.Types.ObjectId(body.serviceTypeId)
    }
    let getEncodePath = body.enpath ? body.enpath : ''
    if (getEncodePath == '' || getEncodePath == undefined) {
      getEncodePath = await ShareRideMatch.getEncodePathToStore(pickupLocation, dropLocation)
    }
    console.log(matchQuery)
    const paramsLatLng = {
      fromlat: body.pickupLat,
      tolat: body.dropLat,
      fromlang: body.pickupLng,
      tolang: body.dropLng
    }
    const LatLngDirection = await ShareRideMatch.getLatLngDirection(paramsLatLng)
    console.log(LatLngDirection)
    // const ShareRidePostMatch = await ShareRidePost.find({
    //   module: body.module,
    //   isScheduleLater: body.isScheduleLater,
    //   // noOfSeats: { $lte: Number(body.noOfSeats) },
    //   $and: [{ scheduleOn: { $gte: new Date(startTime) } }, { scheduleOn: { $lte: new Date(endTime) } }],
    //   status: { $nin: ['FINISHED', 'CANCELLED', 'NORESPONSE'] },
    //   postStatus: { $in: ['active'] }
    // })
    const ShareRidePostMatch = await ShareRidePost.find({
      startcoords: {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(pickupLocationArr[0]), parseFloat(pickupLocationArr[1])],
            requestRadius / 3963.2
          ]
        }
      },
      $and: [
        matchQuery,
        {
          $or: [
            {
              latdirection: body.latdirection ? body.latdirection : LatLngDirection.latdirection
            },
            {
              lngdirection: body.lngdirection ? body.lngdirection : LatLngDirection.lngdirection
            }
          ]
        }
      ]
    })
      .lean()
      .exec()
    console.log('ShareRidePostMatch', ShareRidePostMatch)
    const matchedDriversArray = []
    const shareRideDocSize = ShareRidePostMatch.length
    if (shareRideDocSize == 0) {
      // return [] /* res.json({ 'success': false, 'message': req.i18n.__('MATCH_NOT_FOUND_FIRST_POINT_ITSELF'), 'data': [] }) */
      const responseData = await ShareRideModule.RideMatch(matchedDriversArray)
      return requestHandler.sendSuccess(
        req,
        res,
        'NO_RIDE_MATCH'
      )({
        message: 'NO_RIDE_MATCH',
        RideMatchData: responseData
      })
    }
    for (let i = 0; i < shareRideDocSize; i++) {
      const paramsLatLng = {
        fromlat: pickupLocationArr[1],
        fromlng: pickupLocationArr[0],
        tolat: dropLocationArr[1],
        tolng: dropLocationArr[0],
        distkm: unitDistance,
        enpath: getEncodePath,
        config: {
          travellingPer: 25,
          nonTravellingDis: 4
        }
      }
      if (getEncodePath) {
        const matched = await ShareRideMatch.comparePoly(
          getEncodePath,
          ShareRidePostMatch[i].enpath,
          unitDistance,
          ShareRidePostMatch[i],
          paramsLatLng
        )
        console.log('matched', matched)
        if (!_.isEmpty(matched)) {
          console.log('matched', matched)
          matchedDriversArray.push(matched)
        }
      }
    }
    console.log('matchedDriversArray', matchedDriversArray)
    if (matchedDriversArray.length <= 0 || !matched) {
      const responseData = await ShareRideModule.RideMatch(matchedDriversArray)
      return requestHandler.sendSuccess(
        req,
        res,
        'RIDE_MATCH'
      )({
        message: 'NO_RIDE_MATCH',
        RideMatchData: responseData
      })
    } else {
      // const partnerIds = []
      // const matchArr = _.map(matchedDriversArray, (el) => {
      //   if (partnerIds.length == 0) partnerIds.push(el.data.partnerId)
      //   else {
      //     const filterPartnerData = _.filter(partnerIds, mongoose.Types.ObjectId(el.data.partnerId))
      //     if (filterPartnerData.length == 0) partnerIds.push(el.data.partnerId)
      //   }
      // })
      // console.log(matchArr)
      // if (partnerIds.length) {
      // partnerIds = _.uniq(partnerIds)
      // var partnerArr = _.map(partnerIds, async (el) => {
      //   try {
      //   } catch (err) {
      //     console.log(err)
      //   }
      // })
      const responseData = await ShareRideModule.RideMatch(matchedDriversArray)
      return requestHandler.sendSuccess(
        req,
        res,
        'RIDE_MATCH'
      )({
        message: 'RIDE_MATCH',
        RideMatchData: responseData
      })
      // } else {
      //   const responseData = await ShareRideModule.RideMatch(matchArr)
      //   return requestHandler.sendSuccess(
      //     req,
      //     res,
      //     'RIDE_MATCH'
      //   )({
      //     message: 'RIDE_MATCH',
      //     RideMatchData: responseData
      //   })
      // }
    }
  }

  static requestPartnerForShareRide = async (req, res) => {
    const customerId = req.userId ? req.userId : req.body.userId
    console.log(customerId)
    const body = req.body
    console.log('body', body)
    const whereQuery = {
      sharePostId: mongoose.Types.ObjectId(body.sharePostId),
      reqCustomers: {
        $elemMatch: { customerId: customerId, status: { $nin: ['Cancelled', 'declined'] } }
      }
    }
    const pickupLocationArr = [body.pickupLng, body.pickupLat]
    const dropLocationArr = [body.dropLng, body.dropLat]
    const customerDetail = await Customer.findOne({ _id: mongoose.Types.ObjectId(customerId) })
    if (!customerDetail) return res.json({ message: 'CUSTOMER_NOT_FOUND' })
    console.log('customerDetail', customerDetail)
    const updateData = {
      customerId: customerId,
      customerName: customerDetail ? customerDetail.fname : '',
      pickupLocation: body.pickupLocation,
      dropLocation: body.dropLocation,
      startCoords: pickupLocationArr,
      endCoords: dropLocationArr,
      status: 'requested',
      seats: body.seats,
      notes: body.notes ? body.notes : ''
    }
    console.log('updateData', updateData)
    const sharePostReqDetails = await ShareRide.findOne(whereQuery).lean().exec()
    if (sharePostReqDetails) {
      return res.json({ success: false, message: 'ALREADY_REQUESTED', requestDetails: sharePostReqDetails })
    } else {
      const requestDetails = await ShareRide.findOne({
        sharePostId: mongoose.Types.ObjectId(body.sharePostId)
      })
        .lean()
        .exec()
      if (requestDetails) {
        console.log('updateData1111111', updateData)
        let findCustomers
        if (requestDetails.reqCustomers.length) {
          findCustomers = _.filter(requestDetails.reqCustomers, {
            customerId: mongoose.Types.ObjectId(customerId)
          })
          if (findCustomers.length == 0) {
            // eslint-disable-next-line no-var
            const updateReqData = await ShareRide.findOneAndUpdate(
              { sharePostId: mongoose.Types.ObjectId(body.sharePostId) },
              { $push: { reqCustomers: updateData } }
            )
            return res.json({
              success: true,
              message: 'REQUESTED_SUCCESSFULLY',
              requestDetails: updateReqData
            })
          } else {
            console.log('updateData22222222', updateData)
            const updatedData = await ShareRide.findOneAndUpdate(
              {
                sharePostId: mongoose.Types.ObjectId(body.sharePostId),
                'reqCustomers._id': findCustomers[0]._id
              },
              { 'reqCustomers.$.status': 'requested' }
            )
            return res.json({ success: true, message: 'REQUESTED_SUCCESSFULLY', requestDetails: updatedData })
          }
        } else {
          console.log('updateData3333333', updateData)
          const result = await ShareRide.findOneAndUpdate(
            { sharePostId: mongoose.Types.ObjectId(body.sharePostId) },
            { $push: { reqCustomers: updateData } }
          )
          if (result) {
            return res.json({ success: true, message: 'REQUESTED_SUCCESSFULLY', requestDetails: result })
          } else {
            return res.json({ success: false, message: 'NOT_REQUESTED', requestDetails: result })
          }
        }
      } else {
        console.log('updateData444444444', updateData)
        const shareRideDetails = await ShareRidePost.findOne({ _id: body.sharePostId }).lean().exec()
        const newDoc = new ShareRide({
          partnerId: body.partnerId,
          sharePostId: body.sharePostId,
          triptype: shareRideDetails ? shareRideDetails.triptype : 'daily',
          reqCustomers: [updateData]
        })
        const result = await newDoc.save()
        if (result) {
          return res.json({ success: true, message: 'REQUESTED_SUCCESSFULLY', requestDetails: result })
        } else {
          return res.json({ success: false, message: 'NOT_REQUESTED', requestDetails: result })
        }
      }
    }
  }

  static listRequestedCustomer = async (req, res) => {
    const shareId = req.params.id
    console.log(shareId)
    const partnerId = req.userId ? req.userId : req.body.partnerId
    console.log(partnerId)
    const likeQuery = { partnerId: mongoose.Types.ObjectId(partnerId), status: { $in: ['processing'] } }
    if (shareId) likeQuery['sharePostId'] = shareId
    if (req.body.triptype) likeQuery['triptype'] = req.triptype
    console.log(likeQuery)
    const shareRideReqDetail = await ShareRide.find(likeQuery).lean().exec()
    if (shareRideReqDetail.length == 0) {
      return res.json({ success: false, message: 'NO_REQUEST_FOUND', data: [] })
    }
    const customersList = []
    const requestedData = await Promise.all(
      _.map(shareRideReqDetail, async (elem) => {
        if (elem.reqCustomers.length) {
          const data = await Promise.all(
            _.map(elem.reqCustomers, async (el) => {
              if (el.status == 'requested') {
                const customerDetail = await Customer.findOne({ _id: el.customerId })
                if (customerDetail) {
                  const details = {
                    customerReqId: el._id,
                    customerReqSeats: el.seats,
                    customerReqStatus: el.status,
                    customerPickupLocation: el.pickupLocation,
                    customerDropLocation: el.dropLocation,
                    customerStartCoords: el.startCoords,
                    customerEndCoords: el.endCoords,
                    customerId: customerDetail._id,
                    customerName: customerDetail.fname,
                    customerEmail: customerDetail.email,
                    customerPhnCode: customerDetail.phoneCode,
                    customerPhnNo: customerDetail.phone,
                    customerProfileImg: customerDetail.profile
                      ? Config.baseurl + customerDetail.profile
                      : Config.baseurl + 'public/file-default.png'
                  }
                  if (details != undefined || typeof details != 'undefined') {
                    console.log('details')
                    customersList.push(details)
                  }
                  return customersList
                }
              }
            })
          )
          return data
        }
      })
    )
    console.log('requestedData', requestedData)
    return res.json({
      success: true,
      message: 'REQUESTED_LIST',
      requestedCustomersList: customersList
    })
  }

  static acceptRideRequest = async (req, res) => {
    const shareRideDetails = await ShareRide.findOne({ _id: req.body.shareRideId }).lean().exec()
    const partnerId = shareRideDetails ? shareRideDetails.partnerId : null
    const isPartnerCurrentlyFreeToTakeNew = await isPartnerCurrentlyFree(partnerId)
    if (!isPartnerCurrentlyFreeToTakeNew)
      return res.json({ success: true, message: 'YOU_HAVE_ONE_TRIP_IN_PROGRESS', data: {} })
    const shareRideReqDetails = await ShareRide.findOne({
      sharePostId: req.body.sharePostId,
      status: { $in: ['processing'] }
    })
      .lean()
      .exec()
    if (!shareRideReqDetails) return res.json({ success: false, message: 'NO_REQUEST_FOUND', data: {} })
    else {
      const shareCustomersList = await ShareRide.findOne({
        sharePostId: req.body.sharePostId,
        reqCustomers: {
          $elemMatch: {
            customerId: req.body.customerId,
            tripStatus: { $nin: ['Cancelled', 'Finished', 'requested'] }
          }
        }
      })
      if (shareCustomersList) return res.json({ success: true, message: 'RIDER_ALREADY_IN_TRIP', data: {} })

      const tripsData = await Trips.findOne({
        customerId: req.body.customerId,
        status: { $in: ['accepted', 'Progress'] }
      })
      if (tripsData) return res.json({ success: true, message: 'RIDER_ALREADY_IN_TRIP', data: {} })
      else {
        const filterData = { customerId: mongoose.Types.ObjectId(req.body.customerId), status: 'requested' }
        const filterRiderListing = _.filter(shareCustomersList.reqCustomers, filterData)
        if (filterRiderListing.length == 0)
          return res.status(409).json({ success: true, message: 'REQUEST_ALREADY_PROCCESSED' })
        else {
        }
      }
    }
  }

  static isPartnerCurrentlyFree = async (partnerId) => {
    const partnerData = await Partner.findOne({ _id: partnerId, curStatus: 'free' }).lean().exec()
    if (partnerData) {
      if (partnerData.inShareTrip) {
        const ShareRidePostData = await ShareRidePost.findOne({
          partnerId: partnerId,
          _id: { $ne: partnerData.curShareTripId },
          status: { $in: ['accepted', 'Progress'] }
        })
          .lean()
          .exec()
        if (ShareRidePostData) return false
        else return true
      } else return true
    } else return false
  }
}
export { ShareRideController }
