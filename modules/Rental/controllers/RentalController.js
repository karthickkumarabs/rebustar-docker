/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import { Logger } from '../../../utils/Logger.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { RentalValidator } from '../validators/RentalValidator.js'
import RentalPackage from '../models/Rental.js'
import mongoose from 'mongoose'
import { ServiceModuleError } from '../../../utils/ErrorHandler.js'
import { CreteriaService } from '../../../services/Creteria/CreteriaServices.js'
import { Helpers } from '../../../helpers/Function.js'
import moment from 'moment'
import ServiceTracker from '../../../models/ServiceModule/ServiceTracker.js'
import { MapServices } from '../../Map/index.js'
import { Config } from '../../../config/AppConfig.js'
import Customer from '../../../models/Auth/Customer.js'
import { Enum } from '../../../utils/Enum.js'
import { ServiceModuleController } from '../../../controllers/ServiceModule/ServiceModuleController.js'
import Partner from '../../../models/Auth/Partner.js'
import Currency from '../../../models/DataStore/Currency.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class RentalPackageController extends BaseController {
  constructor() {
    super()
  }

  static queryBuilder = async (filters) => {
    const response = {
      data: {},
      message: 'UNPROCESSABLE',
      status: false
    }
    try {
      const findCondition = {}
      const numericFields = ['distance', 'time']
      for (const [key, value] of Object.entries(filters)) {
        if (value?.trim()) {
          if (numericFields.includes(key)) {
            findCondition[key] = parseInt(value, 10)
          } else if (key === 'serviceArea') {
            findCondition['serviceAreaIds'] = { $in: value.split(',').map(mongoose.Types.ObjectId) }
          } else {
            findCondition[key] = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
          }
        }
      }
      response.data = findCondition
      response.message = 'BUILT_QUERY'
      response.status = true
    } catch (error) {
      response.data = {}
      response.message = error.message
      response.status = false
    }
    return response
  }

  static getRentalPackage = async (req, res) => {
    try {
      const { limit = 10, page = 1, ...filters } = req.query
      const skip = (Number(page) - 1) * Number(limit)
      const packageId = req.params.packageId

      const validation = await RentalValidator.validateData(req.query, 'getRentalPackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryData = await this.queryBuilder(filters)
      if (!queryData.status) throw new Error(queryData.status)
      const findCondition = queryData.data

      if (packageId) {
        findCondition._id = packageId
      }

      const rentalPackage = await RentalPackage.find(findCondition).limit(limit).skip(skip).sort({
        _id: -1
      })

      const count = await RentalPackage.countDocuments(findCondition)

      const returnData = {
        message: 'LISTED|RENTAL_PACKAGE',
        package: rentalPackage,
        count
      }

      return requestHandler.sendSuccess(req, res, 'RENTAL_PACKAGE_LISTED')(returnData)
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createRentalPackage = async (req, res) => {
    try {
      const body = req.body

      const validation = await RentalValidator.validateData(body, 'createRentalPackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const rentalPackageData = {
        name: body.name,
        description: body.description,
        serviceAreaIds: body.serviceArea && body.serviceArea !== '' ? body.serviceArea.split(',') : [],
        distance: body.distance,
        time: body.time
      }

      const rentalPackage = new RentalPackage(rentalPackageData)

      const createdPackage = await rentalPackage.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATED_RENTAL_PACKAGE'
      )({ message: 'CREATED|RENTAL_PACKAGE', package: createdPackage })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static addService = async (req, res) => {
    try {
      const body = req.body
      const { packageId, serviceTypeId } = req.params

      body.serviceType = serviceTypeId
      const validation = await RentalValidator.validateData(body, 'createServiceType')
      console.log('validation', validation)

      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const rentalPackage = await RentalPackage.findOne({ _id: packageId })
      if (!rentalPackage) throw new Error('NOT_FOUND|RENTAL_PACKAGE')

      const serviceTypeExist = rentalPackage.serviceTypes.some(
        (data) => data.serviceType.toString() === serviceTypeId
      )

      if (serviceTypeExist) throw new Error('EXIST|SERVICE_TYPE')
      const serviceTypeData = {
        serviceType: mongoose.Types.ObjectId(serviceTypeId),
        currencyId: mongoose.Types.ObjectId(body.currencyId),
        baseFare: body.baseFare,
        cancellationFarePartner: body.cancellationFarePartner,
        cancellationFareRider: body.cancellationFareRider,
        distanceFare: body.distanceFare,
        timeFare: body.timeFare,
        bookingFare: body.bookingFare,
        commision: body.commision,
        taxFare: {
          status: body?.taxFare?.status || false,
          fare: body?.taxFare?.fare || 0
        },
        waitingFare: {
          status: body?.waitingFare?.status || false,
          fare: body?.waitingFare?.fare || 0,
          allowedTime: body?.waitingFare?.allowedTime || 0
        }
      }

      const updateServiceType = await RentalPackage.findOneAndUpdate(
        {
          _id: rentalPackage._id,
          'serviceTypes.serviceType': { $ne: mongoose.Types.ObjectId(serviceTypeId) }
        },
        { $push: { serviceTypes: serviceTypeData } },
        { new: true, runValidators: true }
      )

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATED_SERVICE_TYPE_RENTAL'
      )({ message: 'CREATED|SERVICE_TYPE_RENTAL', package: updateServiceType })
    } catch (error) {
      console.log('error', error)

      return requestHandler.sendError(req, res, error)
    }
  }

  static updateRentalPackage = async (req, res) => {
    try {
      const body = req.body
      console.log('body', JSON.stringify(body))

      const { packageId } = req.params

      packageId && (body.packageId = packageId)
      const packageValidation = await RentalValidator.validateData(body, 'updateRentalPackage')
      if (!packageValidation.status) return requestHandler.sendError(req, res, packageValidation.data)

      const rentalPackage = await RentalPackage.findOne({ _id: packageId })
      if (!rentalPackage) throw new Error('NOT_FOUND|RENTAL_PACKAGE')

      rentalPackage.name = body.name || rentalPackage.name
      rentalPackage.description = body.description || rentalPackage.description
      rentalPackage.serviceAreaIds = body.serviceArea
        ? body.serviceArea.split(',')
        : rentalPackage.serviceAreaIds
      rentalPackage.distance = body.distance || rentalPackage.distance
      rentalPackage.time = body.time || rentalPackage.time

      const updatedPackage = await rentalPackage.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATED_RENTAL_PACKAGE'
      )({ message: 'UPDATED|RENTAL_PACKAGE', package: updatedPackage })
    } catch (error) {}
  }

  static updateService = async (req, res) => {
    try {
      const body = req.body
      const { packageId, serviceTypeId } = req.params

      serviceTypeId && (body.serviceType = serviceTypeId)
      const packageValidation = await RentalValidator.validateData(body, 'updateServiceType')
      if (!packageValidation.status) return requestHandler.sendError(req, res, packageValidation.data)

      const rentalPackage = await RentalPackage.findOne({
        _id: packageId,
        'serviceTypes.serviceType': serviceTypeId
      })
      if (!rentalPackage) throw new Error('NOT_FOUND|RENTAL_PACKAGE')

      const serviceTypeIndex = rentalPackage.serviceTypes.findIndex(
        (data) => data.serviceType.toString() === serviceTypeId
      )

      if (serviceTypeIndex === -1) throw new Error('NOT_FOUND|SERVICE_TYPE')

      rentalPackage.serviceTypes[serviceTypeIndex].baseFare =
        body.baseFare || rentalPackage.serviceTypes[serviceTypeIndex].baseFare
      rentalPackage.serviceTypes[serviceTypeIndex].cancellationFarePartner =
        body.cancellationFarePartner || rentalPackage.serviceTypes[serviceTypeIndex].cancellationFarePartner
      rentalPackage.serviceTypes[serviceTypeIndex].cancellationFareRider =
        body.cancellationFareRider || rentalPackage.serviceTypes[serviceTypeIndex].cancellationFareRider
      rentalPackage.serviceTypes[serviceTypeIndex].distanceFare =
        body.distanceFare || rentalPackage.serviceTypes[serviceTypeIndex].distanceFare
      rentalPackage.serviceTypes[serviceTypeIndex].timeFare =
        body.timeFare || rentalPackage.serviceTypes[serviceTypeIndex].timeFare
      rentalPackage.serviceTypes[serviceTypeIndex].bookingFare =
        body.bookingFare || rentalPackage.serviceTypes[serviceTypeIndex].bookingFare
      rentalPackage.serviceTypes[serviceTypeIndex].commision =
        body.commision || rentalPackage.serviceTypes[serviceTypeIndex].commision
      rentalPackage.serviceTypes[serviceTypeIndex].taxFare.status =
        body.taxFare?.status ?? rentalPackage.serviceTypes[serviceTypeIndex].taxFare.status
      rentalPackage.serviceTypes[serviceTypeIndex].taxFare.fare =
        body.taxFare?.fare ?? rentalPackage.serviceTypes[serviceTypeIndex].taxFare.fare
      rentalPackage.serviceTypes[serviceTypeIndex].waitingFare.status =
        body.waitingFare?.status ?? rentalPackage.serviceTypes[serviceTypeIndex].waitingFare.status
      rentalPackage.serviceTypes[serviceTypeIndex].waitingFare.fare =
        body.waitingFare?.fare ?? rentalPackage.serviceTypes[serviceTypeIndex].waitingFare.fare
      rentalPackage.serviceTypes[serviceTypeIndex].waitingFare.allowedTime =
        body.waitingFare?.allowedTime ?? rentalPackage.serviceTypes[serviceTypeIndex].waitingFare.allowedTime

      const updatedPackage = await rentalPackage.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATED_SERVICE_TYPE'
      )({ message: 'UPDATED|SERVICE_TYPE', package: updatedPackage })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteRentalPackage = async (req, res) => {
    try {
      const { packageId, serviceTypeId } = req.params
      let message
      let update = {}

      if (!serviceTypeId) {
        update.deletedAt = new Date()
        message = 'RENTAL_PACKAGE'
      } else {
        update = {
          $pull: { serviceTypes: { serviceType: mongoose.Types.ObjectId(serviceTypeId) } }
        }
        message = 'SERVICE_TYPE'
      }

      const updatedPackage = await RentalPackage.findOneAndUpdate({ _id: packageId }, update, {
        new: true,
        runValidators: true
      })

      if (!updatedPackage) throw new Error(`NOT_FOUND|${message}`)

      return requestHandler.sendSuccess(
        req,
        res,
        `DELETED_${message}`
      )({ message: `DELETED|${message}`, package: updatedPackage })
    } catch (error) {
      console.log(error)

      return requestHandler.sendError(req, res, error)
    }
  }

  static getPackages = async (req, res) => {
    try {
      const {
        pickupLat: lat,
        pickupLng: lng,
        limit = 10,
        page = 1,
        serviceTypeId = null,
        ...filters
      } = req.query
      const skip = (Number(page) - 1) * Number(limit)
      const packageId = req.params.packageId
      let rentalPackage

      const validation = await RentalValidator.validateData(req.query, 'getRentalPackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryData = await this.queryBuilder(filters)
      if (!queryData) throw new Error(queryData.message)
      const findCondition = queryData.data

      if (lat && lng) {
        const pickupLat = parseFloat(lat)
        const pickupLng = parseFloat(lng)
        const pickupLocationArr = [pickupLng, pickupLat]

        const serviceCity = await ServiceModuleController.checkServiceArea(pickupLocationArr)
        findCondition.serviceAreaIds = { $in: [serviceCity._id] }
      }

      if (packageId) {
        findCondition._id = packageId
      }
      console.log('findCondition', JSON.stringify(findCondition))
      rentalPackage = await RentalPackage.find(findCondition)
        .limit(limit)
        .skip(skip)
        .sort({
          distanceLimit: 1
        })
        .lean()
      // Filter packages by service type name
      if (serviceTypeId) {
        rentalPackage = rentalPackage
          .map((pkg) => {
            pkg.serviceTypes = pkg.serviceTypes.filter(
              (type) =>
                type.serviceType !== null &&
                mongoose.Types.ObjectId(type.serviceType._id).equals(mongoose.Types.ObjectId(serviceTypeId))
            )
            return pkg
          })
          .filter((pkg) => pkg.serviceTypes.length > 0)
      } else {
        rentalPackage = rentalPackage.map((pkg) => {
          pkg.serviceTypes = pkg.serviceTypes.filter((type) => type.serviceType !== null)
          return pkg
        })
      }

      if (!rentalPackage.length) throw new Error('NOT_FOUND|RENTAL_PACKAGE')

      const count = rentalPackage.length

      const returnData = {
        message: 'LISTED|RENTAL_PACKAGE',
        package: rentalPackage,
        count,
        distanceMetric: Config.app.distanceMetric
      }

      return requestHandler.sendSuccess(req, res, 'RENTAL_PACKAGE_LISTED')(returnData)
    } catch (error) {
      console.log(error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getService = async (req, res) => {
    try {
      const { packageId, serviceTypeId } = req.params
      const body = req.body

      packageId && (body.packageId = packageId)
      serviceTypeId && (body.serviceTypeId = serviceTypeId)

      const validation = await RentalValidator.validateData(body, 'getService')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const rentalPackage = await RentalPackage.findOne(
        { _id: packageId, deletedAt: null },
        { serviceTypes: { $elemMatch: { serviceType: serviceTypeId } } }
      )

      if (!rentalPackage?.serviceTypes.length) throw new Error('NOT_FOUND|SERVICE_TYPE')

      const serviceType = rentalPackage.serviceTypes[0]

      return requestHandler.sendSuccess(
        req,
        res,
        'LISTED_SERVICE_TYPE'
      )({ message: 'LISTED|SERVICE_TYPE', package: serviceType })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getEstimation = async (req, res) => {
    try {
      const queryData = req.query
      const pickupLat = parseFloat(queryData.pickupLat)
      const pickupLng = parseFloat(queryData.pickupLng)
      const pickupLocationArr = [pickupLng, pickupLat]

      const serviceCity = await ServiceModuleController.checkServiceArea(pickupLocationArr)

      const rentalPackage = await RentalPackage.findOne({
        _id: mongoose.Types.ObjectId(queryData.packageId),
        deletedAt: null
      }).populate('serviceTypes.serviceType')

      if (!rentalPackage) throw new Error('NOT_FOUND|RENTAL_PACKAGE')

      let coupon
      if (queryData.coupon) {
        const checkCoupon = await CreteriaService.isValidCoupon({
          coupon: queryData.coupon,
          serviceCity: serviceCity._id
        })
        if (!checkCoupon.status) throw new Error(checkCoupon.message)
        coupon = checkCoupon.data
      }

      const serviceTypes = []
      const unitDistance = rentalPackage.distance
      const unitTime = rentalPackage.time

      for (const serviceTypeData of rentalPackage.serviceTypes) {
        const serviceType = serviceTypeData.serviceType
        if (queryData.isScheduleLater && !serviceType.scheduleLater) continue

        if (serviceType.status === 'Un-available') continue

        const pricingInfo = await this.getPricing({
          unitDistance,
          unitTime,
          pricingId: serviceTypeData._id,
          coupon,
          body: queryData
        })

        if (!pricingInfo.status) throw new Error(pricingInfo.message)
        let currencyData = {}
        currencyData = await Currency.findOne({
          _id: mongoose.Types.ObjectId(pricingInfo.data.pricingData.currencyId)
        })
          .lean()
          .exec()

        const vehicleDetails = {
          _id: serviceTypeData._id,
          packageId: rentalPackage._id,
          distance: rentalPackage.distance,
          time: rentalPackage.time,
          vehicleId: serviceType._id,
          vehicleName: serviceType.name,
          VehicleDescription: serviceType.description,
          vehicleImage: serviceType.image,
          seats: serviceType.seats,
          features: serviceType.features,
          scheduleLater: serviceType.scheduleLater,
          topViewImage: serviceType.topViewImage,
          nearByVehicles: [],
          arraivalTime: '0',

          pricing: {
            additional: pricingInfo.data.estimation.additional || [],
            distance: queryData.distance ? queryData.distance : rentalPackage.distance,
            distanceFare: pricingInfo.data?.estimation?.distanceFare,
            currency: currencyData,
            time: queryData.time ? queryData.time : rentalPackage.time,
            unitTimeFare: pricingInfo.data.pricingData.timeFare,
            timeFare: pricingInfo.data.estimation.timeFare,
            minimumFare: pricingInfo.data.pricingData.minimumFare,
            baseFare: pricingInfo.data.pricingData.baseFare,
            bookingFare: pricingInfo.data.estimation.bookingFare,
            additionalFare: pricingInfo.data.estimation.additionalFare
              ? pricingInfo.data.estimation.additionalFare
              : 0,
            discountFare: pricingInfo.data.estimation.discountFare
              ? pricingInfo.data.estimation.discountFare
              : 0,
            offers: pricingInfo.data.estimation.offers ? pricingInfo.data.estimation.offers : [],
            actualFare: pricingInfo.data.estimation.actualFare ? pricingInfo.data.estimation.actualFare : 0,
            taxFare: pricingInfo.data.estimation.taxFare ? pricingInfo.data.estimation.taxFare : 0,
            totalFare: pricingInfo.data.estimation.totalFare ? pricingInfo.data.estimation.totalFare : 0,
            roundOff: pricingInfo.data.estimation.roundOff ? pricingInfo.data.estimation.roundOff : 0
          }
        }

        serviceTypes.push(vehicleDetails)
      }
      console.log('serviceTypes--------', JSON.stringify(serviceTypes))
      return requestHandler.sendSuccess(
        req,
        res,
        'ESTIMATION'
      )({ message: 'ESTIMATION', packages: serviceTypes })
    } catch (error) {
      console.log(error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPricing = async (pricing) => {
    const response = {
      status: false,
      message: 'UNPROCESSABLE_ENTITY',
      data: {}
    }
    try {
      const { unitDistance, unitTime, pricingId, coupon, body } = pricing

      const rentalPackage = await RentalPackage.aggregate([
        { $unwind: '$serviceTypes' },
        { $match: { 'serviceTypes._id': pricingId } }
      ])

      if (!rentalPackage) throw new Error('NOT_FOUND|PACKAGE')
      const packageData = rentalPackage[0]
      const pricingData = packageData.serviceTypes

      // Extract fare details from rental package
      const allowedDistance = packageData.distance
      const allowedTime = packageData.time
      const baseFare = pricingData.baseFare || 0
      const distanceFare = pricingData.distanceFare || 0
      const timeFare = pricingData.timeFare || 0
      const taxFare = pricingData.taxFare || { status: false, fare: 0 }
      const waitingFare = pricingData.waitingFare || { status: false, fare: 0, allowedTime: 0 }
      const bookingFare = pricingData.bookingFare || 0
      const commision = pricingData.commision || 0

      // estimation
      const estimation = {
        distanceFare: 0,
        timeFare: 0,

        baseFare: baseFare || 0,
        bookingFare: 0,
        minimumFare: 0,

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
        payable: 0,
        earnings: 0
      }

      // Booking Fare
      if (body.isScheduleLater || body.isScheduleLater === '1') {
        estimation['bookingFare'] = bookingFare
      }

      // Waiting Fare
      if (waitingFare.status && body.waitingTime && body.waitingTime > waitingFare.allowedTime) {
        estimation['waitingFare'] = Helpers.roundOff(
          (body.waitingTime - waitingFare.allowedTime) * waitingFare.fare
        )
        estimation.additionalFeeArr.push({
          status: true,
          name: 'Waiting Charge',
          fareType: 'amount',
          fare: estimation['waitingFare']
        })
      }

      // Extra Distance and Extra Hour fare
      if (unitDistance || unitTime) {
        if (unitDistance > allowedDistance) {
          const extraDistance = unitDistance - allowedDistance
          estimation['additionalFeeArr'].push({
            status: true,
            name: 'Extra Distance Fare',
            fareType: 'amount',
            actual: 0,
            fare: Helpers.roundOff(extraDistance * distanceFare),
            extraDistance: extraDistance,
            extraFare: distanceFare
          })
        }
        if (unitTime > allowedTime) {
          const extraTime = unitTime - allowedTime
          estimation['additionalFeeArr'].push({
            status: true,
            name: 'Extra Time Fare',
            fareType: 'amount',
            actual: 0,
            fare: Helpers.roundOff(extraTime * timeFare),
            extraTime: extraTime,
            extraFare: timeFare
          })
        }
      }

      estimation['actualFare'] =
        parseFloat(estimation.distanceFare) +
        parseFloat(estimation.timeFare) +
        parseFloat(estimation.baseFare) +
        parseFloat(estimation.bookingFare)

      estimation['actualFare'] = Helpers.roundOff(estimation['actualFare'])

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

      // TaxFare
      if (taxFare.status) {
        const tax = (estimation['totalFare'] * taxFare.fare) / 100

        estimation['taxFare'] = Helpers.roundOff(tax)

        estimation['totalFare'] = estimation['actualFare'] = Helpers.roundOff(
          estimation['totalFare'] + estimation['taxFare']
        )
      }

      // Discount Fare
      if (coupon) {
        let discountFare = 0
        if (coupon.fare.type === 'FlatRate') {
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

      // Round Off
      estimation['roundOff'] = Helpers.roundOff(Math.round(estimation['totalFare']) - estimation['totalFare'])
      estimation['totalFare'] = Math.round(estimation['totalFare'])

      estimation['commision'] = Helpers.roundOff(
        (estimation['totalFare'] - estimation['taxFare']) * (commision / 100)
      )

      estimation['earnings'] =
        estimation['commision'] +
        estimation['taxFare'] +
        estimation['bookingFare'] -
        estimation['discountFare']
      estimation['earnings'] = Helpers.roundOff(estimation['earnings'])
      estimation['payable'] = Helpers.roundOff(estimation['totalFare'] - estimation['earnings'])
      // console.log("pricingData----------",JSON.stringify(pricingData));
      response.status = true
      response.message = 'PRICING_GIVEN'
      response.data = {
        estimation,
        body,
        pricingData
      }
    } catch (error) {
      console.log('error', error)
      response.status = false
      response.message = error.message
      response.data = {}
    }
    return response
  }

  static getInvoice = async (tripData, body) => {
    const response = {
      status: false,
      message: 'UNPROCESSABLE_ENTITY',
      data: {}
    }
    try {
      let coupon = null

      const dropLocations = body.latitude + ',' + body.longitude
      const dropLocationsArr = [body.latitude, body.longitude]
      const pickupLocations = tripData.partner.startLocation[1] + ',' + tripData.partner.startLocation[0]

      const routePath = await ServiceTracker.findOne({ requestId: tripData._id })
      let routePathDistance = await MapServices.calculateLinestringLength(
        routePath?.dropPolyline?.coordinates || [],
        {
          distanceMetric: tripData.distanceMetric
        }
      )

      if (body.endTime == undefined) body.endTime = Helpers.getISODate()
      routePathDistance = parseFloat(routePathDistance).toFixed(2)
      let routePathTime = Math.round(
        ((((new Date(tripData?.partner?.startTime) || new Date()) - (new Date(body.endTime) || new Date())) %
          86400000) %
          3600000) /
          60000
      ) // In Minutes
      routePathTime = parseFloat(routePathTime).toFixed(2)

      const travelInfo = await MapServices.getLocationData([pickupLocations], [dropLocations], {
        distanceMetric: tripData.distanceMetric
      })
      // if (!travelInfo) throw new Error('DISTANCE_CALCULATION_FAILED')

      let unitDistance = travelInfo?.data?.distanceValue || 0
      let unitTime = travelInfo?.data?.timeValue || 0
      console.log(body.endMeter, tripData, tripData.additionalDetails?.startMeter)
      const endMeter = Number(body.endMeter) || 0
      const startMeter = Number(tripData.additionalDetails?.startMeter)
      const disDiff = Math.abs(endMeter - startMeter)

      // unitDistance = unitDistance > routePathDistance ? unitDistance : routePathDistance
      unitDistance = Math.max(unitDistance, routePathDistance, disDiff)
      unitTime = unitTime > routePathTime ? unitTime : routePathTime

      console.log(unitDistance, routePathDistance, disDiff)

      // Add Coupon
      if (tripData.estimation.coupon) {
        const checkCoupon = await CreteriaService.isValidCoupon({
          coupon: tripData.estimation.coupon,
          serviceCity: tripData.service
        })
        if (checkCoupon.status) coupon = checkCoupon.data
      }

      const priceInfo = await this.getPricing({
        unitDistance,
        unitTime,
        pricingId: tripData.servicePricing,
        coupon,
        body
      })

      if (!priceInfo.status) throw new Error('CONTACT_ADMIN')

      const invoiceData = {
        distance: unitDistance,
        estTime: unitTime,
        start: travelInfo?.data?.originLabel || tripData.estimation.start,
        end: travelInfo?.data?.destinationLabel || tripData.estimation.start,
        startcoords: tripData.estimation.startcoords,
        endcoords: dropLocationsArr,

        fareType: tripData.estimation.fareType,
        fareAmt: priceInfo.data.estimation.distanceFare || 0,
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
        coupon: tripData.estimation.coupon || '',

        roundOff: priceInfo.data.estimation.roundOff,
        totalFare: priceInfo.data.estimation.totalFare,

        commision: priceInfo.data.estimation.commision,
        earnings: priceInfo.data.estimation.earnings,
        payable: priceInfo.data.estimation.payable
      }

      // Route Image Generation
      const routeImage = `public/services/routes/${tripData._id}.png`
      let getRoute = []
      if (routePath?.dropPolyline && routePath.dropPolyline.coordinates.length > 0) {
        getRoute = routePath.dropPolyline.coordinates.map((data) => `${data[1]},${data[0]}`)
      }
      Promise.resolve(getRoute)
        .then((getRouteOptimized) => {
          MapServices.routeImage({
            storage: `./${routeImage}`,
            pickupLocation: {
              lat: tripData.partner.startLocation[1],
              lng: tripData.partner.startLocation[0]
            },
            dropLocation: { lat: body.latitude, lng: body.longitude },
            paths: getRouteOptimized
          })
        })
        .catch((error) => console.log('ROUTE_IMAGE_GENERATION_ERROR: ', error))

      if (priceInfo?.data?.estimation?.discountFare > 0) {
        CreteriaService.applyCoupon({
          coupon: tripData.estimation.coupon,
          referenceId: tripData._id,
          module: 'TRIP',
          amount: priceInfo?.data?.estimation?.discountFare,
          userId: tripData.customer.id,
          userRole: Enum.ROLES.CUSTOMER
        })
      }
      response.status = true
      response.message = 'INVOICE'
      response.data = {
        invoiceData,
        routeImage
      }
    } catch (error) {
      console.error('CALCULATE_FINAL_AMOUNT_ERROR:', error)
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

  // static createRequest = async (req, res) => {
  //   try {
  //     const body = req.body || {}
  //     const auth = req.auth || {}

  //     const validation = await RentalValidator.createRequest(body)
  //     if (!validation.status) return requestHandler.sendError(req, res, validation.data)

  //     let customerId
  //     if (auth.role == 'ADMIN') {
  //       customerId = req.body.id
  //     } else {
  //       customerId = auth.userId
  //     }

  //     const pickupLocationArr = [body.pickupLng, body.pickupLat]

  //     let coupon = null

  //     // check already trip exist
  //     const serviceCity = await ServiceModuleController.checkServiceArea(pickupLocationArr)

  //     const rentalPackage = await RentalPackage.aggregate([
  //       {
  //         $unwind: '$serviceTypes'
  //       },
  //       {
  //         $match: { 'serviceTypes._id': mongoose.Types.ObjectId(body.vehicleId) }
  //       }
  //     ])

  //     if (!rentalPackage) throw new Error('NOT_FOUND|RENTAL_PACKAGE')

  //     const getServiceType = await RentalPackage.populate(rentalPackage, [
  //       { path: 'serviceTypes.serviceType', select: 'name' }
  //     ])

  //     const serviceType = getServiceType[0].serviceTypes.serviceType

  //     const customerData = await Customer.findOne({ _id: customerId }).exec()
  //     if (!customerData) throw new ServiceModuleError('NOT_FOUND|CUSTOMER')

  //     const unitDistance = rentalPackage[0].distance
  //     const distanceMetric = Config.app.distanceMetric
  //     const unitTime = rentalPackage[0].time

  //     const experience = await Helpers.getDateDifference(new Date(customerData.createdAt), new Date())

  //     if (body.coupon) {
  //       const checkCoupon = await CreteriaService.isValidCoupon({
  //         coupon: body.coupon,
  //         serviceCity: serviceCity.id
  //       })
  //       if (!checkCoupon.status) throw new Error(checkCoupon.message)
  //       coupon = checkCoupon.data
  //     }

  //     const scheduleOn = body.scheduleOn && body.scheduleOn != '' ? new Date(body.scheduleOn) : new Date()
  //     // scheduleOn.setTime(scheduleOn.getTime() + 30 * 60 * 1000)
  //     scheduleOn.setSeconds(0)

  //     const priceInfo = await this.getPricing({
  //       unitDistance,
  //       unitTime,
  //       pricingId: rentalPackage[0].serviceTypes._id,
  //       coupon: coupon,
  //       body
  //     })
  //     console.log('priceInfo', JSON.stringify(priceInfo))

  //     if (!priceInfo.status) throw new Error(priceInfo.message)

  //     const estimateData = {
  //       distance: unitDistance,
  //       estTime: unitTime,
  //       start: body.pickupAddress || '',
  //       end: body.dropAddress || '',
  //       startcoords: pickupLocationArr || [0, 0],
  //       endcoords: [0, 0],

  //       fareType: '',
  //       fareAmt: 0,
  //       timeFare: priceInfo.data.estimation.timeFare,
  //       baseFare: priceInfo.data.estimation.baseFare,
  //       bookingFare: priceInfo.data.estimation.bookingFare,
  //       minimumFare: priceInfo.data.estimation.minimumFare,
  //       cancelationFare: 0,
  //       waitingFare: priceInfo.data.estimation.waitingfare ? priceInfo.data.estimation.waitingfare : 0,

  //       taxFare: priceInfo.data.estimation.taxFare ? priceInfo.data.estimation.taxFare : 0,
  //       additionalFare: priceInfo.data.estimation.additionalFare
  //         ? priceInfo.data.estimation.additionalFare
  //         : 0,
  //       additional: priceInfo.data.estimation.additional,
  //       actualFare: priceInfo.data.estimation.actualFare ? priceInfo.data.estimation.actualFare : 0,

  //       discountFare: priceInfo.data.estimation.discountFare ? priceInfo.data.estimation.discountFare : 0,
  //       offers: priceInfo.data.estimation.offers ? priceInfo.data.estimation.offers : [],
  //       coupon: body.coupon || '',

  //       roundOff: priceInfo.data.estimation.roundOff ? priceInfo.data.estimation.roundOff : 0,
  //       totalFare: priceInfo.data.estimation.totalFare ? priceInfo.data.estimation.totalFare : 0,

  //       commision: priceInfo.data.estimation.commision,
  //       earnings: priceInfo.data.estimation.earnings,
  //       payable: priceInfo.data.estimation.payable
  //     }

  //     priceInfo.data.pricingData.serviceId = serviceCity._id

  //     const tripObj = {
  //       body,
  //       priceInfo,
  //       serviceType,
  //       scheduleOn,
  //       distanceMetric,
  //       customerId,
  //       customerData,
  //       experience,
  //       auth,
  //       estimateData
  //     }

  //     const responseData = await ServiceModuleController.sendRequest(tripObj)

  //     return requestHandler.sendSuccess(
  //       req,
  //       res,
  //       'CREATE_REQUEST'
  //     )({
  //       message: 'TAXI_REQUEST_SENDED',
  //       requestId: responseData.tripdata._id,
  //       referenceNo: responseData.tripdata.referenceNo,
  //       isScheduleLater: responseData.tripdata.isScheduleLater
  //     })
  //   } catch (error) {
  //     console.log('CREATE_REQUEST', error)
  //     return requestHandler.sendError(req, res, error)
  //   }
  // }

  static createRequest = async (req, res) => {
    try {
      const body = req.body || {}
      const auth = req.auth || {}
      console.log('body', body)

      const validation = await RentalValidator.validateData(body, 'createRequest')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const customerId = auth && auth.role === Enum.ROLES.ADMIN ? body.id : auth.userId

      const pickupLocationArr = [body.pickupLng, body.pickupLat]

      let coupon = null

      // check already trip exist
      const serviceCity = await ServiceModuleController.checkServiceArea(pickupLocationArr)

      const rentalPackage = await RentalPackage.aggregate([
        {
          $unwind: '$serviceTypes'
        },
        {
          $match: {
            'serviceTypes.serviceType': mongoose.Types.ObjectId(body.vehicleId)
            // 'serviceTypes.serviceType': { $ne: null }
          }
        }
      ])

      if (rentalPackage.length == 0) throw new Error('NOT_FOUND|RENTAL_PACKAGE')

      const getServiceType = await RentalPackage.populate(rentalPackage, [
        { path: 'serviceTypes.serviceType', select: 'name status' }
      ])
      const serviceType = getServiceType[0].serviceTypes.serviceType
      if (!serviceType || serviceType.status === 'Un-available') throw new Error('SERVICE_TYPE_NOT_SUPPORTED')

      const customerData = await Customer.findOne({ _id: customerId }).exec()
      if (!customerData) throw new ServiceModuleError('NOT_FOUND|CUSTOMER')

      const unitDistance = rentalPackage[0].distance
      const distanceMetric = Config.app.distanceMetric
      const unitTime = rentalPackage[0].time

      const experience = Helpers.getDateDifference(new Date(customerData.createdAt), new Date())

      if (body.coupon) {
        const checkCoupon = await CreteriaService.isValidCoupon({
          coupon: body.coupon,
          serviceCity: serviceCity.id
        })
        if (!checkCoupon.status) throw new Error(checkCoupon.message)
        coupon = checkCoupon.data
      }

      const scheduleOn =
        body.scheduleOn && body.scheduleOn != '' ? new Date(body.scheduleOn) : new Date(Helpers.getISODate())
      // scheduleOn.setTime(scheduleOn.getTime() + 30 * 60 * 1000)
      scheduleOn.setSeconds(0)

      const priceInfo = await this.getPricing({
        unitDistance,
        unitTime,
        pricingId: rentalPackage[0].serviceTypes._id,
        coupon: coupon,
        body
      })

      if (!priceInfo.status) throw new Error(priceInfo.message)

      const estimateData = {
        distance: unitDistance,
        estTime: unitTime,
        start: body.pickupAddress || '',
        end: body.dropAddress || '',
        startcoords: pickupLocationArr || [0, 0],
        endcoords: [0, 0],

        fareType: '',
        fareAmt: 0,
        timeFare: priceInfo.data.estimation.timeFare,
        baseFare: priceInfo.data.estimation.baseFare,
        bookingFare: priceInfo.data.estimation.bookingFare,
        minimumFare: priceInfo.data.estimation.minimumFare,
        cancelationFare: 0,
        waitingFare: priceInfo.data.estimation.waitingfare ? priceInfo.data.estimation.waitingfare : 0,

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
        payable: priceInfo.data.estimation.payable
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
      const additionalData = {
        packagename: getServiceType[0].name
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
        estimateData: estimateData,
        additionalData: additionalData
      }
      const responseData = await ServiceModuleController.sendRequest(tripObj)

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
      console.log('CREATE_REQUEST', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateTripstatus = async (req, res) => {
    try {
      const body = req.body || {}
      const auth = req.auth || {}
      // const validation = await TripValidator.updateRequest(body)
      // if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const tripdata = await ServiceModuleController.getTripdetails(body.requestId)

      const partnerInfo = await Partner.findOne({ _id: tripdata[0].partner.id }).exec()
      if (!partnerInfo) throw new Error('NOT_FOUND|PARTNER')

      body.status = Number(body.status)
      const shareLink = 'https://rebustar.abservetechdemo.com/#/share-trip/' + tripdata[0]._id
      const additionalObj = { ...tripdata[0].additionalDetails } // Create a shallow COPY
      const tripObj = {
        body: body,
        tripdata: tripdata,
        auth: auth
      }
      // If Partner Arrived
      if (Number(body.status) == 1) {
        const responseData = await ServiceModuleController.updateRequest(tripObj)
        requestHandler.sendSuccess(
          req,
          res,
          responseData.msg
        )({
          status: responseData.status,
          requestId: body.requestId,
          module: tripdata[0].module,
          shareLink: shareLink,
          requestPin: tripdata[0].customer.requestPin
        })
      }
      // If Partner Trip Started : Progress
      else if (body.status == 2) {
        if (!body.startMeter) {
          throw new ServiceModuleError('PLEASE_ENTER_START_METER')
        }
        additionalObj.startMeter = Number(body.startMeter)
        // additionalObj.waitingTime = (new Date() - tripdata[0].partner.arriveTime) / (1000 * 60) || 0 // In Minutes
        additionalObj.waitingTime = body.waitingTime
        tripObj.additionalObj = additionalObj
        const responseData = await ServiceModuleController.updateRequest(tripObj)
        requestHandler.sendSuccess(
          req,
          res,
          responseData.msg
        )({
          status: responseData.status,
          requestId: body.requestId,
          module: tripdata[0].module,
          shareLink: shareLink
        })
      }
      // If Partner Trip Ended : Complete
      else if (body.status == 3) {
        const distanceKMFromMeter = Number(body.endMeter) - Number(body.startMeter)
        if (Number(distanceKMFromMeter) < 0) {
          throw new ServiceModuleError('END_METER_SHOULD_BE_GREATER_THAN_START')
        }
        additionalObj.endMeter = Number(body.endMeter)
        // body.waitingTime = Number(body.waitingTime) + Number(tripdata[0].additionalDetails.waitingTime)
        additionalObj.waitingTime = body.waitingTime
        // additionalObj.waitingTime = Number(body.waitingTime.toFixed(2))
        tripObj.additionalObj = { ...tripdata[0].additionalDetails, ...additionalObj }
        const getInvoice = await this.getInvoice(tripdata[0], body, tripdata[0].customer)
        if (!getInvoice?.status) throw new Error(getInvoice.message)
        tripObj.getInvoice = getInvoice
        const responseData = await ServiceModuleController.updateRequest(tripObj)
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
      console.log(error, 'ERROR')

      return requestHandler.sendError(req, res, error)
    }
  }
}

export { RentalPackageController }
