/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import { MapServices } from '../../Map/index.js'
import ServiceArea from '../../../models/Creteria/ServiceArea.js'
import { Config } from '../../../config/AppConfig.js'
import { Enum } from '../../../utils/Enum.js'
import { CreteriaService } from '../../../services/Creteria/CreteriaServices.js'
import ServiceType from '../../../models/Creteria/ServiceType.js'
import { DailyModuleController as DailyModule } from '../../../controllers/ServiceModule/DailyModuleController.js'
import { ServiceModuleController as ServiceModule } from '../../../controllers/ServiceModule/ServiceModuleController.js'
import { MultistopValidator } from '../validators/MultistopValidator.js'
import Pricing from '../../../models/Creteria/Pricing.js'
import { SettingsConfig } from '../../../config/SettingsConfig.js'
import Trip from '../../../models/ServiceModule/Trip.js'
import { ServiceModuleError } from '../../../utils/ErrorHandler.js'
import mongoose from 'mongoose'
import Customer from '../../../models/Auth/Customer.js'
import { Helpers } from '../../../helpers/Function.js'
import { BookingforothersController } from '../../../modules/Bookingforothers/controllers/BookingforothersController.js'
import path from 'path'
import fs from 'fs'
import { MultistopConfig } from '../config.js'
import { NotifcationController } from '../../../controllers/Notification/Index.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class MultistopController extends BaseController {
  constructor() {
    super()
  }

  static updateConfigData = async (req, res) => {
    try {
      const body = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/Multistop/config.js`
      const fileContent = `
          /* ************************
     * Copyright 2023
     * ABSERVETECH
     ************************ */
        const MultistopConfig = ${JSON.stringify(body, null, 2)} 
        export { MultistopConfig }`

      await fs.writeFileSync(filePath, fileContent)
      return requestHandler.sendSuccess(req, res, 'UPDATE_CONFIG')({ message: 'UPDATED', data: body })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static configData = async (req, res) => {
    try {
      const config = MultistopConfig
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_MULTISTOP_CONFIG'
      )({ message: 'SUCCESS', data: config })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getEstimation = async (req, res) => {
    try {
      const MultiStopModule = SettingsConfig.menulist.find(
        (item) => item.value === Enum.SETTINGS.MULTISTOPSETTING
      )

      if (!MultiStopModule.enabled) throw new ServiceModuleError('MULTISTOP_NOT_ENABLED')

      const body = req.body || {}
      // start points
      const latitude = body.stops[0].latitude
      const longitude = body.stops[0].longitude

      const validation = await MultistopValidator.validateData(body, 'getEstimation')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const requestTime = body.time || Helpers.getISODate()
      let coupon = null
      const serviceTypeQuery = {
        deletedAt: null
      }

      const serviceCity = await ServiceArea.findOne({
        deletedAt: null
      })
        .lean()
        .exec()
      if (!serviceCity) throw new ServiceModuleError('SERVICE_NOT_AVAILABLE')

      const distanceMetric = Config.app.distanceMetric
      const timeMetric = Config.app.timeMetric

      // stops must be an array of objects
      const geoData = await MapServices.getMultipleLocationData(body.stops)
      if (!geoData.status) throw new ServiceModuleError('DISTANCE_ESTIMATE_FAILED')

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
          $lookup: {
            from: 'partners',
            let: {
              serviceType: '$_id'
            },
            pipeline: [
              {
                $geoNear: {
                  near: {
                    type: 'Point',
                    key: 'location',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                  },
                  maxDistance: 5000,
                  spherical: true,
                  distanceField: 'distance'
                  // query: {
                  //   // $expr: {
                  //   //   $eq: ['$curService', '$$serviceType'],
                  //   // },
                  //   online: true,
                  // },
                }
              },
              {
                $match: {
                  $expr: {
                    $eq: ['$curService', '$$serviceType']
                  },
                  online: true,
                  curStatus: 'free'
                }
              },
              {
                $limit: 10
              },
              {
                $project: {
                  location: 1,
                  distance: 1,
                  curService: 1
                }
              }
            ],
            as: 'nearByVehicles'
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
      const serviceTypes = []
      for (const serviceType of serviceTypesData) {
        const priceInfo = await DailyModule.getPricing({
          unitDistance: geoData.data.unitDistance,
          unitTime: geoData.data.unitTime,
          requestTime: requestTime,
          pricingId: serviceType.pricingId,
          coupon: coupon
        })
        if (!priceInfo.status) throw new Error(priceInfo.message)

        /* 
                  Aproximate Arraival Time calculation:
                    Per Hour 30 Kilometers with speed of 40 
                    so per minute 666.7 meters
                    then the aproximate arrival time is distance(Meter) / 666.7 
                */
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
            distance: geoData.data.unitDistance,
            unitFare: priceInfo.data.pricingData.fare.value,
            distanceFare: priceInfo.data.estimation.distanceFare,
            time: geoData.data.unitTime,
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
          unitDistance: geoData.data.unitDistance,
          unitTime: geoData.data.unitTime,
          distanceMetric,
          timeMetric,
          stops: geoData.data.stops
        }
      })
    } catch (error) {
      console.error('GET_ESTIMATION_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static changeStops = async (req, res) => {
    try {
      const MultiStopModule = SettingsConfig.menulist.find(
        (item) => item.value === Enum.SETTINGS.MULTISTOPSETTING
      )

      if (!MultiStopModule.enabled) throw new Error('MULTISTOP_NOT_ENABLED')

      const body = req.body || {}
      const auth = req.auth || {}
      const validation = await MultistopValidator.validateData(body, 'addStops')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const tripData = await Trip.findOne({
        _id: body.requestId,
        status: {
          $nin: [Enum.TRIP.STATUS.PROGRESS, Enum.TRIP.STATUS.FINISHED, Enum.TRIP.STATUS.CANCELLED]
        }
      })

      if (!tripData) throw new Error('CANNOT_PROCEED')

      let customerId
      if (auth.role == Enum.ROLES.ADMIN) {
        customerId = req.body.id
      } else {
        customerId = auth.userId
      }

      const startPoint = body.stops[0]
      const endPoint = body.stops[body.stops.length - 1]
      const pickupLocationArr = [startPoint.longitude, startPoint.latitude]
      const dropLocationArr = [endPoint.longitude, endPoint.latitude]

      const coupon = null
      const serviceCity = await ServiceModule.checkServiceArea(pickupLocationArr)
      const serviceType = await ServiceType.findOne({
        _id: mongoose.Types.ObjectId(body.vehicleId)
      })
        .lean()
        .exec()
      if (!serviceType) throw new ServiceModuleError('NOT_FOUND|SERVICE_TYPE')

      const pricingId = await Pricing.findOne({
        serviceId: mongoose.Types.ObjectId(serviceType._id),
        serviceAreaId: { $in: [mongoose.Types.ObjectId(serviceCity._id)] }
      })
        .lean()
        .exec()
      if (!pricingId) throw new Error('NOT_FOUND|PRICING')

      const customerData = await Customer.findOne({ _id: customerId }).exec()
      if (!customerData) throw new Error('NOT_FOUND|CUSTOMER')

      const travelInfo = await MapServices.getMultipleLocationData(body.stops)
      if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')

      const unitDistance = travelInfo.data.unitDistance
      const unitTime = travelInfo.data.unitTime
      const scheduleOn = tripData.scheduleOn

      // scheduleOn.setTime(scheduleOn.getTime() + 30 * 60 * 1000)
      scheduleOn.setSeconds(0)

      const priceInfo = await DailyModule.getPricing({
        unitDistance: unitDistance,
        unitTime: unitTime,
        requestTime: scheduleOn,
        pricingId: pricingId._id,
        coupon: coupon
      })
      if (!priceInfo.status) throw new Error(priceInfo.message)
      const estimateData = {
        distance: unitDistance,
        estTime: unitTime,
        start: travelInfo.data.originLabel,
        end: travelInfo.data.destinationLabel,
        startcoords: pickupLocationArr,
        endcoords: dropLocationArr,
        fareAmt: priceInfo.data.estimation.distanceFare,
        timeFare: priceInfo.data.estimation.timeFare,
        baseFare: priceInfo.data.pricingData.baseFare,
        bookingFare: priceInfo.data.pricingData.bookingFare,
        minimumFare: priceInfo.data.pricingData.minimumFare,
        cancelationFare: 0,
        waitingFare: priceInfo.data.pricingData.waitingfare ? priceInfo.data.pricingData.waitingfare : 0,
        taxFare: priceInfo.data.estimation.taxFare ? priceInfo.data.estimation.taxFare : 0,
        additionalFare: priceInfo.data.estimation.additionalFare
          ? priceInfo.data.estimation.additionalFare
          : 0,
        additional: priceInfo.data.estimation.additional,
        actualFare: priceInfo.data.estimation.actualFare ? priceInfo.data.estimation.actualFare : 0,
        discountFare: priceInfo.data.estimation.discountFare ? priceInfo.data.estimation.discountFare : 0,
        offers: priceInfo.data.estimation.offers ? priceInfo.data.estimation.offers : [],
        coupon: body.coupon || '',
        roundOff: priceInfo.data.estimation.roundOff ? priceInfo.data.estimation.roundOff : 0,
        totalFare: priceInfo.data.estimation.totalFare ? priceInfo.data.estimation.totalFare : 0,
        commision: priceInfo.data.estimation.commision,
        earnings: priceInfo.data.estimation.earnings,
        payable: priceInfo.data.estimation.payable,
        stops: travelInfo.data.stops
      }

      tripData.estimation = estimateData

      tripData.serviceArea = priceInfo.data.pricingData.serviceId
      tripData.serviceType = serviceType._id
      tripData.serviceTypeName = serviceType.name
      tripData.pricingId = priceInfo.data.pricingData._id
      await tripData.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'TRIP_STOPS'
      )({
        message: 'TRIP_STOPS_CHANGED'
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static tripRequest = async (req, res) => {
    try {
      const MultiStopModule = SettingsConfig.menulist.find(
        (item) => item.value === Enum.SETTINGS.MULTISTOPSETTING
      )

      if (!MultiStopModule.enabled) throw new Error('MULTISTOP_NOT_ENABLED')

      const body = req.body || {}
      const auth = req.auth || {}
      const validation = await MultistopValidator.validateData(body, 'tripRequest')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      let customerId
      if (auth.role == Enum.ROLES.ADMIN) {
        customerId = req.body.id
      } else {
        customerId = auth.userId
      }
      const startPoint = body.stops[0]
      const endPoint = body.stops[body.stops.length - 1]

      const pickupLocationArr = [startPoint.longitude, startPoint.latitude]
      const dropLocationArr = [endPoint.longitude, endPoint.latitude]

      let coupon = null
      await ServiceModule.checkExisttrip(customerId)
      const serviceCity = await ServiceModule.checkServiceArea(pickupLocationArr)
      const serviceType = await ServiceType.findOne({
        _id: mongoose.Types.ObjectId(body.vehicleId)
      })
        .lean()
        .exec()
      if (!serviceType) throw new ServiceModuleError('NOT_FOUND|SERVICE_TYPE')

      const pricingId = await Pricing.findOne({
        serviceId: mongoose.Types.ObjectId(serviceType._id),
        serviceAreaId: { $in: [mongoose.Types.ObjectId(serviceCity._id)] }
      })
        .lean()
        .exec()
      if (!pricingId) throw new ServiceModuleError('NOT_FOUND|PRICING')

      let customerData = await Customer.findOne({ _id: customerId }).exec()
      if (!customerData) throw new ServiceModuleError('NOT_FOUND|CUSTOMER')

      // const travelInfo = await MapServices.getLocationData([pickupLocation], [dropLocation])
      const travelInfo = await MapServices.getMultipleLocationData(body.stops)
      if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
      const unitDistance = travelInfo.data.unitDistance
      const distanceMetric = travelInfo.data.distanceMetric || Config.app.distanceMetric
      const unitTime = travelInfo.data.unitTime

      const experience = Helpers.getDateDifference(new Date(customerData.createdAt), new Date())

      if (body.coupon) {
        const checkCoupon = await CreteriaService.isValidCoupon({
          coupon: body.coupon,
          serviceCity: serviceCity.id
        })
        if (!checkCoupon.status) throw new Error(checkCoupon.message)
        coupon = checkCoupon.data
      }
      const response = await BookingforothersController.bookingforothers(body, customerData)
      customerData = response.data

      const scheduleOn =
        body.scheduleOn && body.scheduleOn != '' ? new Date(body.scheduleOn) : new Date(Helpers.getISODate())
      // scheduleOn.setTime(scheduleOn.getTime() + 30 * 60 * 1000)
      scheduleOn.setSeconds(0)

      const priceInfo = await DailyModule.getPricing({
        unitDistance: unitDistance,
        unitTime: unitTime,
        requestTime: scheduleOn,
        pricingId: pricingId._id,
        coupon: coupon
      })

      if (!priceInfo.status) throw new Error(priceInfo.message)
      const estimateData = {
        distance: unitDistance,
        estTime: unitTime,
        start: body.pickupAddress || travelInfo.data.stops[0].address,
        end: body.dropAddress || travelInfo.data.stops[travelInfo.data.stops.length - 1].address,
        startcoords: pickupLocationArr,
        endcoords: dropLocationArr,
        serviceId: serviceType._id,
        fareType: priceInfo.data.pricingData.fare.type,
        fareAmt: priceInfo.data.estimation.distanceFare,
        timeFare: priceInfo.data.estimation.timeFare,
        baseFare: priceInfo.data.pricingData.baseFare,
        bookingFare: priceInfo.data.pricingData.bookingFare,
        minimumFare: priceInfo.data.pricingData.minimumFare,
        cancelationFare: 0,
        waitingFare: priceInfo.data.pricingData.waitingfare ? priceInfo.data.pricingData.waitingfare : 0,

        taxFare: priceInfo.data.estimation.taxFare ? priceInfo.data.estimation.taxFare : 0,
        additionalFare: priceInfo.data.estimation.additionalFare
          ? priceInfo.data.estimation.additionalFare
          : 0,
        additional: priceInfo.data.estimation.additional,
        actualFare: priceInfo.data.estimation.actualFare ? priceInfo.data.estimation.actualFare : 0,

        discountFare: priceInfo.data.estimation.discountFare ? priceInfo.data.estimation.discountFare : 0,
        offers: priceInfo.data.estimation.offers ? priceInfo.data.estimation.offers : [],
        coupon: body.coupon || '',

        roundOff: priceInfo.data.estimation.roundOff ? priceInfo.data.estimation.roundOff : 0,
        totalFare: priceInfo.data.estimation.totalFare ? priceInfo.data.estimation.totalFare : 0,

        commision: priceInfo.data.estimation.commision,
        earnings: priceInfo.data.estimation.earnings,
        payable: priceInfo.data.estimation.payable,
        stops: travelInfo.data.stops
      }
      const bookingData = {
        type: body.type,
        requestFrom: body.requestFrom,
        scheduleOn: body.scheduleOn ? body.scheduleOn : Helpers.getISODate(),
        timeZone: body.timeZone,
        isScheduleLater: body.isScheduleLater,
        distanceMetric: distanceMetric,
        currency: body.currency,
        paymentMethod: body.paymentMethod,
        paymentMethodId: body.paymentMethodId,
        userId: customerId
      }

      const serviceData = {
        serviceArea: priceInfo.data.pricingData.serviceId,
        serviceTypeId: serviceType._id,
        serviceTypeName: serviceType.name,
        pricingId: priceInfo.data.pricingData._id
      }
      const creatorData = {
        userId: auth.userId,
        role: auth.role,
        name: auth.name
      }
      const tripObj = {
        bookingData: bookingData,
        serviceData: serviceData,
        creatorData: creatorData,
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
        estimateData: estimateData
      }
      const responseData = await ServiceModule.sendRequest(tripObj)
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_REQUEST'
      )({
        message: 'TAXI_REQUEST_SENDED',
        requestId: responseData.tripdata._id,
        referenceNo: responseData.tripdata.referenceNo,
        isScheduleLater: responseData.tripdata.isScheduleLater
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateTripStops = async (req, res) => {
    try {
      const MultiStopModule = SettingsConfig.menulist.find(
        (item) => item.value === Enum.SETTINGS.MULTISTOPSETTING
      )

      if (!MultiStopModule.enabled) throw new Error('MULTISTOP_NOT_ENABLED')

      const body = req.body || {}
      let tripData = await ServiceModule.getTripdetails(body.requestId)
      if (tripData.length == 0) throw new Error('TRIP_NOT_FOUND')

      tripData = tripData[0]

      // Progress State For Multi Stop Trip
      const currentDate = new Date(Helpers.getISODate())
      const startLocation = tripData.partner.startLocation[1] + ',' + tripData.partner.startLocation[0]
      const endLocation = body.latitude + ',' + body.longitude
      let stopContent = body.stop
      const find = {
        _id: body.requestId
      }
      let update = {}
      let options = {}
      let notificationData = {}

      if (body.stop == 'end') stopContent = 'Final destination'

      const travelInfo = await MapServices.getLocationData([startLocation], [endLocation], {
        distanceMetric: tripData.distanceMetric
      })
      if (!travelInfo) throw new Error('DISTANCE_ESTIMATION_FAILED')
      // arrived at stop
      if (body.status == 0) {
        update = {
          $push: {
            'invoice.stops': {
              name: body.stop,
              address: travelInfo.data.destinationLabel,
              coords: [body.longitude, body.latitude],
              distanceLabel: travelInfo.data.distanceLabel,
              timeLabel: travelInfo.data.timeLabel,
              distance: travelInfo.data.distanceValue,
              time: travelInfo.data.timeValue,
              arrivedTime: currentDate
            }
          }
        }
        notificationData = {
          pushToken: tripData.customer?.fcmId || '',
          title: 'Ride',
          body: '',
          template: 'intermediateStopArrived',
          templateData: {
            stop: stopContent
          }
        }
      }
      // start from stop
      else if (body.status == 1) {
        const arrivedTime = tripData.invoice.stops.find((item) => item.name == body.stop).arrivedTime
        // update waiting when trip start
        update = {
          $set: { 'invoice.stops.$[elem].waitingTime': currentDate.getTime() - arrivedTime.getTime() }
        }
        options = {
          arrayFilters: [{ 'elem.name': body.stop }]
        }

        notificationData = {
          pushToken: tripData.customer?.fcmId || '',
          title: 'Ride',
          body: '',
          template: 'intermediateStopStart',
          templateData: {
            stop: 'Next stop'
          }
        }
      }
      await Trip.findOneAndUpdate(find, update, options)

      await NotifcationController.createNotification({
        processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
        data: notificationData
      })

      return requestHandler.sendSuccess(
        req,
        res,
        'TRIP_PROGRESS'
      )({
        message: 'IN_PROGRESS',
        requestId: tripData._id,
        referenceNo: tripData.referenceNo
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { MultistopController }
