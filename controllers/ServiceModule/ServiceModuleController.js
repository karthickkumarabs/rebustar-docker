/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'
import { Enum } from '../../utils/Enum.js'
import { Logger } from '../../utils/Logger.js'
import { RequestHandler } from '../../utils/RequestHandler.js'

import { ServiceConfig } from '../../config/ServiceConfig.js'
import { SettingsConfig } from '../../config/SettingsConfig.js'

import { Helpers } from '../../helpers/Function.js'

import Customer from '../../models/Auth/Customer.js'
import Partner from '../../models/Auth/Partner.js'
import ServiceArea from '../../models/Creteria/ServiceArea.js'
import ServiceType from '../../models/Creteria/ServiceType.js'
import Vehicle from '../../models/Creteria/Vehicle.js'
import ServiceTracker from '../../models/ServiceModule/ServiceTracker.js'
import Trip from '../../models/ServiceModule/Trip.js'
import { BaseController } from '../BaseController.js'
import { NotifcationController } from '../Notification/Index.js'
import { DailyModuleController as DailyModule } from './DailyModuleController.js'

import { TripValidator } from '../../validators/serviceModule/TripValidator.js'
import { OnebyoneController } from './OnebyoneController.js'

import { AuthendicationError, ServiceModuleError } from '../../utils/ErrorHandler.js'

import { AuthServices } from '../../services/Common/AuthService.js'
import { AuthValidator } from '../../validators/Common/AuthValidator.js'
import { heatMapValidator } from '../../validators/Creteria/heatMapValidator.js'

import { MapServices } from '../../modules/Map/index.js'
import { PaymentServices } from '../../modules/Payment/PaymentService.js'
import { CreteriaService } from '../../services/Creteria/CreteriaServices.js'
import { Config } from '../../config/AppConfig.js'
import { BulkAssignController } from './BulkAssignController.js'
import { RedisHelper } from '../../helpers/RedisHelper.js'
import { WalletController } from '../../modules/Payment/Wallet/WalletController.js'
import { CancelController } from '../../modules/Cancellation/controllers/CancelController.js'
import moment from 'moment'
// import Pricing from '../../models/Creteria/Pricing.js'
const RedisDB = new RedisHelper()

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ServiceModuleController extends BaseController {
  constructor() {
    super()
  }

  static getServices = async (req, res) => {
    try {
      const services = ServiceConfig.service
      const filterServices = services
        .filter(function (e) {
          return e.status === true
        })
        .map(function (e) {
          return e
        })
      return requestHandler.sendSuccess(req, res, 'GET_SERVICES')({ services: filterServices })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPlaces = async (req, res) => {
    try {
      const places = await Place.find({}).lean()
      return requestHandler.sendSuccess(req, res, 'GET_PLACES')({ data: places })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addPlaces = async (req, res) => {
    try {
      const body = req.body
      const validation = await TripValidator.validateData(body, 'addPlaces')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const checkPlaceExist = await Place.findOne({
        title: body.title,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude
      })

      if (checkPlaceExist) {
        throw new Error('PLACE_ALREADY_ADDED')
      }

      const data = new Place(body)
      await data.save()

      return requestHandler.sendSuccess(req, res, 'PLACES_ADDED')({ data })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getNearbyPartners = async (req, res) => {
    try {
      const body = req.query || {}
      const validation = await TripValidator.validateData(body, 'getNearbyPartners')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      // const location = body.latitude + ',' + body.longitude
      const locationArr = [parseFloat(body.longitude), parseFloat(body.latitude)]

      const serviceTypeQuery = {
        deletedAt: null
      }
      if (body.serviceTypeId) serviceTypeQuery['_id'] = mongoose.Types.ObjectId(body.serviceTypeId)

      const serviceAreaQuery = {
        deletedAt: null
      }

      if (Config.mode != 'development') {
        serviceAreaQuery['$and'] = [
          {
            polygon: {
              $geoIntersects: {
                $geometry: {
                  type: 'Point',
                  coordinates: locationArr
                }
              }
            }
          }
        ]
      }

      const serviceCity = await ServiceArea.findOne(serviceAreaQuery).lean().exec()

      if (!serviceCity) throw new ServiceModuleError('SERVICE_NOT_AVAILABLE')

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
          $project: {
            name: 1,
            topViewImage: 1
          }
        }
      ]).exec()
      if (!serviceTypesData || serviceTypesData.length <= 0) throw new Error('SERVICE_TYPE_NOT_AVAILABLE')
      const serviceTypeIds = serviceTypesData.map((serviceType) => serviceType._id)

      const requestRadius = ServiceConfig.basics.requestRadius
      const nearByDriver = await Partner.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              key: 'location',
              coordinates: locationArr
            },
            maxDistance: requestRadius,
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
            curService: { $in: serviceTypeIds },
            online: true,
            curStatus: 'free'
          }
        },
        {
          $limit: Number(body.limit) ? Number(body.limit) : 10
        },
        {
          $project: {
            location: 1,
            bearing: 1,
            distance: 1,
            curService: 1
          }
        }
      ]).exec()
      if (!nearByDriver || nearByDriver.length <= 0) throw new Error('PARTNERS_NOT_AVAILABLE')

      for (const partners of nearByDriver) {
        const findService = serviceTypesData.findIndex((i) => i._id.equals(partners.curService))
        if (findService >= 0) {
          partners['topViewImage'] = serviceTypesData[findService].topViewImage
          partners['serviceType'] = serviceTypesData[findService].name
        }
      }
      console.log('nearByDriver22222', nearByDriver.length)
      return requestHandler.sendSuccess(req, res, 'GET_NEARBY_PARTNERS')({ nearByPartners: nearByDriver })
    } catch (error) {
      // console.log("err",error);
      return requestHandler.sendError(req, res, error)
    }
  }

  static getEstimation = async (req, res) => {
    try {
      const body = req.query || {}
      const pickupLocation = body.pickupLat + ',' + body.pickupLng
      const dropLocation = body.dropLat + ',' + body.dropLng
      // const coupon = body.couponcode
      const requestTime = body.time || Helpers.getISODate()
      let coupon = null

      const serviceTypeQuery = {
        deletedAt: null
      }

      const serviceAreaQuery = {
        deletedAt: null
      }
      // if (Config.mode != 'development') {
      const pickupLocationArr = [body.pickupLng, body.pickupLat]
      const dropLocationArr = [body.dropLng, body.dropLat]
      serviceAreaQuery['$and'] = [
        {
          polygon: {
            $geoIntersects: {
              $geometry: {
                type: 'Point',
                coordinates: pickupLocationArr
              }
            }
          }
        },
        {
          polygon: {
            $geoIntersects: {
              $geometry: {
                type: 'Point',
                coordinates: dropLocationArr
              }
            }
          }
        }
      ]
      // }
      const serviceCity = await ServiceArea.findOne(serviceAreaQuery).lean().exec()
      console.log('servicecity_in_estimation', serviceCity)
      if (!serviceCity) throw new ServiceModuleError('SERVICE_NOT_AVAILABLE')
      let travelInfo
      let MultiStopModule

      if (body.type == 'DAILY-MULTISTOP') {
        MultiStopModule = SettingsConfig.menulist.find(
          (item) => item.value === Enum.SETTINGS.MULTISTOPSETTING
        )
        if (!MultiStopModule.enabled) throw new ServiceModuleError('MULTISTOP_NOT_ENABLED')

        const validation = await TripValidator.validateData(
          { stops: JSON.parse(body.stops) },
          'getMultiStopEstimation'
        )
        if (!validation.status) return requestHandler.sendError(req, res, validation.data)

        travelInfo = await MapServices.getMultipleLocationData(JSON.parse(body.stops))
        if (!travelInfo.status) throw new ServiceModuleError('DISTANCE_ESTIMATE_FAILED')
      } else {
        const validation = await TripValidator.validateData(body, 'getEstimation')
        if (!validation.status) return requestHandler.sendError(req, res, validation.data)
        travelInfo = await MapServices.getLocationData([pickupLocation], [dropLocation])
        if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
      }

      const unitDistance = travelInfo.data?.unitDistance || travelInfo.data.distanceValue
      const distanceMetric = travelInfo.data.distanceMetric || Config.app.distanceMetric
      const timeMetric = travelInfo.data.timeMetric || Config.app.timeMetric
      const unitTime = travelInfo.data?.unitTime || travelInfo.data.timeValue

      console.log('unitDistance', unitDistance, unitTime)

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
                    coordinates: [parseFloat(body.pickupLng), parseFloat(body.pickupLat)]
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
            nearByVehicles: { $ifNull: ['$nearByVehicles', []] },
            bidding: '$pricingData.additional.bidding'
          }
        }
      ]).exec()
      const serviceTypes = []

      console.log('result', JSON.stringify(serviceTypesData))
      for (const serviceType of serviceTypesData) {
        const priceInfo = await DailyModule.getPricing({
          unitDistance: unitDistance,
          unitTime: unitTime,
          requestTime: requestTime,
          pricingId: serviceType.pricingId,
          coupon: coupon,
          companycommission: 0,
          estimationObj: {}
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
          bidding: serviceType.bidding,

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
        if (
          SettingsConfig.menulist.find(
            (item) => item.value == Enum.SETTINGS.BIDDINGSETTING && item.enabled == true
          )
        ) {
          const bidamount = Number(
            priceInfo.data.estimation.totalFare ? priceInfo.data.estimation.totalFare : 0
          )
          const minimumBiddingAmount =
            bidamount - Number((Number(serviceType.bidding?.minimumAmountinpercentage) / 100) * bidamount)
          const maximumBiddingAmount =
            bidamount + Number((Number(serviceType.bidding?.maximumAmountinpercentage) / 100) * bidamount)
          serviceType['vehicleDetails'].bidding.minimumAmountinpercentage = minimumBiddingAmount
          serviceType['vehicleDetails'].bidding.maximumAmountinpercentage = maximumBiddingAmount
        }
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
          timeMetric,
          ...(MultiStopModule?.enabled && { stops: travelInfo.data?.stops || [] })
        }
      })
    } catch (error) {
      console.error('GET_ESTIMATION_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static changeDestination = async (req, res) => {
    try {
      const body = req.body || {}
      const auth = req.auth || {}
      const validation = await TripValidator.validateData(body, 'changeDestination')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const tripData = await Trip.findOne({
        _id: body.requestId,
        status: {
          $nin: [Enum.TRIP.STATUS.FINISHED, Enum.TRIP.STATUS.CANCELLED]
        }
      })
      if (!tripData) throw new Error('CANNOT_PROCEED')

      const pickupLocation = tripData.estimation.startcoords[1] + ',' + tripData.estimation.startcoords[0]
      const dropLocation = body.latitude + ',' + body.longitude

      let customerId
      if (auth.role == Enum.ROLES.ADMIN) {
        customerId = req.body.id
      } else {
        customerId = auth.userId
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

      const customerData = await Customer.findOne({ _id: customerId }).exec()
      if (!customerData) throw new Error('NOT_FOUND|CUSTOMER')

      const travelInfo = await MapServices.getLocationData([pickupLocation], [dropLocation])
      if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')

      const unitDistance = travelInfo.data.distanceValue
      const unitTime = travelInfo.data.timeValue
      const scheduleOn = tripData.scheduleOn

      // scheduleOn.setTime(scheduleOn.getTime() + 30 * 60 * 1000)
      scheduleOn.setSeconds(0)

      const priceInfo = await DailyModule.getPricing({
        unitDistance: unitDistance,
        unitTime: unitTime,
        requestTime: scheduleOn,
        pricingId: tripData.servicePricing,
        coupon: tripData.estimation.coupon
      })
      if (!priceInfo.status) throw new Error(priceInfo.message)
      const estimateData = {
        distance: unitDistance,
        estTime: unitTime,
        start: travelInfo.data.originLabel,
        end: travelInfo.data.destinationLabel,
        startcoords: [tripData.estimation.startcoords[0], tripData.estimation.startcoords[1]],
        endcoords: [body.longitude, body.latitude],
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
      tripData.pricingId = priceInfo.data.pricingData._id
      await tripData.save()
      const data = {
        flow: '15',
        tripId: tripData._id,
        referenceNo: tripData.referenceNo,
        tripStatus: tripData.status,
        destinationChanged: true,
        customerId: tripData.customer.id,
        customerStatus: 'inTrip'
      }
      await Helpers.tripFlowHandlerFB(data)
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

  static initializePayment = async (data) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_PAYMENT'
    }
    try {
      const { requestId } = data
      const tripData = await Trip.findOne({ _id: requestId }).exec()
      console.log('initializePayment', tripData)
      let paymentStatus = Enum.TRIP.PAYMENT_STATUS.UNPAID
      if (!tripData) throw new Error('TRIP|NOT_FOUND')
      const commision = Helpers.roundOff(tripData.invoice.earnings + tripData.invoice.companycommission)
      let paymentMode =
        tripData.paymentMethod == Enum.TRIP.PAYMENT_MODE.CASH
          ? Enum.PAYMENT.MODE.DEBIT
          : Enum.PAYMENT.MODE.CREDIT
      let amount =
        tripData.paymentMethod == Enum.TRIP.PAYMENT_MODE.CASH ? commision : tripData.invoice.payable
      if (tripData.paymentMethod == Enum.TRIP.PAYMENT_MODE.CASH) {
        tripData.paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID
        paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID
        await tripData.save()
      } else if (tripData.paymentMethod == Enum.TRIP.PAYMENT_MODE.WALLET) {
        const walletpayment = await WalletController.DeductwalletAmount(tripData)
        console.log('walletpayment', walletpayment)

        if (walletpayment.success == false) throw new Error(walletpayment.message)
        tripData.paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID
        paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID
        paymentMode = walletpayment.paymentMode
        amount = walletpayment.payableToDriver
        await tripData.save()
      } else {
        const merchantPayment = await PaymentServices.merchantPayment({
          userId: tripData.customer.id,
          userType: Enum.ROLES.CUSTOMER,
          referenceId: tripData._id,
          paymentMethod: tripData.paymentMethod,
          paymentMethodId: tripData.paymentMethodId,
          amount: tripData.invoice.totalFare,
          currency: tripData.currencyCode,
          description: 'TRIP_PAYMENT' + tripData._id
        })
        if (!merchantPayment?.status) throw new Error(merchantPayment.message)
        if (merchantPayment.data.paymentStatus) {
          tripData.paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID
          paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID
          await tripData.save()
        } else {
          tripData.paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID
          tripData.paymentMethod = Enum.TRIP.PAYMENT_MODE.CASH
          await tripData.save()
          paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID

          const customer = Customer.findOne({ _id: tripData.customer.id }, { fcmId: 1 }).lean().exec()
          const partner = Partner.findOne({ _id: tripData.partner.id }, { fcmId: 1 }).lean().exec()
          await NotifcationController.createNotification({
            processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
            data: {
              pushToken: customer.fcmId,
              title: 'Ride',
              body: '',
              template: 'paymentCustomerFailure',
              templateData: {}
            }
          })
          await NotifcationController.createNotification({
            processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
            data: {
              pushToken: partner.fcmId,
              title: 'Ride',
              body: '',
              template: 'paymentPartnerFailure',
              templateData: {}
            }
          })
        }
      }

      // Settlement to Driver
      const transactionData = {
        referenceId: tripData._id,
        description: 'TRIP_PAYMENT' + tripData._id,
        paymentMode: paymentMode,
        userId: tripData.partner.id,
        userType: Enum.ROLES.PARTNER,
        serviceArea: tripData.serviceArea,
        amount: amount
      }
      console.log('transactionData', transactionData)

      const transferAmountToPartner = await PaymentServices.merchantTransaction(transactionData)
      if (!transferAmountToPartner.status) {
        throw new Error(transferAmountToPartner.message)
      }
      response = {
        status: true,
        data: {
          paymentStatus: paymentStatus
        },
        message: 'PAYMENT_SUCCESS'
      }
    } catch (error) {
      console.error('INITIALIZE_PAYMENT_ERROR', error)
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }
  static sendRequest = async (tripRequestdata) => {
    const response = {
      success: true,
      code: 200
    }

    const {
      bookingData,
      creatorData,
      customerData,
      serviceData,
      estimateData,
      additionalData = {}
    } = tripRequestdata

    const newTrip = new Trip({
      module: bookingData.type,
      requestFrom: bookingData.requestFrom,

      scheduleOn: new Date(bookingData.scheduleOn).toUTCString(),
      timeZone: bookingData.timeZone,
      isScheduleLater: bookingData.isScheduleLater || false,

      distanceMetric: bookingData.distanceMetric,
      currencyCode: bookingData.currencyCode || Config.app.currencyCode,
      currency: bookingData.currency || Config.app.currency,
      paymentMethod: bookingData.paymentMethod || Enum.TRIP.PAYMENT_MODE.CASH,
      paymentMethodId: bookingData.paymentMethodId || '',

      serviceArea: serviceData.serviceAreaId,
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
        myRating: customerData.ratings,
        requestPin: Helpers.sendRandomizeCode('0', 4),
        experience: customerData.experience || 0
      },
      events: [
        {
          userId: creatorData.userId,
          userType: creatorData.role,
          userName: creatorData.name,
          category: 'Processing',
          description: ''
        }
      ],
      estimation: estimateData,
      invoice: {},
      status: Enum.TRIP.STATUS.REQUESTED,
      Bidding: bookingData.Bidding || false,
      additionalDetails: additionalData
    })
    const tripdata = await newTrip.save()
    if (!tripdata.isScheduleLater) {
      const data = {
        flow: '0',

        tripId: tripdata._id,
        referenceNo: tripdata.referenceNo,
        tripStatus: tripdata.status,

        customerId: tripdata.customer.id,
        customerStatus: 'inTrip'
      }
      this.updateCustomerTripInDB(tripdata.customer.id, tripdata._id, 'Processing')
      await Helpers.tripFlowHandlerFB(data)
      if (ServiceConfig.basics.partnerAssigmentType == 'Bulk') {
        BulkAssignController.findPartners(tripdata)
      } else await OnebyoneController.findPartners(tripdata)
    }
    response.tripdata = tripdata
    return response
  }

  static getRequestDetails = async (req, res) => {
    try {
      const authData = req.auth
      console.log('authData', authData)
      let cancelReasons = []
      let feedBacks = []
      let tripId = null
      if (req.query.id) {
        tripId = req.query.id || null
      } else if (authData.role == Enum.ROLES.PARTNER) {
        const partnerData = await Partner.findOne({ _id: mongoose.Types.ObjectId(authData.userId) }).exec()
        tripId = partnerData.curTrip
      } else if (authData.role == Enum.ROLES.CUSTOMER) {
        const customerData = await Customer.findOne({ _id: mongoose.Types.ObjectId(authData.userId) }).exec()
        tripId = customerData.curTrip
      }

      if (!tripId) throw new ServiceModuleError('NOT_FOUND|TRIP')

      const tripdata = await Trip.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(tripId)
          }
        },
        {
          $lookup: {
            from: 'partners',
            localField: 'partner.id',
            foreignField: '_id',
            as: 'partnersData'
          }
        },
        {
          $unwind: {
            path: '$partnersData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'customer.id',
            foreignField: '_id',
            as: 'customersData'
          }
        },
        {
          $unwind: {
            path: '$customersData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'vehicles',
            localField: 'partner.vehicle',
            foreignField: '_id',
            as: 'vehiclesData'
          }
        },
        {
          $unwind: {
            path: '$vehiclesData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'servicetypes',
            localField: 'serviceType',
            foreignField: '_id',
            as: 'serviceTypeData'
          }
        },
        {
          $unwind: {
            path: '$serviceTypeData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            referenceNo: 1,
            module: 1,
            requestFrom: 1,
            scheduleOn: 1,
            timeZone: 1,
            currency: 1,
            paymentMethod: 1,
            service: 1,
            vehicle: 1,
            customer: 1,
            partner: 1,
            partnerList: 1,
            estimation: 1,
            invoice: 1,
            review: 1,
            routeImage: 1,
            status: 1,
            serviceType: 1,
            serviceTypeName: 1,
            additionalDetails: 1,
            distanceMetric: 1,
            vehicleImage: { $ifNull: ['$serviceTypeData.image', ''] },
            topViewImage: { $ifNull: ['$serviceTypeData.topViewImage', ''] },
            partnerProfile: { $ifNull: ['$partnersData.profile', ''] },
            partnerPhoneCode: { $ifNull: ['$partnersData.phoneCode', ''] },
            partnerPhone: { $ifNull: ['$partnersData.phone', ''] },
            customerProfile: { $ifNull: ['$customersData.profile', ''] },
            customerPhoneCode: { $ifNull: ['$customersData.phoneCode', ''] },
            customerPhone: { $ifNull: ['$customersData.phone', ''] },
            partnerRating: { $ifNull: ['$partnersData.ratings', ''] },
            customerRating: { $ifNull: ['$customersData.ratings', ''] },
            shareLink: Config.productLinks.shareTrip + tripId,
            Bidding: 1
            // vehicleRegistrationNumber: { $ifNull: ['$vehiclesData.registrationnumber', 'TN58Z1234'] },
          }
        }
      ])
      const requestData = tripdata[0]
      cancelReasons =
        authData?.role === Enum.ROLES.PARTNER
          ? ServiceConfig.cancelReasons.partner
          : ServiceConfig.cancelReasons.customer
      console.log('cancelReasons', cancelReasons, 'ROLE', authData?.role)
      feedBacks =
        authData?.role === Enum.ROLES.PARTNER
          ? ServiceConfig.feedBacks.partner
          : ServiceConfig.feedBacks.customer
      console.log('feedBacks', feedBacks, 'ROLE', authData?.role)

      const tracker = await ServiceTracker.findOne(
        { requestId: mongoose.Types.ObjectId(tripId) },
        { lastcoords: 1, bearing: 1 }
      )
        .lean()
        .exec()

      const response = { requestData, tracker, cancelReasons, feedBacks }
      if (authData.role == Enum.ROLES.PARTNER) {
        const checkPartnerindex = await requestData.partnerList.findIndex((i) =>
          i.partnerId.equals(authData.userId)
        )
        response['requestTime'] =
          checkPartnerindex != -1 ? requestData.partnerList[checkPartnerindex].requestTime : null
        // console.log('requestTime', response['requestTime'])
        response['tripRequestTime'] = ServiceConfig.basics.acceptDuration
      }
      return requestHandler.sendSuccess(req, res, 'GET_REQUEST_DETAILS')(response)
    } catch (error) {
      console.log('GET_REQUEST_DETAILS_ERROR: ', error)
      return requestHandler.sendError(req, res, { message: error.message, status: 503 })
    }
  }

  static getPartnerRequestDetails = async (req, res) => {
    try {
      const authData = req.auth
      console.log('partnerId', authData.userId)
      const tripdata = await Partner.aggregate([
        {
          $match: {
            _id: authData.userId
          }
        },
        {
          $unwind: {
            path: '$tripRequests',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'trips',
            localField: 'tripRequests.tripId',
            foreignField: '_id',
            as: 'tripsData'
          }
        },
        {
          $unwind: {
            path: '$tripsData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            'tripsData._id': { $ne: null }
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'tripsData.customer.id',
            foreignField: '_id',
            as: 'customersData'
          }
        },
        {
          $unwind: {
            path: '$customersData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            tripId: '$tripsData._id',
            currency: '$tripsData.currency',
            pickupLocation: '$tripsData.estimation.start',
            pickupCoords: '$tripsData.estimation.startcoords',
            dropLocation: '$tripsData.estimation.end',
            dropCoords: '$tripsData.estimation.endcoords',
            estTime: '$tripsData.estimation.estTime',
            totalTripDistance: '$tripsData.estimation.distance',
            totalFare: '$tripsData.estimation.totalFare',
            comment: '$tripsData.comment',
            customerName: '$customersData.fname',
            customerProfile: '$customersData.profile',
            customerRating: '$customersData.ratings',
            stops: '$tripsData.estimation.stops',
            packageName: { $ifNull: ['$tripsData.additionalDetails.packagename', ''] },
            tripModule: '$tripsData.module',
            partnerInfo: {
              $let: {
                vars: {
                  matchedPartner: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$tripsData.partnerList',
                          as: 'partner',
                          cond: { $eq: ['$$partner.partnerId', authData.userId] }
                        }
                      },
                      0
                    ]
                  }
                },
                in: {
                  $mergeObjects: [
                    '$$matchedPartner',
                    {
                      distance: {
                        $cond: [
                          { $ifNull: ['$$matchedPartner.distance', false] },
                          { $round: [{ $divide: ['$$matchedPartner.distance', 1000] }, 1] },
                          null
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      ])
      let updatedTripData = tripdata
      let hasTrip = false
      if (updatedTripData.length) {
        hasTrip = true
        updatedTripData = tripdata.map((data) => {
          data['tripRequestTime'] = ServiceConfig.basics.acceptDuration
          return data
        })
      }
      return requestHandler.sendSuccess(req, res, 'GET_REQUEST_DETAILS')(updatedTripData, { hasTrip })
    } catch (error) {
      console.log('GET_REQUEST_DETAILS_ERROR: ', error)
      return requestHandler.sendError(req, res, { message: error.message, status: 503 })
    }
  }

  /**
   * Partner Accepted/Declined the Request
   * @input
   * @param
   * @return
   * @response
   */
  static patchRequestStatus = async (req, res) => {
    try {
      const body = req.body || {}
      let response = {}

      console.log('body', body)

      const validation = await TripValidator.validateData(body, 'patchRequestStatus')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const actionStatus = body.status == 'accept' ? 'Accepted' : 'Declined'
      const tripData = await Trip.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(body.requestId),
            'partnerList.partnerId': req.auth.userId
            // status: Enum.TRIP.STATUS.PROCESSING,
            // 'partnerList.$.status': Enum.TRIP.STATUS.CALLED,
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'customer.id',
            foreignField: '_id',
            as: 'customersData'
          }
        },
        {
          $unwind: {
            path: '$customersData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            module: 1,
            referenceNo: 1,
            estimation: 1,
            status: 1,
            serviceTypeName: 1,
            partnerList: 1,
            customer: {
              id: 1,
              name: 1,
              experience: 1,
              myRating: 1,
              profile: 1,
              currency: '$customersData.currency',
              language: '$customersData.language',
              phone: '$customersData.phone',
              phoneCode: '$customersData.phoneCode',
              email: '$customersData.email',
              fcmId: '$customersData.fcmId'
            }
          }
        }
      ])
      if (!tripData.length) throw new ServiceModuleError('REQUEST_NOT_EXISTS')
      if (actionStatus == 'Accepted') {
        const requestLock = await RedisDB.__acquireRequestLock(tripData[0]._id, req.auth.userId)
        console.log('requestLock---', requestLock)
        if (!requestLock) throw new Error('REQUEST_ALREADY_PROCESSESD_BY_SOMEONE')
        if (tripData[0].status != Enum.TRIP.STATUS.PROCESSING)
          throw new ServiceModuleError('REQUEST_ALREADY_PROCESSED')

        const partnerData = await Partner.findOne({ _id: req.auth.userId }).exec()
        if (!partnerData) throw new AuthendicationError('NOT_FOUND|PARTNER')

        const vehicleInfo = await Vehicle.findOne({ _id: partnerData.activeVechicle }).exec()
        if (!vehicleInfo) throw new AuthendicationError('NOT_FOUND|VEHICLE')

        const experience = Helpers.getDateDifference(new Date(partnerData.createdAt), new Date())

        const updateAccept = {
          status: Enum.TRIP.STATUS.ACCEPTED,
          companyId: partnerData.companyId,
          needClear: false,
          'partner.id': req.auth.userId,
          'partner.name': partnerData.fname,
          'partner.code': partnerData.uniCode,
          'partner.email': partnerData.email,
          'partner.phoneNo': partnerData.phone,
          'partner.phoneCode': partnerData.phoneCode,
          'partner.profile': partnerData.profile,
          'partner.vehicle': vehicleInfo._id,
          'partner.vehicleNo': vehicleInfo.registrationnumber,
          'partner.serviceType': vehicleInfo.servicetype,
          'partner.serviceTypeName': tripData[0].serviceTypeName,
          'partner.experience': experience?.accuracy || 0,
          'partner.myRating': partnerData.ratings.totalValue,
          'partner.acceptTime': Helpers.getISODate(),
          'partner.acceptLocation': [body.lng || 0.0, body.lat || 0.0],
          'partner.subscriptionStatus': partnerData?.payment?.subscriptionStatus || false,
          $set: {
            'partnerList.$.status': Enum.TRIP.STATUS.ACCEPTED
          }
        }
        const checkUpdate = await Trip.findOneAndUpdate(
          {
            _id: body.requestId,
            status: { $in: [Enum.TRIP.STATUS.NORESPONSE, Enum.TRIP.STATUS.PROCESSING] },
            'partnerList.partnerId': req.auth.userId
          },
          updateAccept,
          { new: true }
        )
          .lean()
          .exec()
        if (!checkUpdate) throw new ServiceModuleError('SERVER_CANT_UPDATE')

        if (checkUpdate.module == 'DAILY-MULTISTOP') {
          const stops = checkUpdate.estimation.stops.map((item, index) => ({
            index,
            name:
              index === 0
                ? 'START'
                : index === checkUpdate.estimation.stops.length - 1
                ? 'DESTINATION'
                : 'STOP',
            address: index === 0 ? item.address : '',
            coords: index === 0 ? item.coords : [0, 0],
            status: index === 0 ? 'COMPLETED' : 'PENDING',
            arrivedTime: null,
            startTime: null,
            waitingTime: 0,
            distance: 0,
            time: 0
          }))
          await Trip.findOneAndUpdate(
            { _id: body.requestId },
            {
              'invoice.stops': stops,
              'invoice.stopCurrentIndex': 1
            },
            { new: true }
          )
        }
        this.updatePartnerTripInDB(req.auth.userId, tripData[0]._id, Enum.TRIP.STATUS.ACCEPTED)
        console.log(
          'inise',
          tripData[0].customer.id,
          'tripData[0]._id',
          tripData[0]._id,
          'status',
          Enum.TRIP.STATUS.ACCEPTED
        )
        if (ServiceConfig.basics.allowMultipleRequestToPartner) {
          await Partner.findOneAndUpdate(
            { _id: mongoose.Types.ObjectId(req.auth.userId) },
            {
              $pull: {
                tripRequests: {
                  tripId: mongoose.Types.ObjectId(body.requestId)
                }
              }
            }
          )
        }
        this.updateCustomerTripInDB(tripData[0].customer.id, tripData[0]._id, Enum.TRIP.STATUS.ACCEPTED)
        await Helpers.tripFlowHandlerFB({
          flow: '2',

          referenceNo: tripData[0].referenceNo,
          tripId: tripData[0]._id,
          tripStatus: Enum.TRIP.STATUS.ACCEPTED,

          customerId: tripData[0].customer.id,

          partnerId: req.auth.userId,
          partnerStatus: 'inTrip'
        })
        await NotifcationController.createNotification({
          processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
          data: {
            pushToken: tripData[0].customer.fcmId,
            title: 'Ride',
            body: '',
            template: 'partnerAccept',
            templateData: {}
          }
        })
        if (ServiceConfig.basics.partnerAssigmentType == 'Bulk') {
          await BulkAssignController.updatePartnerTripNoresponseinDb(tripData[0], req.auth.userId)
        }
        response = {
          requestId: body.requestId,
          status: 'Accepted',
          tripType: tripData[0].module,
          customer: tripData[0].customer,
          shareLink: Config.productLinks.shareTrip + tripData[0]._id,
          pickupdetails: {
            distance: tripData[0].estimation.distance,
            estimateTime: tripData[0].estimation.estTime,
            start: tripData[0].estimation.start,
            end: tripData[0].estimation.end,
            startcoords: tripData[0].estimation.startcoords,
            endcoords: tripData[0].estimation.endcoords
          }
        }
      } else {
        const checkUpdate = await Trip.findOneAndUpdate(
          {
            _id: body.requestId,
            // status: { $in: ['Noresponse', 'Processing'] },
            'partnerList.partnerId': req.auth.userId
          },
          {
            $set: {
              'partnerList.$.status': Enum.TRIP.STATUS.DECLINED
            }
          },
          { new: true }
        )
          .lean()
          .exec()
        if (!checkUpdate) throw new ServiceModuleError('SERVER_CANT_UPDATE')

        // Determine if partner has other pending requests besides this one
        const partnerBeforeDecline = await Partner.findOne(
          { _id: req.auth.userId },
          { tripRequests: 1 }
        ).lean()
        const hasOtherRequests =
          ServiceConfig.basics.allowMultipleRequestToPartner &&
          (partnerBeforeDecline?.tripRequests || []).filter(
            (r) => r.tripId.toString() !== body.requestId.toString()
          ).length > 0

        // Only free driver entirely if no other trip requests remain

        console.log('other request', hasOtherRequests)
        if (!hasOtherRequests) {
          console.log('partner profile')
          this.updatePartnerTripInDB(req.auth.userId)
        }

        if (ServiceConfig.basics.allowMultipleRequestToPartner) {
          await Partner.findOneAndUpdate(
            { _id: req.auth.userId },
            {
              $pull: {
                tripRequests: {
                  tripId: body.requestId
                }
              }
            }
          )
        }

        await Helpers.tripFlowHandlerFB({
          flow: '6',

          tripId: tripData[0]._id,
          // referenceNo: tripData[0].referenceNo,
          // tripStatus: 'Declined',

          partnerId: req.auth.userId,

          customerId: tripData[0].customer.id,
          status: hasOtherRequests ? Enum.TRIP.STATUS.REQUESTED : 'free'
        })
        if (ServiceConfig.basics.partnerAssigmentType == 'OnebyOne') {
          if (tripData[0].status == Enum.TRIP.STATUS.PROCESSING)
            OnebyoneController.callTheOBOLoop(tripData[0]._id)
        }
        response = {
          requestId: body.requestId,
          status: 'Declined'
        }
      }
      this.pushTheEvent(tripData[0]._id, req.auth.userId, req.auth.role, req.auth.name, actionStatus, '')
      return requestHandler.sendSuccess(req, res, actionStatus)(response)
    } catch (error) {
      console.error('PATCH_REQUEST_STATUS', error)
      return requestHandler.sendError(req, res, { message: error.message, status: 503 })
    }
  }
  /**
   * Trip Current Status Update from Partner
   * @input
   * @param
   * @return
   * @response
   */
  static updateRequest = async (tripObj) => {
    const response = {
      success: true,
      code: 200,
      msg: '',
      status: ''
    }
    // If Partner Arrived
    if (tripObj.body.status == 1) {
      if (tripObj.tripdata[0].status == 'Arrived' && tripObj.tripdata[0].status != 'Accepted')
        throw new ServiceModuleError('TRIP_ALREADY_PROCESSED')
      else {
        await Trip.updateOne(
          { _id: tripObj.tripdata[0]._id },
          {
            $set: {
              status: Enum.TRIP.STATUS.ARRIVED,
              'partner.arriveTime': Helpers.getISODate(),
              'partner.arriveLocation': [tripObj.body.longitude, tripObj.body.latitude],
              additionalDetails: {
                lastCoords: [tripObj.body.longitude, tripObj.body.latitude]
              }
            }
          }
        )
        this.pushTheEvent(
          tripObj.tripdata[0]._id,
          tripObj.auth.userId,
          tripObj.auth.role,
          tripObj.auth.name,
          'Arrived',
          ''
        )

        this.updatePartnerTripInDB(tripObj.tripdata[0].partner.id, tripObj.tripdata[0]._id, 'Arrived')
        this.updateCustomerTripInDB(tripObj.tripdata[0].customer.id, tripObj.tripdata[0]._id, 'Arrived')

        await Helpers.tripFlowHandlerFB({
          flow: '3',

          tripId: tripObj.tripdata[0]._id,
          referenceNo: tripObj.tripdata[0].referenceNo,
          tripStatus: 'Arrived',

          customerId: tripObj.tripdata[0].customer.id,

          partnerId: tripObj.tripdata[0].partner.id
        })
        await NotifcationController.createNotification({
          processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
          data: {
            pushToken: tripObj.tripdata[0].customer.fcmId,
            title: 'Ride',
            body: '',
            template: 'partnerArrive',
            templateData: {}
          }
        })
        response.msg = 'PARTNER_ARRIVED'
        response.status = 'Arrived'
        return response
      }
    } // If Partner Trip Started : Progress
    else if (tripObj.body.status == 2) {
      if (tripObj.tripdata[0].status == 'Progress' && tripObj.tripdata[0].status != 'Arrived')
        throw new ServiceModuleError('TRIP_ALREADY_PROCESSED')
      else {
        tripObj.body.startTime = Helpers.getISODate() // Need to do customization for admin
        if (!tripObj.body.fromAddress) tripObj.body.fromAddress = tripObj.tripdata[0].estimation.start
        if (!tripObj.body.pickupLat) tripObj.body.pickupLat = tripObj.tripdata[0].estimation.startcoords[1]
        if (!tripObj.body.pickupLng) tripObj.body.pickupLng = tripObj.tripdata[0].estimation.startcoords[0]

        await Trip.updateOne(
          { _id: tripObj.tripdata[0]._id },
          {
            $set: {
              'partner.startTime': tripObj.body.startTime,
              'partner.startLocation': [tripObj.body.longitude, tripObj.body.latitude],
              status: Enum.TRIP.STATUS.PROGRESS,
              additionalDetails: tripObj.additionalObj ?? tripObj.tripdata[0].additionalDetails
            }
          }
        )
        this.pushTheEvent(
          tripObj.tripdata[0]._id,
          tripObj.auth.userId,
          tripObj.auth.role,
          tripObj.auth.name,
          'Progress',
          ''
        )

        this.updatePartnerTripInDB(tripObj.tripdata[0].partner.id, tripObj.tripdata[0]._id, 'Progress')
        this.updateCustomerTripInDB(tripObj.tripdata[0].customer.id, tripObj.tripdata[0]._id, 'Progress')

        await Helpers.tripFlowHandlerFB({
          flow: '4',

          tripId: tripObj.tripdata[0]._id,
          referenceNo: tripObj.tripdata[0].referenceNo,
          tripStatus: 'Progress',

          customerId: tripObj.tripdata[0].customer.id,
          partnerId: tripObj.tripdata[0].partner.id
        })
        await NotifcationController.createNotification({
          processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
          data: {
            pushToken: tripObj.tripdata[0].customer.fcmId,
            title: 'Ride',
            body: '',
            template: 'partnerStart',
            templateData: {}
          }
        })
        response.msg = 'TRIP_STARTED'
        response.status = 'Progress'
        return response
      }
    }
    // If Partner Trip Ended : Complete
    else if (tripObj.body.status == 3) {
      if (tripObj.tripdata[0].status == 'Finished' && tripObj.tripdata[0].status != 'Progress')
        throw new ServiceModuleError('TRIP_ALREADY_PROCESSED')
      else {
        tripObj.body.endTime = Helpers.getISODate()
        const tripDataUpdated = await Trip.findOneAndUpdate(
          { _id: tripObj.tripdata[0]._id },
          {
            $set: {
              'partner.endTime': tripObj.body.endTime,
              'partner.endLocation': [tripObj.body.longitude, tripObj.body.latitude],
              invoice: tripObj.getInvoice.data.invoiceData,
              routeImage: tripObj.getInvoice.data.routeImage,
              status: Enum.TRIP.STATUS.FINISHED,
              additionalDetails: tripObj.additionalObj ?? {}
            }
          },
          { new: true }
        )
        this.pushTheEvent(
          tripObj.tripdata[0]._id,
          tripObj.auth.userId,
          tripObj.auth.role,
          tripObj.auth.name,
          'Finished',
          ''
        )
        this.updatePartnerTripInDB(tripObj.tripdata[0].partner.id, tripObj.tripdata[0]._id, 'Finished')
        this.updateCustomerTripInDB(tripObj.tripdata[0].customer.id, tripObj.tripdata[0]._id, 'Finished')

        const getPayment = await this.initializePayment({ requestId: tripObj.tripdata[0]._id })
        const paymentStatus = getPayment?.data?.paymentStatus || Enum.TRIP.PAYMENT_STATUS.UNPAID

        await Helpers.tripFlowHandlerFB({
          flow: '5',

          tripId: tripObj.tripdata[0]._id,
          referenceNo: tripObj.tripdata[0].referenceNo,
          tripStatus: 'Finished',

          partnerId: tripObj.tripdata[0].partner.id,
          partnerStatus: 'free',

          customerId: tripObj.tripdata[0].customer.id,
          customerStatus: 'free'
        })
        await NotifcationController.createNotification({
          processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
          data: {
            pushToken: tripObj.tripdata[0].customer.fcmId,
            title: 'Ride',
            body: '',
            template: 'partnerEnd',
            templateData: {}
          }
        })

        console.log('JSON.STRINGFY_', JSON.stringify(tripObj))
        await NotifcationController.createNotification({
          processType: [Enum.NOTIFICATION.TYPE.MAIL],
          data: {
            email: tripObj.tripdata[0].customer?.email,
            subject: 'Trip Invoice',
            contentdata: {
              TOTAL_FARE: tripObj.getInvoice.data.invoiceData.totalFare,
              TRIP_NO: tripObj.tripdata[0].referenceNo,
              TRIP_DATE: moment(tripObj.tripdata[0].tripDT).format('YYYY/MM/DD'),
              ACTUAL_FARE: tripObj.getInvoice.data.invoiceData.actualFare,
              ADDITIONAL_FARE: tripObj.getInvoice.data.invoiceData.additionalFare,
              TRIP_ST: moment(tripObj.tripdata[0].partner.startTime).format('YYYY/MM/DD h:mm a'),
              TRIP_ET: moment(tripObj.body.endTime).format('YYYY/MM/DD h:mm a'),
              TRIP_START: tripObj.getInvoice.data.invoiceData.start,
              TRIP_END: tripObj.getInvoice.data.invoiceData.end,
              TRIP_DISTANCE: tripObj.getInvoice.data.invoiceData.distance,
              TRIP_TIME: tripObj.getInvoice.data.invoiceData.estTime
            }
          }
        })
        response.msg = 'TRIP_FINISHED'
        response.status = 'FINISHED'
        response.tripDataUpdated = tripDataUpdated
        response.paymentStatus = paymentStatus
        return response
      }
    } // If Partner Trip Ended : Complete Else End
    else {
      throw new AuthendicationError('CHECK_YOUR_STATUS')
    }
  }

  /**
   * Get Feedback from both CUSTOMER & PARTNER
   * @input
   * @param
   * @return
   * @response
   */
  static feedBack = async (req, res) => {
    try {
      const body = req.body || {}
      console.log('body', body)
      const auth = req.auth || {}
      const validation = await TripValidator.validateData(body, 'feedBack')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      if (!mongoose.Types.ObjectId.isValid(body.requestId)) {
        throw new Error('Invalid requestId')
      }
      const tripData = await Trip.findOne({ _id: mongoose.Types.ObjectId(body.requestId) }).exec()
      if (!tripData) return requestHandler.sendError(req, res, 'NO_TRIP_FOUND')

      if (auth.role == Enum.ROLES.PARTNER) {
        if (body.rating || body.comments) {
          tripData.partner.rating = body.rating || 0
          tripData.partner.comment = body.comments || ''
          await tripData.save()

          if (body.rating && body.rating > 0)
            AuthServices.updateRating({
              userId: tripData.customer.id,
              userRole: Enum.ROLES.CUSTOMER,
              rating: body.rating
            })
        }

        // this.freeThePartner(tripData.partner.id)
        this.updatePartnerTripInDB(tripData.partner.id)
        await Helpers.tripFlowHandlerFB({
          flow: '11',

          tripId: tripData._id,
          referenceNo: tripData.referenceNo,
          tripStatus: 'Finished',

          partnerId: tripData.partner.id,
          partnerStatus: 'free'

          // customerId: tripData.customer.id,
          // customerStatus: 'free',
        })
      } else {
        if (body.rating || body.comments) {
          // Only happens in RazorPay
          if (body.paymentMethod === 'RAZORPAY' || body.paymentMethodChange) {
            if (body.paymentMethodId) {
              tripData.paymentMethodId = body.paymentMethodId
              tripData.paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID
            }
            // Only happens in RazorPay
            if (tripData.paymentMethod != body.paymentMethod) {
              tripData.paymentMethod = body.paymentMethod ? body.paymentMethod : Enum.TRIP.PAYMENT_MODE.CASH
              tripData.paymentMethodChange = body.paymentMethodChange
              tripData.paymentStatus = Enum.TRIP.PAYMENT_STATUS.PAID
              const customer = Customer.findOne({ _id: tripData.customer.id }, { fcmId: 1 }).lean().exec()
              const partner = Partner.findOne({ _id: tripData.partner.id }, { fcmId: 1 }).lean().exec()
              await NotifcationController.createNotification({
                processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
                data: {
                  pushToken: customer.fcmId,
                  title: 'Ride',
                  body: '',
                  template: 'paymentCustomerFailure',
                  templateData: {}
                }
              })
              await NotifcationController.createNotification({
                processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
                data: {
                  pushToken: partner.fcmId,
                  title: 'Ride',
                  body: '',
                  template: 'paymentPartnerFailure',
                  templateData: {}
                }
              })
            }
          }
          tripData.customer.rating = body.rating || 0
          tripData.customer.comment = body.comments || ''
          await tripData.save()

          if (body.rating && body.rating > 0)
            AuthServices.updateRating({
              userId: tripData.partner.id,
              userRole: Enum.ROLES.PARTNER,
              rating: body.rating
            })
        }

        this.updateCustomerTripInDB(tripData.customer.id)
        await Helpers.tripFlowHandlerFB({
          flow: '11',

          tripId: tripData._id,
          referenceNo: tripData.referenceNo,
          tripStatus: 'Finished',

          // partnerId: tripData.partner.id,
          // partnerStatus: 'free',

          customerId: tripData.customer.id,
          customerStatus: 'free'
        })

        // const cusData = await Customer.findOne({ _id: tripData.customer.id }).exec()
        // await NotifcationController.createNotification({
        //   processType: [Enum.NOTIFICATION.TYPE.MAIL],
        //   data: {
        //     email: cusData.email,
        //     contentdata: {
        //       fare: tripData.invoice.totalFare,
        //       referenceNo: tripData.referenceNo,
        //       scheduleOn: moment(tripData.scheduleOn).format('L'),
        //       actualfare: tripData.invoice.actualFare,
        //       additionalfare: tripData.invoice.additionalFare,
        //       startime: moment(tripData.partner.startTime).format('LT'),
        //       endtime: moment(tripData.partner.endTime).format('LT'),
        //       routeimage: tripData.routeImage,
        //       start: tripData.invoice.start,
        //       end: tripData.invoice.end,
        //       distance: tripData.invoice.distance,
        //       time: tripData.invoice.estTime
        //     },
        //     description: 'TripInvoice'
        //   }
        // })
      }
      requestHandler.sendSuccess(req, res, 'FEEDBACK')({ message: 'FEEDBACK_ADDED_SUCCESSFULLY' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  /**
   * Trip Current Status Update from Customer
   * @input
   * @param
   * @return
   * @response
   */

  static updateCustomerTripInDB = async (customerId, curTrip = '', curStatus = 'free') => {
    try {
      const customerData = await Customer.findOne({ _id: customerId }).lean().exec()
      if (!customerData) {
        console.log('NOT_FOUND|CUSTOMER')
      } else {
        if (curStatus == 'free') {
          curTrip = ''
        } else if (
          curStatus == 'Processing' ||
          curStatus == 'Accepted' ||
          curStatus == 'Arrived' ||
          curStatus == 'Progress' ||
          curStatus == 'Cancelled'
        ) {
          curTrip = curTrip
        }
        await Customer.updateOne(
          { _id: customerId },
          {
            $set: {
              curTrip: curTrip,
              curStatus: curStatus
            }
          }
        )
      }
    } catch (error) {
      console.error('UPDATE_CUSTOMER_TRIP_IN_DB_ERROR: ', error)
    }
  }

  /**
   * Trip Current Status Update from Partner
   * @input
   * @param
   * @return
   * @response
   */
  static updatePartnerTripInDB = async (partnerId, curTrip = '', curStatus = 'free') => {
    try {
      const partnerData = await Partner.findOne({ _id: partnerId }).lean().exec()
      if (!partnerData) {
        console.log('NO_DOC_FOUND')
      } else {
        if (curStatus == 'free') {
          curTrip = ''
        } else if (
          curStatus == 'Processing' ||
          curStatus == 'Accepted' ||
          curStatus == 'Arrived' ||
          curStatus == 'Progress' ||
          curStatus == 'Cancelled'
        ) {
          // curTrip = curTrip
        }
        await Partner.updateOne(
          { _id: partnerId },
          {
            $set: {
              curTrip: curTrip,
              curStatus: curStatus
            }
          }
        )
      }
    } catch (error) {
      console.error('UPDATE_PARTNER_TRIP_IN_DB', error)
    }
  }

  static freeThePartner = async (partnerid) => {
    try {
      await Partner.findByIdAndUpdate(
        partnerid,
        {
          curStatus: 'free'
        },
        { new: true }
      )
        .lean()
        .exec()
    } catch (error) {
      console.error('FREE_THE_PARTNER_ERROR: ', error)
    }
  }

  static cancelRequest = async (req, res) => {
    try {
      const body = req.body || {}
      const cancelReason = body.reason || ''
      const tripsData = await Trip.findOne({ _id: body.requestId }).lean().exec()
      // if (tripsData.status == 'Cancelled') {
      // throw new Error('TRIP_ALREADY_CANCELLED')
      // } else
      if (tripsData.status == Enum.TRIP.STATUS.REQUESTED) {
        const update = {
          status: Enum.TRIP.STATUS.CANCELLED,
          review: 'Request Cancelled By User',
          needClear: false,
          'customer.cancelReason': cancelReason
        }

        const cancelData = await Trip.findOneAndUpdate(
          { _id: body.requestId, status: Enum.TRIP.STATUS.REQUESTED },
          update,
          {
            new: true
          }
        )
          .lean()
          .exec()
        this.updateCustomerTripInDB(req.auth.userId)
        if (ServiceConfig.basics.partnerAssigmentType == 'Bulk') {
          await BulkAssignController.updatePartnerbulkassignTripinDb(tripsData)
          await Helpers.tripFlowHandlerFB({
            flow: '7',
            tripId: tripsData._id,
            referenceNo: tripsData.referenceNo,
            tripStatus: 'Cancelled',
            customerId: req.auth.userId
          })
        } else {
          const takePartner = tripsData.partnerList.find((data) => data.status == Enum.TRIP.STATUS.CALLED)
          if (takePartner) this.updatePartnerTripInDB(takePartner.partnerId)
          this.pushTheEvent(tripsData._id, req.auth.userId, req.auth.role, req.auth.name, 'Cancelled', '')
          // await Helpers.tripFlowHandlerFB({
          //   flow: '7',

          //   tripId: tripsData._id,
          //   referenceNo: tripsData.referenceNo,
          //   tripStatus: 'Cancelled',

          //   customerId: req.auth.userId,

          //   partnerId: takePartner && takePartner.partnerId ? takePartner.partnerId : null
          // })
        }
        return requestHandler.sendSuccess(
          req,
          res,
          'CANCEL_REQUEST'
        )({
          message: 'REQUEST_CANCELLED',
          Data: cancelData
        })
      } else if (tripsData.status == Enum.TRIP.STATUS.PROCESSING) {
        const update = {
          status: Enum.TRIP.STATUS.CANCELLED,
          review: 'Request Cancelled By User',
          needClear: false,
          'customer.cancelReason': cancelReason
        }

        const cancelData = await Trip.findOneAndUpdate(
          { _id: body.requestId, status: Enum.TRIP.STATUS.PROCESSING },
          update,
          {
            new: true
          }
        )
          .lean()
          .exec()
        const takePartner = tripsData.partnerList.find((data) => data.status == Enum.TRIP.STATUS.CALLED)
        console.log('__takePartner___', takePartner)
        // if (takePartner) this.updateCustomerTripInDB(req.auth.userId)
        this.updateCustomerTripInDB(req.auth.userId)
        if (ServiceConfig.basics.partnerAssigmentType == 'Bulk') {
          await BulkAssignController.updatePartnerbulkassignTripinDb(tripsData)
        } else {
          // const takePartner = tripsData.partnerList.find((data) => data.status == Enum.TRIP.STATUS.CALLED)
          if (takePartner) this.updatePartnerTripInDB(takePartner.partnerId)
        }
        this.pushTheEvent(tripsData._id, req.auth.userId, req.auth.role, req.auth.name, 'Cancelled', '')
        await Helpers.tripFlowHandlerFB({
          flow: '7',

          tripId: tripsData._id,
          referenceNo: tripsData.referenceNo,
          tripStatus: 'Cancelled',

          customerId: req.auth.userId,

          partnerId: takePartner?.partnerId ? takePartner.partnerId : null
        })
        return requestHandler.sendSuccess(
          req,
          res,
          'CANCEL_REQUEST'
        )({
          message: 'REQUEST_CANCELLED',
          Data: cancelData
        })
      } else if (
        tripsData.status == Enum.TRIP.STATUS.ARRIVED ||
        tripsData.status == Enum.TRIP.STATUS.ACCEPTED
      ) {
        const update = {
          status: Enum.TRIP.STATUS.CANCELLED,
          review: 'Trip Cancelled By User',
          'customer.cancelReason': cancelReason
        }
        const partnerInfo = await Partner.findOne({ _id: tripsData.partner.id }).exec()
        if (!partnerInfo) return requestHandler.sendError(req, res, 'NO_DATA_FOUND')
        const cancelCurrentTrip = await Trip.findOneAndUpdate({ _id: body.requestId }, update, { new: true })
          .lean()
          .exec()

        this.updatePartnerTripInDB(tripsData.partner.id)
        this.updateCustomerTripInDB(req.auth.userId)
        this.pushTheEvent(
          tripsData._id,
          req.auth.userId,
          req.auth.role,
          req.auth.name,
          'Cancelled',
          cancelReason
        )
        await Helpers.tripFlowHandlerFB({
          flow: '7',

          tripId: tripsData._id,
          referenceNo: tripsData.referenceNo,
          tripStatus: 'Cancelled',

          customerId: req.auth.userId,

          partnerId: tripsData.partner.id
        })
        await NotifcationController.createNotification({
          processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
          data: {
            pushToken: partnerInfo.fcmId,
            title: 'Ride',
            body: '',
            template: 'customerCancel',
            templateData: {}
          }
        })
        return requestHandler.sendSuccess(
          req,
          res,
          'REQUEST_CANCELLED'
        )({
          message: 'TRIP_CANCELLED',
          Data: cancelCurrentTrip
        })
      } else {
        return requestHandler.sendError(req, res, 'NOT_FOUND|TRIP')
      }
    } catch (error) {
      console.log('CANCEL_REQUEST_ERROR: ', error)

      return requestHandler.sendError(req, res, error)
    }
  }

  /**
   * Partner Cancelled the Ongoing Trip
   * @input
   * @param
   * @return
   * @response
   */
  static cancelTrip = async (req, res) => {
    try {
      const body = req.body
      const cancelReason = body.reason

      const update = {
        status: 'Cancelled',
        review: 'Trip Cancelled By Partner',
        needClear: false,
        // 'partner.name': req.auth.name,
        // 'partner.id': req.auth.userId,
        'partner.cancelReason': cancelReason
      }
      if (!mongoose.Types.ObjectId.isValid(body.requestId)) {
        throw new Error('Invalid requestId')
      }

      const cancelTripData = await Trip.findOneAndUpdate(
        {
          _id: mongoose.Types.ObjectId(body.requestId),
          status: { $in: [Enum.TRIP.STATUS.ACCEPTED, Enum.TRIP.STATUS.ARRIVED] }
        },
        update,
        { new: true }
      )
        .lean()
        .exec()
      if (!cancelTripData) return requestHandler.sendError(req, res, 'NOT_FOUND|TRIP')
      const customerInfo = await Customer.findOne({ _id: cancelTripData.customer.id }).exec()
      if (!customerInfo) return requestHandler.sendError(req, res, 'NOT_FOUND|CUSTOMER')
      if (ServiceConfig.basics.allowMultipleRequestToPartner) {
        await Partner.findOneAndUpdate(
          { _id: req.auth.userId },
          {
            $pull: {
              tripRequests: {
                tripId: mongoose.Types.ObjectId(body.requestId)
              }
            }
          }
        )
      }
      this.updatePartnerTripInDB(
        req.auth?.role == Enum.ROLES.PARTNER ? req.auth.userId : cancelTripData?.partner?.id
      )
      this.updateCustomerTripInDB(cancelTripData.customer.id)
      this.pushTheEvent(
        cancelTripData._id,
        req.auth.userId,
        req.auth.role,
        req.auth.name,
        'Cancelled',
        cancelReason
      )
      // const data = {
      //   tripId: cancelTripData._id,
      //   customerId: cancelTripData.customer.id,
      //   partnerId: req.auth.userId,
      //   referenceNo: cancelTripData.referenceNo,
      //   tripStatus: 'Cancelled',
      // }
      // await Helpers.tripCancelInFB(data)
      await Helpers.tripFlowHandlerFB({
        flow: '7',

        tripId: cancelTripData._id,
        referenceNo: cancelTripData.referenceNo,
        tripStatus: 'Cancelled',

        customerId: cancelTripData.customer.id,

        partnerId: cancelTripData.partner.id
      })
      await NotifcationController.createNotification({
        processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
        data: {
          pushToken: customerInfo.fcmId,
          title: 'Ride',
          body: '',
          template: 'partnerCancel',
          templateData: {}
        }
      })
      if (
        SettingsConfig.menulist.find(
          (item) => item.value == Enum.SETTINGS.CANCELLATIONSETTING && item.enabled == true
        )
      ) {
        await CancelController.addCancelcharge(req.auth.userId, Enum.ROLES.PARTNER, cancelTripData)
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'REQUEST_CANCELLED'
      )({
        message: 'TRIP_CANCELLED',
        Data: cancelTripData
      })
    } catch (error) {
      // console.log("err",error);
      return requestHandler.sendError(req, res, error)
    }
  }

  static pushTheEvent = async (tripid, userid, role, name, type, reason) => {
    try {
      const update = {
        userId: userid,
        userType: role,
        userName: name,
        category: type,
        description: reason
      }
      await Trip.findOneAndUpdate({ _id: tripid }, { $push: { events: update } }, { new: true })
    } catch (error) {
      console.error('PUSH_THE_EVENT_ERROR: ', error)
    }
  }

  static pushStopEvent = async (tripid = null, data = {}) => {
    try {
      await Trip.findOneAndUpdate({ _id: tripid }, { $push: { 'invoice.stops': data } }, { new: true })
    } catch (error) {
      console.error('PUSH_THE_STOP_ERROR: ', error)
    }
  }

  static customerHistory = async (req, res) => {
    try {
      const queryData = req.query
      const authData = req.auth || null

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const customerId =
        authData.role == Enum.ROLES.CUSTOMER ? authData.userId : mongoose.Types.ObjectId(queryData.customerId)

      let fromDate = null
      let toDate = null

      const historyQuery = {
        'customer.id': customerId
      }
      // Restrict one month gap when we adding date filter
      if (queryData.fromDate && queryData.toDate) {
        fromDate = queryData.fromDate ? new Date(queryData.fromDate) : null
        fromDate.setHours(0, 0, 0, 0)
        toDate = queryData.toDate ? new Date(queryData.toDate) : null
        toDate.setHours(23, 59, 59, 999)
        const diffDays = Math.round(toDate - fromDate / (1000 * 3600 * 24))
        if (diffDays <= 31 && diffDays >= 0) throw new Error('DAYS_LIMIT_EXCEED')
        historyQuery['$and'] = [
          {
            scheduleOn: { $gte: fromDate }
          },
          {
            scheduleOn: { $lte: toDate }
          }
        ]
      }

      // Status based constants queries
      const finishedStatus = {
        status: Enum.TRIP.STATUS.FINISHED
      }
      const processingStatus = {
        status: Enum.TRIP.STATUS.PROCESSING
      }
      const requestedStatus = {
        status: Enum.TRIP.STATUS.REQUESTED
      }
      const progressStatus = {
        status: Enum.TRIP.STATUS.PROGRESS
      }
      const acceptStatus = {
        status: Enum.TRIP.STATUS.ACCEPTED
      }
      const arrivedStatus = {
        status: Enum.TRIP.STATUS.ARRIVED
      }
      const cancelledStatus = {
        $and: [{ status: Enum.TRIP.STATUS.CANCELLED }, { 'partner.id': { $ne: null } }]
      }
      const noResponseStatus = {
        $and: [{ status: Enum.TRIP.STATUS.NORESPONSE }, { isScheduleLater: true }]
      }

      if (queryData.status == Enum.TRIP.STATUS.FINISHED) {
        historyQuery['$or'] = [finishedStatus]
      } else if (queryData.status == Enum.TRIP.STATUS.CANCELLED) {
        historyQuery['$or'] = [cancelledStatus]
      } else if (queryData.status == Enum.TRIP.STATUS.PROCESSING) {
        historyQuery['$or'] = [processingStatus]
      } else if (queryData.status == Enum.TRIP.STATUS.PROGRESS) {
        historyQuery['$or'] = [progressStatus]
      } else if (queryData.status == Enum.TRIP.STATUS.ACCEPTED) {
        historyQuery['$or'] = [acceptStatus]
      } else if (queryData.status == Enum.TRIP.STATUS.ARRIVED) {
        historyQuery['$or'] = [arrivedStatus]
      } else if (queryData.status == Enum.TRIP.STATUS.REQUESTED) {
        historyQuery['$or'] = [requestedStatus]
      } else if (queryData.status == Enum.TRIP.STATUS.NORESPONSE) {
        historyQuery['$or'] = [noResponseStatus]
      } else {
        historyQuery['$or'] = [
          finishedStatus,
          cancelledStatus,
          requestedStatus,
          acceptStatus,
          arrivedStatus,
          processingStatus,
          progressStatus,
          noResponseStatus
        ]
      }

      // console.log("history",JSON.stringify(historyQuery))

      const historyData = await Trip.aggregate([
        { $match: { ...historyQuery } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $sort: { _id: -1 } }, { $skip: Number(skip) || 0 }, { $limit: Number(perPage) || 10 }]
          }
        }
      ])

      return requestHandler.sendSuccess(
        req,
        res,
        'CUSTOMER_HISTORY'
      )({
        history: historyData[0]?.data || [],
        total: historyData[0]?.metadata[0]?.total || 0
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static partnerEarnings = async (req, res) => {
    try {
      const queryData = req.query
      const authData = req.auth || null

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const partnerId =
        authData.role == Enum.ROLES.PARTNER ? authData.userId : mongoose.Types.ObjectId(paramData.partnerId)

      // const fromDate = queryData.fromDate ? new Date(queryData.fromDate) : null
      // console.log('fromDate', fromDate)
      // fromDate.setHours(0, 0, 0, 0)
      // const toDate = queryData.toDate ? new Date(queryData.toDate) : null
      // console.log('toDate', toDate)
      // toDate.setHours(23, 59, 59, 999)
      let fromDate = queryData.fromDate ? new Date(queryData.fromDate) : new Date()
      console.log('fromDate', fromDate)
      fromDate = Helpers.getISOStartDate(fromDate)
      console.log('fromDate', fromDate, new Date(fromDate))
      let toDate = queryData.toDate ? new Date(queryData.toDate) : new Date()
      console.log('toDate', toDate)
      toDate = Helpers.getISOEndDate(toDate)
      console.log('toDate', toDate, new Date(toDate))

      const diffDays = Math.round(toDate - fromDate / (1000 * 3600 * 24))
      console.log('fromDate', fromDate, 'toDate', toDate)
      let earnings = 0
      let tripCount = 0
      let earningsArr = null
      let statusArr = [Enum.TRIP.STATUS.FINISHED, Enum.TRIP.STATUS.CANCELLED]

      if (diffDays <= 31 && diffDays >= 0) throw new Error('DAYS_LIMIT_EXCEED')
      if (queryData.status == Enum.TRIP.STATUS.FINISHED) {
        statusArr = [Enum.TRIP.STATUS.FINISHED]
      } else if (queryData.status == Enum.TRIP.STATUS.CANCELLED) {
        statusArr = [Enum.TRIP.STATUS.CANCELLED]
      }

      const historyQuery = {
        'partner.id': partnerId,
        $and: [
          {
            scheduleOn: { $gte: new Date(fromDate) }
          },
          {
            scheduleOn: { $lte: new Date(toDate) }
          }
        ]
      }
      if (!page || page == 1) {
        earningsArr = await Trip.aggregate([
          { $match: { ...historyQuery, status: Enum.TRIP.STATUS.FINISHED } },
          {
            $group: {
              _id: { $dayOfMonth: '$scheduleOn' },
              payableTotal: { $sum: '$invoice.payable' },
              tripCount: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              date: '$_id',
              payableTotal: 1,
              tripCount: 1
            }
          }
        ])
        console.log('earningsArr', earningsArr)
        earnings =
          earningsArr.length > 0
            ? earningsArr.reduce(function (a, b) {
                return a + b['payableTotal']
              }, 0)
            : earnings
        tripCount =
          earningsArr.length > 0
            ? earningsArr.reduce(function (a, b) {
                return a + b['tripCount']
              }, 0)
            : tripCount
      }

      const historyData = await Trip.aggregate([
        { $match: { ...historyQuery, status: { $in: statusArr } } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $sort: { _id: -1 } }, { $skip: Number(skip) || 0 }, { $limit: Number(perPage) || 10 }]
          }
        }
      ])

      return requestHandler.sendSuccess(
        req,
        res,
        'PARTNER_EARNINGS'
      )({
        history: historyData[0]?.data || [],
        total: historyData[0]?.metadata[0]?.total || 0,
        earnings: earnings,
        tripCount: tripCount,
        earningsArr: earningsArr
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static adminHistory = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(Trip, queryData)
      queryObject = queryBuilder.queryObject

      if (queryData.referenceNo) {
        const RefNo = queryData.referenceNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        queryObject.$expr = {
          $regexMatch: {
            input: { $toString: '$referenceNo' },
            regex: RefNo,
            options: 'i'
          }
        }
      }

      if (queryData.fare && Number(queryData.fare))
        queryObject['$or'] = [
          { 'invoice.totalFare': Number(queryData.fare) },
          { 'estimation.totalFare': Number(queryData.fare) }
        ]

      // const queryBuilder = {}
      // const queryStatus = queryData.status || null
      // if (queryStatus == 'past') {
      //   queryBuilder['status'] = { $in: ['Finished'] }
      // } else if (queryStatus == 'ongoing') {
      //   queryBuilder['status'] = { $in: ['Accepted', 'Progress'] }
      // } else if (queryStatus == 'upcoming') {
      //   queryBuilder['status'] = { $in: ['Processing'] }
      // } else if (queryStatus == 'noresponse') {
      //   queryBuilder['status'] = { $in: ['Finished'] }
      // }

      const historyData = await Trip.aggregate([
        { $match: { ...queryObject } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $sort: { _id: -1 } }, { $skip: Number(skip) || 0 }, { $limit: Number(perPage) || 10 }]
          }
        }
      ])
      return requestHandler.sendSuccess(
        req,
        res,
        'ADMIN_HISTORY'
      )({
        message: 'SUCEESS',
        history: historyData[0]?.data || [],
        total: historyData[0]?.metadata[0]?.total || 0
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static heatMapReport = async (req, res) => {
    try {
      const queryData = req.query || {}
      const now = new Date()
      const nowInMinutes = now.getHours() * 60 + now.getMinutes()

      const validationError = heatMapValidator.validateHeatMapQuery(queryData)
      if (validationError) return requestHandler.sendError(req, res, validationError)

      const { serviceArea, createdAtGte, createdAtLte, timeGte, timeLte } = queryData
      const filterQuery = {}

      if (serviceArea) {
        filterQuery.serviceArea = new mongoose.Types.ObjectId(serviceArea)
      }

      let start = null
      let end = null
      if (createdAtGte || createdAtLte) {
        const baseDate = createdAtGte && !createdAtLte ? new Date(createdAtGte) : null
        start = baseDate
          ? new Date(baseDate.setHours(0, 0, 0, 0))
          : createdAtGte
          ? new Date(createdAtGte)
          : null
        end = baseDate
          ? new Date(baseDate.setHours(23, 59, 59, 999))
          : createdAtLte
          ? new Date(createdAtLte)
          : null

        filterQuery.createdAt = {}
        if (start) filterQuery.createdAt.$gte = start
        if (end) filterQuery.createdAt.$lte = end
      }

      const parseTime = (str) => {
        const [h, m] = (str || '').split(':').map(Number)
        return { h, m }
      }

      let timeExprFilter = {}
      const hasTimeGte = !!timeGte
      const hasTimeLte = !!timeLte

      if (hasTimeGte || hasTimeLte) {
        const gte = hasTimeGte ? parseTime(timeGte) : null
        const lte = hasTimeLte ? parseTime(timeLte) : null

        const gteMin = gte ? gte.h * 60 + gte.m : null
        const lteMin = lte ? lte.h * 60 + lte.m : null

        const latestDate = createdAtLte
          ? new Date(createdAtLte)
          : createdAtGte
          ? new Date(createdAtGte)
          : null

        const isToday = latestDate && latestDate.toDateString() === now.toDateString()
        const effectiveLte = isToday && lteMin > nowInMinutes ? nowInMinutes : lteMin

        const timeInMinutesExpr = {
          $add: [{ $multiply: [{ $hour: '$createdAt' }, 60] }, { $minute: '$createdAt' }]
        }

        if (hasTimeGte && !hasTimeLte) {
          timeExprFilter = {
            $expr: {
              $eq: [timeInMinutesExpr, gteMin]
            }
          }
        } else if (!hasTimeGte && hasTimeLte) {
          timeExprFilter = {
            $expr: {
              $eq: [timeInMinutesExpr, lteMin]
            }
          }
        } else {
          timeExprFilter = {
            $expr: {
              $and: [{ $gte: [timeInMinutesExpr, gteMin] }, { $lte: [timeInMinutesExpr, effectiveLte] }]
            }
          }
        }
      }

      const pipeline = [
        {
          $match: {
            ...filterQuery,
            ...(hasTimeGte || hasTimeLte ? timeExprFilter : {})
          }
        },
        {
          $project: {
            _id: 0,
            lat: '$estimation.startcoords',
            serviceArea: 1,
            createdAt: 1
          }
        }
      ]

      const mapData = await Trip.aggregate(pipeline).exec()
      return requestHandler.sendSuccess(req, res, 'Success result')({ mapData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getCustomerDetails = async (req, res) => {
    try {
      const query = req.query
      const response = {
        message: 'EXIST|CUSTOMER',
        account: {
          isExist: false
        }
      }

      const validation = await AuthValidator.validateData(query, 'getCustomerExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getCustomer(req.query)
      if (account?.status) response.account.isExist = true
      else response.message = 'NOT_EXIST|CUSTOMER'

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_CUSTOMER_EXISTS'
      )({ response, Customer: account.data.customer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getRequestLocater = async (req, res) => {
    try {
      const { requestId = null } = req.query
      if (!requestId) throw new Error('UNPROCESSABLE_ENTRY')
      console.log(requestId)

      const requestData = await Trip.findOne(
        {
          _id: mongoose.Types.ObjectId(requestId),
          status: { $nin: [Enum.TRIP.STATUS.PROCESSING, Enum.TRIP.STATUS.NORESPONSE] }
        },
        {
          'customer.name': 1,
          'customer.email': 1,
          'customer.phoneNo': 1,
          'customer.phoneCode': 1,
          'customer.profile': 1,
          'partner.name': 1,
          'partner.code': 1,
          'partner.email': 1,
          'partner.phoneNo': 1,
          'partner.phoneCode': 1,
          'partner.profile': 1,
          'partner.vehicle': 1,
          'partner.vehicleNo': 1,
          'partner.serviceTypeName': 1,
          'estimation.start': 1,
          'estimation.end': 1,
          'estimation.startcoords': 1,
          'estimation.endcoords': 1
        }
      )
      if (!requestData) throw new Error('REQUEST_NOT_PROCESSED')

      const tracker = await ServiceTracker.findOne(
        { requestId: requestData._id },
        { /* startcoords: 1, endcoords: 1,*/ lastcoords: 1, polyline: '$dropPolyline' }
      )
        .lean()
        .exec()
      if (!tracker) throw new Error('REQUEST_NOT_PROCESSED')

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_REQUEST_LOCATION'
      )({
        message: 'GET_REQUEST_LOCATION',
        requestData,
        tracker
      })
    } catch (error) {
      console.log('GET_REQUEST_LOCATION_ERROR :', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static scheduleLaterCron = async () => {
    try {
      // const nowDate = new Date()
      // const nowTime = nowDate.getTime()
      // const time15MBefore = new Date(Helpers.getISODate())
      // time15MBefore.setTime(nowTime + 5 * 60 * 1000)
      // time15MBefore.setSeconds(0)
      // const time10MBefore = new Date(Helpers.getISODate())
      // time10MBefore.setTime(nowTime + 3 * 60 * 1000)
      // time10MBefore.setSeconds(0)
      // const time05MBefore = new Date(Helpers.getISODate())
      // time05MBefore.setTime(nowTime + 2 * 60 * 1000)
      // time05MBefore.setSeconds(0)

      // console.log(
      //   'SCHEDULE_LATER_CRON',
      //   time15MBefore.toUTCString(),
      //   time10MBefore.toUTCString(),
      //   time05MBefore.toUTCString()
      // )

      // Need to clear customer Current Schedule Trip
      Trip.find({
        isScheduleLater: true
      })
        .populate([
          {
            path: 'customer.id',
            select: 'curStatus curTrip'
          }
        ])
        .exec((err, trips) => {
          trips.forEach(async (tripdata) => {
            if (
              tripdata.customer?.id?.curStatus != 'free' &&
              tripdata.status == Enum.TRIP.STATUS.NORESPONSE
            ) {
              console.log(
                'time',
                new Date(tripdata.scheduleOn).getTime(),
                new Date(Helpers.getISODate()).getTime()
              )
              if (new Date(tripdata.scheduleOn).getTime() < new Date(Helpers.getISODate()).getTime()) {
                if (tripdata._id.toString() == tripdata.customer?.id?.curTrip.toString()) {
                  this.updateCustomerTripInDB(tripdata.customer.id._id)
                }
              }
            }
          })
        })

      // 1. Get the current time
      const now = new Date(Helpers.getISODate())
      const nowTime = now.getTime()

      // Define our three specific "Target Windows" (1-minute wide each)
      const targets = [15, 10, 5].map((minutes) => {
        const targetTime = nowTime + minutes * 60 * 1000
        const start = new Date(targetTime)
        start.setSeconds(0, 0) // Start of that specific minute
        const end = new Date(targetTime)
        end.setSeconds(59, 999) // End of that specific minute

        return { $gte: start, $lte: end }
      })

      // The query uses $or to look for any trip falling in those three specific minute-long windows
      Trip.find({
        isScheduleLater: true,
        status: { $in: [Enum.TRIP.STATUS.REQUESTED, Enum.TRIP.STATUS.NORESPONSE] },
        $or: [
          { scheduleOn: targets[0] }, // 15 mins before of trip time
          { scheduleOn: targets[1] }, // 10 mins before of trip time
          { scheduleOn: targets[2] } // 5 mins before of trip time
        ]
      })
        .populate([
          {
            path: 'customer.id',
            select: 'curStatus'
          }
        ])
        .exec((err, trips) => {
          if (err) console.error('SCHEDULE_LATER_ERROR', err)
          else if (trips.length <= 0) console.log('SCHEDULE_LATER_IS_EMPTY')
          else {
            trips.forEach(async (tripdata) => {
              if (tripdata.customer?.id?.curStatus != 'free')
                console.log('SCHEDULE_LATER_CUSTOMER_BUSY', tripdata._id)
              else {
                console.log('SCHEDULE_LATER_TRIP_ASSIGNING', tripdata._id)
                const data = {
                  flow: '0',

                  tripId: tripdata._id,
                  referenceNo: tripdata.referenceNo,
                  tripStatus: tripdata.status,

                  customerId: tripdata.customer.id._id,
                  customerStatus: 'inTrip'
                }
                this.updateCustomerTripInDB(tripdata.customer.id._id, tripdata._id, 'Processing')
                await Helpers.tripFlowHandlerFB(data)
                if (ServiceConfig.basics.partnerAssigmentType == 'Bulk') {
                  BulkAssignController.findPartners(tripdata)
                } else await OnebyoneController.findPartners(tripdata)
              }
            })
          }
        })
    } catch (error) {
      console.error('SCHEDULELATERCRON_ERROR', error)
    }
  }

  static checkPayment = async (req, res) => {
    try {
      const requestId = req.query.requestId
      if (!requestId) throw new Error('REQUEST_ID_IS_REQUIRED')
      const paymentInfo = await this.initializePayment({ requestId })
      if (!paymentInfo.status) throw new Error(paymentInfo.message)
      return requestHandler.sendSuccess(
        req,
        res,
        'CHECKPAYMENT'
      )({
        message: 'CHECKPAYMENT',
        paymentInfo
      })
    } catch (error) {
      console.log('CHECKPAYMENT_ERROR', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  // static getReviewDetails = async (req, res) => {
  //   try {
  //     const queryData = req.query
  //     const perPage = queryData.limit || 10
  //     const page = queryData.page || 1
  //     const skip = perPage * page - perPage || 0

  //     const validation = await TripValidator.validateData(queryData, 'getReviewDetails')
  //     if (!validation.status) return requestHandler.sendError(req, res, validation.data)

  //     const userType =
  //       queryData.userType && [Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER].includes(queryData.userType)
  //         ? queryData.userType
  //         : Enum.ROLES.PARTNER
  //     const userId = queryData.userId || null
  //     const reportType =
  //       queryData.reportType || (['GIVEN', 'GET'], includes(queryData.reportType))
  //         ? queryData.reportType
  //         : 'GET'

  //     const queryObject = {
  //       status: Enum.TRIP.STATUS.FINISHED
  //       // $or: [{ 'customer.rating': { $gt: 0 } }, { 'partner.rating': { $gt: 0 } }]
  //     }
  //     let projectData = {}
  //     console.log('queryData', queryData)
  //     console.log('queryObject', queryObject)
  //     if (userType == Enum.ROLES.PARTNER) {
  //       if (queryData.userId) queryObject['partner.id'] = mongoose.Types.ObjectId(userId)

  //       if (reportType == 'GET') {
  //         queryObject['customer.rating'] = { $gt: 0 }
  //         projectData = {
  //           $project: {
  //             referenceNo: 1,
  //             id: '$customer.id',
  //             code: '$customer.code',
  //             rating: '$customer.rating',
  //             comment: '$customer.comment'
  //           }
  //         }
  //       } else {
  //         queryObject['partner.rating'] = { $gt: 0 }
  //         projectData = {
  //           $project: {
  //             referenceNo: 1,
  //             id: '$partner.id',
  //             code: '$partner.code',
  //             rating: '$partner.rating',
  //             comment: '$partner.comment'
  //           }
  //         }
  //       }
  //     } else {
  //       if (userId) queryObject['customer.id'] = mongoose.Types.ObjectId(userId)
  //       if (reportType == 'GET') {
  //         queryObject['partner.rating'] = { $gt: 0 }
  //         projectData = {
  //           $project: {
  //             referenceNo: 1,
  //             id: '$partner.id',
  //             code: '$partner.code',
  //             rating: '$partner.rating',
  //             comment: '$partner.comment'
  //           }
  //         }
  //       } else {
  //         queryObject['customer.rating'] = { $gt: 0 }
  //         projectData = {
  //           $project: {
  //             referenceNo: 1,
  //             id: '$customer.id',
  //             code: '$customer.code',
  //             rating: '$customer.rating',
  //             comment: '$customer.comment'
  //           }
  //         }
  //       }
  //     }
  //     // Add review filters
  //     const ratingFieldPrefix =
  //       reportType === 'GET'
  //         ? userType === Enum.ROLES.PARTNER
  //           ? 'customer'
  //           : 'partner'
  //         : userType === Enum.ROLES.PARTNER
  //         ? 'partner'
  //         : 'customer'

  //     if (queryData.code) {
  //       queryObject[`${ratingFieldPrefix}.code`] = {
  //         $regex: queryData.code,
  //         $options: 'i'
  //       }
  //     }

  //     if (queryData.comment) {
  //       queryObject[`${ratingFieldPrefix}.comment`] = {
  //         $regex: queryData.comment,
  //         $options: 'i'
  //       }
  //     }
  //     if (queryData.rating) {
  //       queryObject[`${ratingFieldPrefix}.rating`] = Number(queryData.rating)
  //     }
  //     if (queryData.referenceNo) {
  //       const RefNo = queryData.referenceNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  //       queryObject.$expr = {
  //         $regexMatch: {
  //           input: { $toString: "$referenceNo" },
  //           regex: RefNo,
  //           options: "i"
  //         }
  //       }
  //     }

  //     const pipeline = [
  //       { $match: queryObject },
  //       { $skip: Number(skip) || 0 },
  //       { $sort: { _id: -1 } },
  //       { $limit: Number(perPage) || 10 },
  //       projectData
  //     ]

  //     const getDatacount = await Trip.countDocuments(queryObject).exec()
  //     const getData = await Trip.aggregate(pipeline)
  //     return requestHandler.sendSuccess(
  //       req,
  //       res,
  //       'REVIW_RATINS'
  //     )({ message: 'SUCCESS', ratings: getData, total: getDatacount || 0 })
  //   } catch (error) {
  //     return requestHandler.sendError(req, res, error)
  //   }
  // }

  static getReviewDetails = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const validation = await TripValidator.validateData(queryData, 'getReviewDetails')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const userType =
        queryData.userType && [Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER].includes(queryData.userType)
          ? queryData.userType
          : Enum.ROLES.PARTNER
      const userId = queryData.userId || null
      const reportType =
        queryData.reportType || (['GIVEN', 'GET'], includes(queryData.reportType))
          ? queryData.reportType
          : 'GET'

      const queryObject = {
        status: Enum.TRIP.STATUS.FINISHED
      }
      let projectData = {}

      let IdField = null
      if (reportType === 'GET') {
        IdField = userType === Enum.ROLES.PARTNER ? '$customer.id' : '$partner.id'
      } else {
        IdField = userType === Enum.ROLES.PARTNER ? '$partner.id' : '$customer.id'
      }

      if (userType === Enum.ROLES.PARTNER) {
        if (userId) queryObject['partner.id'] = mongoose.Types.ObjectId(userId)

        if (reportType === 'GET') {
          queryObject['customer.rating'] = { $gt: 0 }
          projectData = {
            $project: {
              referenceNo: 1,
              id: { $ifNull: [IdField, null] },
              code: { $ifNull: ['$customer.code', ''] },
              rating: '$customer.rating',
              comment: '$customer.comment'
            }
          }
        } else {
          queryObject['partner.rating'] = { $gt: 0 }
          projectData = {
            $project: {
              referenceNo: 1,
              id: { $ifNull: ['$partner.id', null] },
              code: { $ifNull: ['$partner.code', ''] },
              rating: '$partner.rating',
              comment: '$partner.comment'
            }
          }
        }
      } else {
        if (userId) queryObject['customer.id'] = mongoose.Types.ObjectId(userId)

        if (reportType === 'GET') {
          queryObject['partner.rating'] = { $gt: 0 }
          projectData = {
            $project: {
              referenceNo: 1,
              id: { $ifNull: [IdField, null] },
              code: { $ifNull: ['$partner.code', ''] },
              rating: '$partner.rating',
              comment: '$partner.comment'
            }
          }
        } else {
          queryObject['customer.rating'] = { $gt: 0 }
          projectData = {
            $project: {
              referenceNo: 1,
              id: { $ifNull: ['$customer.id', null] },
              code: { $ifNull: ['$customer.code', ''] },
              rating: '$customer.rating',
              comment: '$customer.comment'
            }
          }
        }
      }
      // Add review filters
      const ratingFieldPrefix =
        reportType === 'GET'
          ? userType === Enum.ROLES.PARTNER
            ? 'customer'
            : 'partner'
          : userType === Enum.ROLES.PARTNER
          ? 'partner'
          : 'customer'

      if (queryData.code) {
        queryObject[`${ratingFieldPrefix}.code`] = {
          $regex: queryData.code,
          $options: 'i'
        }
      }

      if (queryData.comment) {
        queryObject[`${ratingFieldPrefix}.comment`] = {
          $regex: queryData.comment,
          $options: 'i'
        }
      }
      if (queryData.rating) {
        queryObject[`${ratingFieldPrefix}.rating`] = Number(queryData.rating)
      }
      if (queryData.referenceNo) {
        const RefNo = queryData.referenceNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        queryObject.$expr = {
          $regexMatch: {
            input: { $toString: '$referenceNo' },
            regex: RefNo,
            options: 'i'
          }
        }
      }

      const pipeline = [
        { $match: queryObject },
        { $skip: Number(skip) || 0 },
        { $sort: { _id: -1 } },
        { $limit: Number(perPage) || 10 },
        projectData
      ]

      const getDatacount = await Trip.countDocuments(queryObject).exec()
      const getData = await Trip.aggregate(pipeline)

      return requestHandler.sendSuccess(
        req,
        res,
        'REVIW_RATINS'
      )({
        message: 'SUCCESS',
        ratings: getData,
        total: getDatacount || 0
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static checkExisttrip = async (customerId) => {
    const requestExist = await Trip.findOne({
      'customer.id': customerId,
      status: { $in: [Enum.TRIP.STATUS.REQUESTED, Enum.TRIP.STATUS.PROCESSING, Enum.TRIP.STATUS.PROGRESS] }
    })
      .lean()
      .exec()
    console.log('requestExist', requestExist)
    if (requestExist) throw new Error('TRIP_ALREADY_EXISTS')
  }

  static checkServiceArea = async (pickupLocationArr) => {
    let serviceCity = null
    serviceCity = await ServiceArea.findOne({
      polygon: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: pickupLocationArr
          }
        }
      }
    })
      .lean()
      .exec()

    if (!serviceCity)
      serviceCity = await ServiceArea.findOne({}, { sort: { _id: 1 } })
        .lean()
        .exec()

    if (!serviceCity) throw new ServiceModuleError('NOT_FOUND|SERVICE')
    return serviceCity
  }
  static getTripdetails = async (requestId) => {
    const tripdata = await Trip.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(requestId)
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer.id',
          foreignField: '_id',
          as: 'customersData'
        }
      },
      {
        $unwind: {
          path: '$customersData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          serviceArea: 1,
          servicePricing: 1,
          serviceType: 1,
          referenceNo: 1,
          estimation: 1,
          partner: 1,
          module: 1,
          status: 1,
          additionalDetails: 1,
          invoice: 1,
          companyId: 1,
          customer: {
            id: 1,
            fcmId: '$customersData.fcmId',
            requestPin: '$customer.requestPin',
            email: '$customersData.email'
          },
          routeImage: 1
        }
      }
    ]).exec()
    // if (!tripdata.length || tripdata.length <= 0) {
    //   throw new Error('TRIP_ALREADY_EXISTS')
    // }
    return tripdata
  }
}

export { ServiceModuleController }
