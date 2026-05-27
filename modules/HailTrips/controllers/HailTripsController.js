/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import { Logger } from '../../../utils/Logger.js'
import mongoose from 'mongoose'
import moment from 'moment'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import ServiceArea from '../../../models/Creteria/ServiceArea.js'
import ServiceType from '../../../models/Creteria/ServiceType.js'
import { BaseController } from '../../../controllers/BaseController.js'
import Pricing from '../../../models/Creteria/Pricing.js'
import { Enum } from '../../../utils/Enum.js'
import Vehicle from '../../../models/Creteria/Vehicle.js'
import { TripValidator } from '../../../validators/serviceModule/TripValidator.js'
import { AuthServices } from '../../../services/Common/AuthService.js'
import Partner from '../../../models/Auth/Partner.js'
import Customer from '../../../models/Auth/Customer.js'
import Trip from '../../../models/ServiceModule/Trip.js'
import Company from '../../../models/Auth/Company.js'
import { ServiceModuleController as ServiceModule } from '../../../controllers/ServiceModule/ServiceModuleController.js'
import { HailTripConfig } from '../config.js'
import path from 'path'
import fs from 'fs'
import ServiceTracker from '../../../models/ServiceModule/ServiceTracker.js'

import { MapServices } from '../../../modules/Map/index.js'

import { Helpers } from './../../../helpers/Function.js'

import { CreteriaService } from '../../../services/Creteria/CreteriaServices.js'
import { Config } from '../../../config/AppConfig.js'
import { ServiceModuleError, ValidationError } from '../../../utils/ErrorHandler.js'
import { SettingsConfig } from '../../../config/SettingsConfig.js'
import { SubscriptionConfig } from '../../Subscription/config.js'
import PurchasePackage from '../../Subscription/models/PurchasePackage.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class HailTripsModuleController extends BaseController {
  constructor() {
    super()
  }

  static updateConfig = async (req, res) => {
    try {
      const configObj = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/HailTrips/config.js`

      const fileContent = `/* ************************
 * Copyright 2025
 * ABSERVETECH
 ************************ */

const HailTripConfig = ${JSON.stringify(configObj, null, 2)}

export { HailTripConfig }
`

      await fs.writeFileSync(filePath, fileContent)
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({
        message: 'UPDATED',
        HailTripData: configObj
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getConfig = async (req, res) => {
    try {
      const config = HailTripConfig
      return requestHandler.sendSuccess(req, res, 'GET_CONFIG')({ message: 'SUCCESS', data: config })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static createHailRideRequest = async (req, res) => {
    try {
      const hailTripSetting = SettingsConfig.menulist.find((item) => item.menu === 'HAILTRIP_SETTINGS')

      // check if enabled
      if (!hailTripSetting || !hailTripSetting.enabled) {
        return requestHandler.sendError(req, res, {
          message: 'HAIL_TRIP_DISABLED',
          code: 403
        })
      }
      const body = req.body || {}
      console.log('createHailRideRequest body', body)
      const auth = req.auth || {}

      const validation = await TripValidator.validateData(body, 'createRequest')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      let partnerId = auth.userId
      if (auth.role == Enum.ROLES.ADMIN) partnerId = body.partnerId

      const partnerDoc = await Partner.findById(partnerId).exec()
      if (!partnerDoc) throw new ServiceModuleError('NOT_FOUND|PARTNER')
      if (partnerDoc.status != 'Active')
        throw new ServiceModuleError('Partner Inactive. Please contact admin for approval')

      const query = []
      body.email ? query.push({ email: body.email.trim().toLowerCase() }) : null
      body.phone ? query.push({ phone: body.phone, phoneCode: body.phoneCode }) : null
      const module = await AuthServices.uniCodeGenerator('Customer')
      if (!module.status) throw new ValidationError('MODULE_CODE_NOT_GENERATED')
      let customerDoc = await Customer.findOne({ $or: query })
      if (!customerDoc) {
        customerDoc = await Customer.create({
          uniCode: module.data.code,
          fname: body.fname || '',
          lname: body.lname || '',
          email: body.email ? body.email.trim().toLowerCase() : '',
          phone: body.phone,
          phoneCode: body.phoneCode,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      const customerId = customerDoc?._id
      const pickupLocationArr = [body.pickupLng, body.pickupLat]
      const dropLocationArr = [body.dropLng, body.dropLat]

      const serviceCity = await ServiceModule.checkServiceArea(pickupLocationArr)

      //  Aggregate vehicle with service type, make, and model
      const vehicleAgg = await Vehicle.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(body.vehicleId) } },
        {
          $lookup: {
            from: 'servicetypes',
            localField: 'servicetype',
            foreignField: '_id',
            as: 'serviceType'
          }
        },
        { $unwind: '$serviceType' },
        {
          $lookup: {
            from: 'makes',
            localField: 'makeid',
            foreignField: '_id',
            as: 'make'
          }
        },
        { $unwind: { path: '$make', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'models',
            localField: 'model',
            foreignField: '_id',
            as: 'model'
          }
        },
        { $unwind: { path: '$model', preserveNullAndEmptyArrays: true } }
      ])

      const vehicleDoc = vehicleAgg[0]
      if (!vehicleDoc) throw new ServiceModuleError('NOT_FOUND|VEHICLE')

      const serviceTypeDoc = vehicleDoc.serviceType
      if (!serviceTypeDoc) throw new ServiceModuleError('NOT_FOUND|SERVICE_TYPE')

      const pricingId = await Pricing.findOne({
        serviceId: serviceTypeDoc._id,
        serviceAreaId: { $in: [serviceCity._id] }
      }).lean()
      if (!pricingId) throw new ServiceModuleError('NOT_FOUND|PRICING')

      const customerData = await Customer.findById(customerId)
      if (!customerData) throw new ServiceModuleError('NOT_FOUND|CUSTOMER')

      const travelInfo = await MapServices.getLocationData(
        [`${body.pickupLat},${body.pickupLng}`],
        [`${body.dropLat},${body.dropLng}`]
      )
      if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')

      const unitDistance = travelInfo.data.distanceValue
      const unitTime = travelInfo.data.timeValue
      const distanceMetric = travelInfo.data.distanceMetric || Config.app.distanceMetric
      const experience = Helpers.getDateDifference(new Date(customerData.createdAt), new Date())

      let partnerDiscountCommission = 0
      const hailTripModule = SettingsConfig.menulist.find(
        (item) => item.value == Enum.SETTINGS.HAILTRIPSETTINGS
      )
      if (
        hailTripModule.enabled &&
        HailTripConfig.isEnabled &&
        HailTripConfig.partnerDiscount.isEnabled &&
        auth?.role == Enum.ROLES.PARTNER
      ) {
        partnerDiscountCommission = partnerDoc.hailTripDiscountStatus
          ? partnerDoc.hailTripDiscountPercentage
          : 0
      }

      const priceInfo = await this.getPricing({
        unitDistance,
        unitTime,
        requestTime: Helpers.getISODate(),
        pricingId: pricingId._id,
        estimationObj: {},
        companycommission: 0,
        partnerDiscount: partnerDiscountCommission
      })
      if (!priceInfo.status) throw new Error(priceInfo.message)

      const estimateData = {
        distance: unitDistance,
        estTime: unitTime,
        start: body.pickupAddress ? body.pickupAddress : travelInfo.data.originLabel,
        end: body.dropAddress ? body.dropAddress : travelInfo.data.destinationLabel,
        startcoords: pickupLocationArr,
        endcoords: dropLocationArr,
        serviceId: serviceTypeDoc._id,
        fareType: priceInfo.data.pricingData.fare.type,
        fareAmt: priceInfo.data.estimation.distanceFare,
        timeFare: priceInfo.data.estimation.timeFare,
        baseFare: priceInfo.data.pricingData.baseFare,
        bookingFare: priceInfo.data.pricingData.bookingFare,
        minimumFare: priceInfo.data.pricingData.minimumFare,
        cancelationFare: 0,
        waitingFare: priceInfo.data.pricingData.waitingfare || 0,
        taxFare: priceInfo.data.estimation.taxFare || 0,
        additionalFare: priceInfo.data.estimation.additionalFare || 0,
        additional: priceInfo.data.estimation.additional,
        actualFare: priceInfo.data.estimation.actualFare || 0,
        discountFare: priceInfo.data.estimation.discountFare || 0,
        offers: priceInfo.data.estimation.offers || [],
        coupon: '',
        roundOff: priceInfo.data.estimation.roundOff || 0,
        totalFare: priceInfo.data.estimation.totalFare || 0,
        commision: priceInfo.data.estimation.commision,
        companycommission: priceInfo.data.estimation.companycommission,
        earnings: priceInfo.data.estimation.earnings,
        payable: priceInfo.data.estimation.payable
      }

      const bookingData = {
        requestFrom: body.requestFrom,
        type: Enum.MODULES.HAILRIDE,
        isScheduleLater: false,
        scheduleOn: Helpers.getISODate(),
        timeZone: body.timeZone,
        userId: customerId,
        distanceMetric,
        currency: body.currency || Config.app.currency,
        paymentMethod: body.paymentMethod,
        paymentMethodId: body.paymentMethodId,
        needClear: false
      }

      const serviceData = {
        serviceArea: priceInfo.data.pricingData.serviceId,
        serviceTypeId: serviceTypeDoc._id,
        serviceTypeName: serviceTypeDoc.name,
        pricingId: priceInfo.data.pricingData._id
      }

      const creatorData = {
        userId: auth.userId,
        role: auth.role,
        name: auth.name
      }

      const partnerData = partnerDoc
        ? {
            id: partnerDoc._id,
            name: partnerDoc.fname || partnerDoc.name,
            code: partnerDoc.uniCode,
            email: partnerDoc.email,
            phoneNo: partnerDoc.phone,
            phoneCode: partnerDoc.phoneCode,
            profile: partnerDoc.profile,

            // vehicle info
            vehicleId: vehicleDoc._id,
            vehicleNo: vehicleDoc.registrationnumber,
            vehicleMake: vehicleDoc.make?.name || vehicleDoc.makeid,
            vehicleModel: vehicleDoc.model?.name || vehicleDoc.model,
            vehicleColor: vehicleDoc.color,

            // service type info
            serviceType: serviceTypeDoc._id,
            serviceTypeName: serviceTypeDoc.name,

            experience: Helpers.getDateDifference(new Date(partnerDoc.createdAt), new Date())?.accuracy || 0,
            myRating: partnerDoc.ratings?.totalValue || 0,
            companyId: partnerDoc.companyId,
            acceptTime: Helpers.getISODate(),
            acceptLocation: pickupLocationArr,
            arriveTime: Helpers.getISODate(),
            arriveLocation: pickupLocationArr,
            startTime: Helpers.getISODate(),
            startLocation: pickupLocationArr
          }
        : {}

      const partnerList = {
        partnerId: partnerDoc._id,
        partnerUniCode: partnerDoc.uniCode,
        serviceTypeName: serviceTypeDoc.name,
        vehicleNo: vehicleDoc.registrationnumber,
        vehicleModel: vehicleDoc.model?.name || '',
        status: Enum.TRIP.STATUS.ACCEPTED,
        distance: 0,
        ETA: 0,
        requestTime: Helpers.getISODate()
      }

      const tripObj = {
        bookingData,
        serviceData,
        creatorData,
        customerData: {
          fname: customerData.fname,
          uniCode: customerData.uniCode,
          email: customerData.email,
          phone: customerData.phone,
          phoneCode: customerData.phoneCode,
          profile: customerData.profile,
          myRating: customerData.ratings.totalValue,
          experience: experience?.accuracy || 0
        },
        estimateData,
        partnerData,
        partnerList
      }
      const responseData = await this.sendHailRequest(tripObj)
      // const shareLink = Config.productLinks.shareTrip + responseData.tripdata._id

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_REQUEST'
      )({
        message: 'HAIL_TAXI_REQUEST_STARTED',
        requestId: responseData.tripdata._id,
        referenceNo: responseData.tripdata.referenceNo,
        isScheduleLater: false
        // shareLink: shareLink
      })
    } catch (error) {
      console.error('HAIL_RIDE_CREATE_ERROR', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static sendHailRequest = async (tripRequestdata) => {
    const response = {
      success: true,
      code: 200
    }

    const {
      bookingData,
      creatorData,
      customerData,
      serviceData,
      partnerList,
      partnerData = {},
      estimateData = {},
      additionalData = {}
    } = tripRequestdata

    const newTrip = new Trip({
      module: bookingData.type,
      requestFrom: bookingData.requestFrom,

      scheduleOn: Helpers.getISODate(),
      timeZone: bookingData.timeZone,
      isScheduleLater: false,

      distanceMetric: bookingData.distanceMetric,
      currencyCode: bookingData.currencyCode || Config.app.currencyCode,
      currency: bookingData.currency || Config.app.currency,
      paymentMethod: bookingData.paymentMethod || Enum.TRIP.PAYMENT_MODE.CASH,
      paymentMethodId: bookingData.paymentMethodId || '',

      serviceArea: serviceData.serviceArea,
      serviceType: serviceData.serviceTypeId,
      serviceTypeName: serviceData.serviceTypeName,
      servicePricing: serviceData.pricingId,

      customer: {
        id: bookingData.userId,
        name: customerData.fname,
        code: customerData.uniCode,
        email: customerData.email,
        phoneNo: customerData.phone,
        phoneCode: customerData.phoneCode,
        profile: customerData.profile,
        myRating: customerData.myRating || 0,
        requestPin: Helpers.sendRandomizeCode('0', 4),
        experience: customerData.experience || 0
      },

      partner: partnerData?.id
        ? {
            id: partnerData.id,
            name: partnerData.name,
            code: partnerData.code,
            email: partnerData.email,
            phoneNo: partnerData.phoneNo,
            phoneCode: partnerData.phoneCode,
            profile: partnerData.profile,
            vehicle: partnerData.vehicleId,
            vehicleNo: partnerData.vehicleNo,
            serviceType: partnerData.serviceType,
            serviceTypeName: partnerData.serviceTypeName,
            experience: partnerData.experience || 0,
            myRating: partnerData.myRating || 0,
            acceptTime: partnerData.acceptTime,
            acceptLocation: partnerData.acceptLocation,
            arriveTime: partnerData.arriveTime,
            arriveLocation: partnerData.arriveLocation,
            startTime: partnerData.startTime,
            startLocation: partnerData.startLocation
          }
        : {},

      partnerList: [partnerList],

      events: [
        {
          userId: creatorData.userId,
          userType: creatorData.role,
          userName: creatorData.name,
          category: Enum.TRIP.STATUS.PROGRESS,
          description: 'Hail ride started immediately'
        }
      ],

      estimation: estimateData,
      invoice: {},
      status: Enum.TRIP.STATUS.PROGRESS,

      Bidding: false,
      additionalDetails: additionalData
    })

    const tripdata = await newTrip.save()

    await ServiceModule.updateCustomerTripInDB(tripdata.customer.id, tripdata._id, Enum.TRIP.STATUS.PROGRESS)
    if (partnerData?.id) {
      await ServiceModule.updatePartnerTripInDB(partnerData.id, tripdata._id, Enum.TRIP.STATUS.PROGRESS)
    }

    const data = {
      flow: '14',
      tripId: tripdata._id,
      referenceNo: tripdata.referenceNo,
      tripStatus: tripdata.status,
      customerId: tripdata.customer.id,
      customerStatus: 'inTrip',
      ...(partnerData?.id && { partnerId: partnerData.id, partnerStatus: 'inTrip' })
    }
    await Helpers.tripFlowHandlerFB(data)

    response.tripdata = tripdata
    return response
  }

  static getEstimation = async (req, res) => {
    try {
      const body = req.query || {}
      const auth = req.auth || {}
      const validation = await TripValidator.validateData(body, 'getEstimation')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const pickupLocation = body.pickupLat + ',' + body.pickupLng
      // const pickupLocationArr = [body.pickupLng, body.pickupLat]
      const dropLocation = body.dropLat + ',' + body.dropLng
      // const dropLocationArr = [body.dropLng, body.dropLat]
      // const coupon = body.couponcode
      const requestTime = body.time || Helpers.getISODate()
      let coupon = null

      const serviceTypeQuery = {
        deletedAt: null
      }
      let vehicleData = null
      if (body.vehicleId) {
        vehicleData = await Vehicle.findOne({ _id: body.vehicleId })
        if (vehicleData) serviceTypeQuery['_id'] = vehicleData.servicetype
      }
      const serviceCity = await ServiceArea.findOne({
        deletedAt: null
        // $and: [
        //   {
        //     polygon: {
        //       $geoIntersects: {
        //         $geometry: {
        //           type: 'Point',
        //           coordinates: pickupLocationArr
        //         }
        //       }
        //     }
        //   },
        //   {
        //     polygon: {
        //       $geoIntersects: {
        //         $geometry: {
        //           type: 'Point',
        //           coordinates: dropLocationArr
        //         }
        //       }
        //     }
        //   }
        // ]
      })
        .lean()
        .exec()

      if (!serviceCity) throw new ServiceModuleError('SERVICE_NOT_AVAILABLE')

      const travelInfo = await MapServices.getLocationData([pickupLocation], [dropLocation])
      if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
      const unitDistance = travelInfo.data.distanceValue
      const distanceMetric = travelInfo.data.distanceMetric || Config.app.distanceMetric
      const timeMetric = travelInfo.data.timeMetric || Config.app.timeMetric
      const unitTime = travelInfo.data.timeValue

      if (body.coupon) {
        const checkCoupon = await CreteriaService.isValidCoupon({
          coupon: body.coupon,
          serviceCity: serviceCity.id
        })
        if (!checkCoupon.status) throw new Error(checkCoupon.message)
        coupon = checkCoupon.data
      }

      if (body.isScheduleLater && body.isScheduleLater == '1') {
        serviceTypeQuery['scheduleLater'] = true
      }

      let partnerDiscountCommission = 0
      const hailTripModule = SettingsConfig.menulist.find(
        (item) => item.value == Enum.SETTINGS.HAILTRIPSETTINGS
      )
      if (
        hailTripModule.enabled &&
        HailTripConfig.isEnabled &&
        HailTripConfig.partnerDiscount.isEnabled &&
        auth?.role == Enum.ROLES.PARTNER
      ) {
        const partnerData = await Partner.findById(auth?.userId)
        if (!partnerData) throw new Error('PARTNER_FOUND_FOUND')
        partnerDiscountCommission = partnerData.hailTripDiscountStatus
          ? partnerData.hailTripDiscountPercentage
          : 0
      }

      const serviceTypesData = await ServiceType.aggregate([
        {
          $match: serviceTypeQuery
        },
        {
          $lookup: {
            from: 'pricings',
            let: {
              serviceId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$$serviceId', '$serviceId']
                  },
                  serviceAreaId: { $in: [serviceCity._id] }
                }
              }
            ],
            as: 'pricingData'
          }
        },
        {
          $unwind: {
            path: '$pricingData'
            // preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            nearByVehicles: [] // fallback, as geoNear is disabled due to index issue
          }
        },
        {
          $project: {
            seats: 1,
            name: 1,
            scheduleLater: 1,
            features: 1,
            description: 1,
            status: 1,
            image: 1,
            topViewImage: 1,
            pricingId: '$pricingData._id',
            nearByVehicles: { $ifNull: ['$nearByVehicles', []] }
          }
        }
      ]).exec()
      if (serviceTypesData.length == 0)
        throw new ValidationError('Vehicle Not Available for this Service City')
      const serviceTypes = []
      for (const serviceType of serviceTypesData) {
        const priceInfo = await this.getPricing({
          unitDistance: unitDistance,
          unitTime: unitTime,
          requestTime: requestTime,
          pricingId: serviceType.pricingId,
          coupon: coupon,
          companycommission: 0,
          partnerDiscount: partnerDiscountCommission
        })
        if (!priceInfo.status) throw new Error(priceInfo.message)

        let arraivalTime = 0
        if (serviceType.nearByVehicles && serviceType.nearByVehicles.length > 0) {
          arraivalTime = serviceType.nearByVehicles[0].distance / 666.7
          arraivalTime = Math.ceil(Number(arraivalTime) || 0)
        }

        serviceType['vehicleDetails'] = {
          vehicleId: serviceType._id,
          vehicleName: serviceType.name,
          VehicleDescription: serviceType.description,
          vehicleImage: serviceType.image,
          seats: serviceType.seats,
          features: serviceType.features,
          scheduleLater: serviceType.scheduleLater,
          topViewImage: serviceType.topViewImage,
          nearByVehicles: serviceType.nearByVehicles,
          arraivalTime: arraivalTime,

          pricing: {
            currency: priceInfo.data.pricingData.currencyId || {},
            distance: unitDistance,
            unitFare: priceInfo.data.pricingData.fare.value,
            distanceFare: priceInfo.data.estimation.distanceFare,
            time: unitTime,
            unitTimeFare: priceInfo.data.pricingData.timeFare,
            timeFare: priceInfo.data.estimation.timeFare,
            minimumFare: priceInfo.data.pricingData.minimumFare,
            baseFare: priceInfo.data.pricingData.baseFare,
            bookingFare: priceInfo.data.pricingData.bookingFare,
            additionalFare: priceInfo.data.estimation.additionalFare
              ? priceInfo.data.estimation.additionalFare
              : 0,
            discountFare: priceInfo.data.estimation.discountFare ? priceInfo.data.estimation.discountFare : 0,
            offers: priceInfo.data.estimation.offers ? priceInfo.data.estimation.offers : [],
            actualFare: priceInfo.data.estimation.actualFare ? priceInfo.data.estimation.actualFare : 0,
            taxFare: priceInfo.data.estimation.taxFare ? priceInfo.data.estimation.taxFare : 0,
            totalFare: priceInfo.data.estimation.totalFare ? priceInfo.data.estimation.totalFare : 0,
            roundOff: priceInfo.data.estimation.roundOff ? priceInfo.data.estimation.roundOff : 0
          }
        }

        serviceTypes.push(serviceType['vehicleDetails'])
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ESTIMATION'
      )({
        serviceTypes: serviceTypes,
        coupon,
        location: {
          unitDistance,
          unitTime,
          distanceMetric,
          timeMetric
        }
      })
    } catch (error) {
      console.error('GET_ESTIMATION_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static listHailTrips = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit

      const filter = { module: 'HAILRIDE' }

      const [total, data] = await Promise.all([
        Trip.countDocuments(filter),
        Trip.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean()
      ])

      res.setHeader('x-total-count', total)
      return res.send(data)
    } catch (error) {
      console.error(error)
      return res.status(500).send([])
    }
  }

  static updateTripstatus = async (req, res) => {
    try {
      const body = req.body || {}
      const auth = req.auth || {}

      console.log('req.body', body, req.headers.authorization)
      const validation = await TripValidator.validateData(body, 'updateRequest')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const tripdata = await ServiceModule.getTripdetails(body.requestId)
      const partnerInfo = await Partner.findOne({ _id: tripdata[0].partner.id }).exec()
      if (!partnerInfo) throw new AuthendicationError('NOT_FOUND|PARTNER')
      body.status = Number(body.status)
      const tripObj = {
        body: body,
        tripdata: tripdata,
        auth: auth
      }
      // If Partner Trip Ended : Complete
      if (body.status == 3) {
        const getInvoice = await this.getInvoice(tripdata[0], body, tripdata[0].customer)
        if (!getInvoice?.status) throw new Error(getInvoice.message)
        tripObj.getInvoice = getInvoice
        const responseData = await ServiceModule.updateRequest(tripObj)
        requestHandler.sendSuccess(
          req,
          res,
          responseData.msg
        )({
          status: 'FINISHED',
          requestData: responseData.tripDataUpdated,
          payment: {
            status: responseData.paymentStatus
          }
        })
      }
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getInvoice = async (tripdata, body) => {
    const response = {
      status: false,
      message: 'UNPROCESSABLE_ENTITY',
      data: {}
    }
    try {
      let coupon = null
      const dropLocationsArr = [body.longitude, body.latitude]
      let unitDistance
      let unitTime
      const waitingTime = 0
      let invoiceObj = {}
      let others = {}

      const routePath = await ServiceTracker.findOne({ requestId: tripdata._id }).lean().exec()
      let routePathDistance = await MapServices.calculateLinestringLength(
        routePath?.dropPolyline?.coordinates || [],
        {
          distanceMetric: tripdata.distanceMetric
        }
      )
      if (body.endTime == undefined) body.endTime = Helpers.getISODate()
      routePathDistance = parseFloat(routePathDistance).toFixed(2)
      let routePathTime = Math.round(
        ((((new Date(tripdata?.partner?.startTime) || new Date()) - (new Date(body.endTime) || new Date())) %
          86400000) %
          3600000) /
          60000
      ) // In Minutes
      routePathTime = parseFloat(routePathTime).toFixed(2)

      // Default (for HAILRIDE / others)
      const dropLocations = body.latitude + ',' + body.longitude
      const pickupLocations = tripdata.estimation?.startcoords
        ? tripdata.estimation.startcoords[1] + ',' + tripdata.estimation.startcoords[0]
        : tripdata.partner.startLocation[1] + ',' + tripdata.partner.startLocation[0]

      const travelInfo = await MapServices.getLocationData([pickupLocations], [dropLocations], {
        distanceMetric: tripdata.distanceMetric
      })

      if (travelInfo?.status) {
        unitDistance = travelInfo.data.distanceValue
        unitTime = travelInfo.data.timeValue
        unitDistance = unitDistance > routePathDistance ? unitDistance : routePathDistance
        unitTime = routePathTime > unitTime ? routePathTime : unitTime
        invoiceObj = {
          start: travelInfo.data.originLabel || tripdata.estimation.start,
          end: travelInfo.data.destinationLabel || tripdata.estimation.end
        }
        others = {
          timeLabel: travelInfo.data.timeLabel,
          distanceLabel: travelInfo.data.distanceLabel
        }
      } else {
        // fallback to estimation if map fails
        unitDistance = tripdata.estimation.distance || 0
        unitTime = tripdata.estimation.estTime || 0
        invoiceObj = {
          start: tripdata.estimation.start || '',
          end: tripdata.estimation.end || ''
        }
        others = {
          timeLabel: `${unitTime} mins`,
          distanceLabel: `${unitDistance} km`
        }
      }

      if (tripdata.estimation.coupon) {
        const checkCoupon = await CreteriaService.isValidCoupon({
          coupon: tripdata.estimation.coupon,
          serviceCity: tripdata.service
        })
        if (checkCoupon.status) coupon = checkCoupon.data
      }
      let companycommission = 0
      if (tripdata.companyId && tripdata.companyId != '') {
        const company = await Company.findOne({ _id: tripdata.companyId }, { commission: 1 }).lean().exec()
        companycommission = company?.commission || 0
      }

      let partnerDiscountCommission = 0
      if (
        SettingsConfig.menulist.find((item) => item.value == Enum.SETTINGS.HAILTRIPSETTINGS).enabled &&
        HailTripConfig.isEnabled &&
        HailTripConfig.partnerDiscount.isEnabled
      ) {
        const partnerData = await Partner.findById(tripdata.partner?.id)
        if (!partnerData) throw new Error('PARTNER_NOT_FOUND')
        partnerDiscountCommission = partnerData.hailTripDiscountStatus
          ? partnerData.hailTripDiscountPercentage
          : 0
      }

      let adminTripCommission = null
      const subscriptionModule = SettingsConfig.menulist.find(
        (item) => item.value == Enum.SETTINGS.SUBSCRIPTIONSETTING
      )
      if (subscriptionModule.enabled && SubscriptionConfig.isEnabled) {
        if (tripdata.partner?.subscriptionStatus) {
          const activePackage = await PurchasePackage.findOne({
            userId: tripdata.partner.id,
            status: Enum.PACKAGE.STATUS.ACTIVE,
            type: Enum.PACKAGE.TYPE.SUBSCRIPTION,
            endDate: { $lte: new Date(Helpers.getISODate()) }
          })
          if (activePackage) {
            adminTripCommission = activePackage.adminCommission
          }
        }
      }

      const priceInfo = await this.getPricing({
        unitDistance: unitDistance,
        unitTime: unitTime,
        requestTime: Helpers.getISODate(),
        waitingTime: waitingTime,
        pricingId: tripdata.servicePricing,
        coupon: coupon,
        companycommission: companycommission,
        estimationObj: tripdata.estimation,
        partnerDiscount: partnerDiscountCommission,
        commission: adminTripCommission
      })
      if (!priceInfo.status) throw new Error('CONTACT_ADMIN')

      let adminEarnings = priceInfo.data.estimation.earnings
      console.log('adminEarnings', adminEarnings)
      let payable = priceInfo.data.estimation.payable
      console.log('payable', payable)
      if (subscriptionModule.enabled && JSON.parse(SubscriptionConfig.isEnabled)) {
        const findPartner = await Partner.findById(tripdata.partner?.id)
        const payment = findPartner?.payment || null // Null means no subscription active.
        // Check subscription active or not.
        if (payment && payment.subscriptionStatus) {
          const purchasePackageData = await PurchasePackage.findOne({
            _id: findPartner.payment?.packageId,
            status: Enum.PACKAGE.STATUS.ACTIVE
          })

          // const packageData = await Package.findOne({ _id: purchasePackageData.packageId })
          // Check subscription free trips
          // const completedTripsCount = await Trip.find({
          //   'partner.id': findPartner._id,
          //   status: Enum.TRIP.STATUS.FINISHED
          // })
          //   .countDocuments()
          //   .exec()
          const availableFreeTripsCount = purchasePackageData.newPurchaseFreeTrips
          console.log('availableFreeTripsCount', availableFreeTripsCount)

          if (availableFreeTripsCount > 0) {
            purchasePackageData.newPurchaseFreeTrips = purchasePackageData?.newPurchaseFreeTrips - 1
            await purchasePackageData.save()
            // Don't need to deduct booking fee from partner
            adminEarnings = adminEarnings - priceInfo.data.estimation.bookingFare
            console.log('adminEarnings', adminEarnings, priceInfo.data.estimation.bookingFare)
            payable = payable + priceInfo.data.estimation.bookingFare
            console.log('payable', payable)
          }
        }
      }

      const invoiceData = {
        ...invoiceObj,
        distance: unitDistance,
        estTime: unitTime,
        startcoords: tripdata.estimation.startcoords,
        endcoords: dropLocationsArr,
        fareType: tripdata.estimation.fareType,
        fareAmt: priceInfo.data.estimation.distanceFare || 0,
        // fareAmt: distanceFare,
        timeFare: priceInfo.data.estimation.timeFare || 0,
        baseFare: priceInfo.data.pricingData.baseFare,
        bookingFare: priceInfo.data.estimation.bookingFare,
        minimumFare: priceInfo.data.estimation.minimumFare || 0,
        waitingFare: priceInfo.data.estimation.waitingFare || 0,

        taxFare: priceInfo.data.estimation.taxFare || 0,
        additionalFare: priceInfo.data.estimation.additionalFare,
        additional: priceInfo.data.estimation.additional,
        actualFare: priceInfo.data.estimation.actualFare,

        discountFare: priceInfo.data.estimation.discountFare ? priceInfo.data.estimation.discountFare : 0,
        offers: priceInfo.data.estimation.offers ? priceInfo.data.estimation.offers : [],
        coupon: tripdata.estimation.coupon || '',

        roundOff: priceInfo.data.estimation.roundOff,
        totalFare: priceInfo.data.estimation.totalFare,

        commision: priceInfo.data.estimation.commision,
        companycommission: priceInfo.data.estimation.companycommission,
        earnings: adminEarnings ?? priceInfo.data.estimation.earnings,
        payable: payable ?? priceInfo.data.estimation.payable,
        stops: tripdata.invoice.stops
      }

      // Route Image Generation
      const routeImage = `public/services/routes/${tripdata._id}.png`
      let getRoute = []
      if (routePath?.dropPolyline && routePath.dropPolyline.coordinates.length > 0) {
        getRoute = routePath.dropPolyline.coordinates.map((data) => `${data[1]},${data[0]}`)
      }
      Promise.resolve(getRoute)
        .then((getRouteOptimized) => {
          MapServices.routeImage({
            storage: `./${routeImage}`,
            pickupLocation: {
              lat: tripdata.partner.startLocation[1],
              lng: tripdata.partner.startLocation[0]
            },
            dropLocation: { lat: body.latitude, lng: body.longitude },
            paths: getRouteOptimized
          })
        })
        .catch((error) => console.log('ROUTE_IMAGE_GENERATION_ERROR: ', error))

      if (priceInfo?.data?.estimation?.discountFare > 0) {
        CreteriaService.applyCoupon({
          coupon: tripdata.estimation.coupon,
          referenceId: tripdata._id,
          module: 'TRIP',
          amount: priceInfo?.data?.estimation?.discountFare,
          userId: tripdata.customer.id,
          userRole: Enum.ROLES.CUSTOMER
        })
      }
      response.status = true
      response.message = 'INVOICE'
      response.data = {
        invoiceData,
        routeImage,
        others
      }
    } catch (error) {
      console.error('CALCULATE_FINAL_AMOUNT_ERROR:', error)
      response.status = false
      response.message = error.message
      response.data = {}
    }
    return response
  }

  static getPricing = async (pricingInput) => {
    const response = {
      status: false,
      message: 'UNPROCESSABLE_ENTITY',
      data: {}
    }
    try {
      const currencyPopulate = [{ path: 'currencyId', select: 'name code symbol' }]
      const pricingData = await Pricing.findOne({ _id: pricingInput.pricingId })
        .populate(currencyPopulate)
        .lean()
        .exec()
      if (!pricingData) throw new ServiceModuleError('NOT_FOUND|PRICING')

      // // Initial Value
      // const estimation = {
      //   distanceFare: Helpers.roundOff(
      //     parseFloat(pricingInput.unitDistance) * parseFloat(pricingData.fare.value)
      //   ),
      //   timeFare: Helpers.roundOff(parseFloat(pricingInput.unitTime) * parseFloat(pricingData.timeFare)),

      //   baseFare: pricingData.baseFare || 0,
      //   bookingFare: pricingData.bookingFare || 0,
      //   minimumFare: pricingData.minimumFare || 0,

      //   waitingFare: 0,
      //   additionalFare: 0,

      //   taxFare: 0,
      //   actualFare: 0,
      //   additional: [],
      //   additionalFeeArr: [],

      //   discountFare: 0,
      //   offers: [],

      //   totalFare: 0,
      //   roundOff: 0,

      //   commision: 0,
      //   companycommission: 0,
      //   payable: 0,
      //   earnings: 0
      // }

      let distanceFare = 0
      const travelledKm = parseFloat(pricingInput.unitDistance) || 0
      const defaultFareType = pricingData.fare?.type || 'unitRate'
      const defaultFareValue = parseFloat(pricingData.fare?.value || 0)

      const slabs = pricingData?.additional?.distanceFare || []

      if (Array.isArray(slabs) && slabs.length > 0) {
        slabs.sort((a, b) => parseFloat(a.from) - parseFloat(b.from))

        let coveredUntil = 0

        for (let i = 0; i < slabs.length; i++) {
          let from = parseFloat(slabs[i].from)
          const to = parseFloat(slabs[i].to)

          if (i === 0 && from > 0) from = 0 // ensure first slab starts at 0

          if (travelledKm >= from) {
            const slabEnd = Math.min(travelledKm, to)
            const coveredKm = slabEnd - from

            if (coveredKm > 0) {
              const fareType = slabs[i].fare?.type || defaultFareType
              const fareValue = parseFloat(slabs[i].fare?.value || defaultFareValue)

              if (fareType === 'flatRate') {
                distanceFare += fareValue
              } else if (fareType === 'unitRate') {
                distanceFare += coveredKm * fareValue
              }

              coveredUntil = slabEnd
            }
          }
        }

        if (travelledKm > coveredUntil) {
          const remainingKm = travelledKm - coveredUntil

          if (defaultFareType === 'flatRate') {
            distanceFare += defaultFareValue
          } else {
            distanceFare += remainingKm * defaultFareValue
          }
        }
      } else {
        if (defaultFareType === 'flatRate') {
          distanceFare = defaultFareValue
        } else {
          distanceFare = travelledKm * defaultFareValue
        }
      }

      distanceFare = Helpers.roundOff(distanceFare)

      // Build initial estimation object
      const estimation = {
        distanceFare: Helpers.roundOff(distanceFare),
        timeFare: Helpers.roundOff(parseFloat(pricingInput.unitTime) * parseFloat(pricingData.timeFare)),

        baseFare: pricingData.baseFare || 0,
        bookingFare: pricingData.bookingFare || 0,
        minimumFare: pricingData.minimumFare || 0,

        waitingFare: 0,
        additionalFare: 0,

        taxFare: 0,
        actualFare: 0,
        additional: [],
        additionalFeeArr: [],

        discountFare: 0,
        offers: [],

        totalFare: 0,
        roundOff: 0,

        commision: 0,
        companycommission: 0,
        payable: 0,
        earnings: 0
      }

      // Additional Fare
      const additionalFee = pricingData.additional
      // Night Fare
      if (Array.isArray(additionalFee.nightFare) && additionalFee.nightFare.length > 0) {
        for (const nightFare of additionalFee.nightFare) {
          const nightFareFall = this.getFareTimeFallsIn(nightFare, pricingInput.requestTime, 'night')
          if (nightFareFall.status) {
            estimation.additionalFeeArr.push(nightFareFall)
            break
          }
        }
      }
      // Peak Fare
      if (Array.isArray(additionalFee.peakFare) && additionalFee.peakFare.length > 0) {
        for (const peakFare of additionalFee.peakFare) {
          const peakFareFall = this.getFareTimeFallsIn(peakFare, pricingInput.requestTime, 'peak')
          if (peakFareFall.status) {
            estimation.additionalFeeArr.push(peakFareFall)
            break
          }
        }
      }
      // Waiting Fare
      if (
        pricingData.waitingFare.status &&
        pricingInput.waitingTime &&
        pricingInput.waitingTime > pricingData.waitingFare.allowedMin
      ) {
        estimation['waitingFare'] = Helpers.roundOff(
          Math.round(pricingInput.waitingTime - pricingData.waitingFare.allowedMin) *
            pricingData.waitingFare.fare
        )
        estimation.additionalFeeArr.push({
          status: true,
          name: 'Waiting Charge',
          fareType: 'amount',
          actual: 0,
          fare: estimation['waitingFare']
        })
      }
      // Pickup Fare
      if (pricingData.additional.pickupFare.status && pricingData.additional.pickupFare.value > 0) {
        estimation.additionalFeeArr.push({
          status: true,
          name: 'Pickup Charge',
          fareType: 'amount',
          actual: 0,
          fare: pricingData.additional.pickupFare.value
        })
      }

      estimation['actualFare'] =
        parseFloat(estimation.distanceFare) +
        parseFloat(estimation.timeFare) +
        parseFloat(estimation.baseFare) +
        parseFloat(estimation.bookingFare)
      estimation['actualFare'] = Helpers.roundOff(estimation['actualFare'])
      const minimumFareTotal = estimation['actualFare'] - parseFloat(estimation.bookingFare)

      // Check for minimum fare
      if (parseFloat(minimumFareTotal) < parseFloat(estimation.minimumFare)) {
        // estimation['actualFare'] = estimation.minimumFare
        const minimumFareAdded = Helpers.roundOff(estimation.minimumFare - parseFloat(minimumFareTotal))
        estimation.additionalFeeArr.push({
          status: true,
          name: 'Minimum Fare Added',
          fareType: 'amount',
          actual: minimumFareAdded,
          fare: minimumFareAdded
        })
      }

      for (const additionalFeeEl of estimation.additionalFeeArr) {
        if (additionalFeeEl.fareType == 'percentage')
          estimation['additionalFare'] += estimation['actualFare'] * (additionalFeeEl.fare / 100)
        else if (additionalFeeEl.fareType == 'amount') estimation['additionalFare'] += additionalFeeEl.fare
      }
      estimation['additionalFare'] = Helpers.roundOff(estimation['additionalFare'])
      estimation['additional'] = estimation.additionalFeeArr

      estimation['totalFare'] = estimation['actualFare'] = Helpers.roundOff(
        parseFloat(parseFloat(estimation['actualFare']) + parseFloat(estimation['additionalFare']))
      )

      // Tax Fare
      if (pricingData.taxFare.status) {
        estimation['taxFare'] = Helpers.roundOff(estimation['totalFare'] * (pricingData.taxFare.fare / 100))
        estimation['totalFare'] = estimation['actualFare'] = Helpers.roundOff(
          estimation['totalFare'] + estimation['taxFare']
        )
      }

      const estimationObj = pricingInput?.estimationObj
      const isEstimationObjValid = estimationObj && Object.keys(estimationObj).length !== 0

      const biddingItem = Array.isArray(estimationObj?.additional)
        ? estimationObj.additional.find((item) => item.name === Enum.SOCKET.BIDDING)
        : null

      if (isEstimationObjValid && biddingItem) {
        // Aplying Bidding in After Estimate (Final Fare)
        estimation.additional.push({
          name: Enum.SOCKET.BIDDING,
          fareType: 'amount',
          actual: biddingItem.actual,
          fare: biddingItem.fare
        })
        estimation.totalFare = Number(estimationObj.totalFare)
      }

      // Discount Fare
      if (pricingInput.coupon) {
        const coupon = pricingInput.coupon
        let discountFare = 0
        if (coupon.fare.type == 'Flatrate') {
          discountFare = coupon.fare.value
        } else {
          discountFare = Helpers.roundOff(estimation['totalFare'] * (coupon.fare.value / 100))
          if (discountFare > coupon.offerLimit) discountFare = coupon.offerLimit
        }

        if (estimation['totalFare'] < discountFare) discountFare = estimation['totalFare']

        estimation['discountFare'] = discountFare
        estimation['offers'].push(coupon)

        estimation['totalFare'] = Helpers.roundOff(
          parseFloat(parseFloat(estimation['totalFare']) - parseFloat(estimation['discountFare']))
        )
      }

      // partner give discount for Hail trip
      if (pricingInput.partnerDiscount) {
        estimation['discountFare'] = Helpers.roundOff(
          estimation['totalFare'] * (pricingInput.partnerDiscount / 100)
        )
        estimation['totalFare'] = Helpers.roundOff(
          parseFloat(parseFloat(estimation['totalFare']) - parseFloat(estimation['discountFare']))
        )
      }

      // Round Off
      estimation['roundOff'] = Helpers.roundOff(Math.round(estimation['totalFare']) - estimation['totalFare'])
      estimation['totalFare'] = Math.round(estimation['totalFare'])

      estimation['commision'] = Helpers.roundOff(
        (estimation['totalFare'] - estimation['taxFare']) *
          ((pricingInput.commission ?? pricingData.commision) / 100) // Admin special subscription commission or pricing default commission
      )

      estimation['companycommission'] = Helpers.roundOff(
        (estimation['totalFare'] - estimation['taxFare']) * (pricingInput.companycommission / 100)
      )

      estimation['earnings'] =
        estimation['commision'] +
        estimation['taxFare'] +
        estimation['bookingFare'] -
        estimation['discountFare']
      estimation['earnings'] = Helpers.roundOff(estimation['earnings'])
      estimation['payable'] = Helpers.roundOff(estimation['totalFare'] - estimation['earnings'])

      // console.info('estimation', JSON.stringify(estimation))
      response.status = true
      response.message = 'ESTIMATED'
      response.data = {
        estimation,
        pricingInput,
        pricingData
      }
    } catch (error) {
      console.error('GET_PRICING_ERROR: ', error)
      response.status = false
      response.message = error.message
      response.data = {}
    }
    return response
  }

  static getFareTimeFallsIn = function (duration, now, forType = 'peak') {
    let resObj = { status: false, name: '', fareType: '', actual: 0, fare: 0 }
    try {
      const format = 'hh:mm:ss'
      const to = moment(duration.to, format)
      const from = moment(duration.from, format)
      const tempnow = moment(now, format)
      now = moment(tempnow, format)

      if (now.isBetween(from, to)) {
        if (forType == 'peak') {
          resObj.name = 'Peak Fare'
        } else {
          resObj.name = 'Night Fare'
        }
        resObj.fareType = duration.fare.type
        resObj.actual = duration.fare.value
        resObj.fare = duration.fare.value
        resObj.status = true
      }
    } catch (error) {
      console.error('GET_FARE_TIME_FALLS_IN_ERROR', error)
      resObj = { status: false, name: '', fareType: '', actual: 0, fare: 0 }
    }
    return resObj
  }
}

export { HailTripsModuleController }
