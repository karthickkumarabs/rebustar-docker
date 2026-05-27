/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import { OutstationValidator } from '../validators/OutstationValidator.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import mongoose from 'mongoose'
import Outstation from '../models/Outstation.js'
import { MapServices } from '../../../modules/Map/index.js'
import { TripValidator } from '../../../validators/serviceModule/TripValidator.js'
import ServiceArea from '../../../models/Creteria/ServiceArea.js'
import { Config } from '../../../config/AppConfig.js'
import { Helpers } from './../../../helpers/Function.js'

import { CreteriaService } from '../../../services/Creteria/CreteriaServices.js'

import ServiceTracker from './../../../models/ServiceModule/ServiceTracker.js'

import Customer from '../../../models/Auth/Customer.js'
import Partner from '../../../models/Auth/Partner.js'
import ServiceType from '../../../models/Creteria/ServiceType.js'
import { ServiceModuleController as ServiceModule } from '../../../controllers/ServiceModule/ServiceModuleController.js'
import { AuthendicationError, ServiceModuleError } from '../../../utils/ErrorHandler.js'

import { Enum } from '../../../utils/Enum.js'
import Currency from '../../../models/DataStore/Currency.js'
import { insidePolygon } from 'geolocation-utils'
import { BookingforothersController } from '../../Bookingforothers/controllers/BookingforothersController.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class OutStationPacakgeController extends BaseController {
  constructor() {
    super()
  }
  static getFareTimeFallsIn = function (duration, now, forType = 'peak') {
    const defaultResObj = { status: false, name: '', fareType: '', actual: 0, fare: 0 }
    let resObj = { ...defaultResObj }
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
      resObj = { ...defaultResObj }
    }
    return resObj
  }
  static createOutstationPackage = async (req, res) => {
    try {
      const body = req.body
      const validation = await OutstationValidator.validateData(body, 'createOutstationPackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const newPackage = new Outstation({
        packageName: body.packageName,
        hours: body.hours,
        distance: body.distance,
        serviceType: body.serviceType,
        serviceArea: body.serviceArea
      })

      const createdPackage = await newPackage.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_OUTSTATION_PACKAGE'
      )({ message: 'CREATED|OUTSTATION', newDoc: createdPackage })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getOutstationPackage = async (req, res) => {
    try {
      //  console.log('Comming over here')

      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0
      const validation = await OutstationValidator.validateData(queryData, 'getOutstationPackage')
      console.log('validation', validation)
      // if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryObj = {}
      if (paramData.packageId) queryObj['_id'] = mongoose.Types.ObjectId(paramData.packageId)
      if (queryData.serviceArea) queryObj['serviceArea'] = mongoose.Types.ObjectId(queryData.serviceArea)

      // filter

      Object.keys(queryData).forEach((key) => {
        const value = queryData[key]
        if (key !== 'page' && key !== 'limit' && key !== 'serviceArea') {
          if (key === 'hours' || key === 'distance') {
            // Ensure numeric fields are treated correctly
            queryObj[key] = parseInt(value, 10)
          } else {
            queryObj[key] = new RegExp(value, 'i') // Apply regex only to string fields
          }
        }
      })
      //  console.log(queryObj,"query")

      const getCount = await Outstation.countDocuments(queryObj)
      const getData = await Outstation.find(queryObj)
        .populate({
          path: 'serviceType.serviceType',
          select: 'name'
        })
        .skip(skip)
        .limit(perPage)

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PACKAGE'
      )({
        message: 'LISTED|PACKAGE',
        outstationPackage: getData.map((outstation) => {
          return {
            ...outstation._doc,
            serviceType: outstation.serviceType.map((service) => ({
              ...service._doc,
              serviceType: service.serviceType.name
            }))
          }
        }),
        total: getCount
      })
    } catch (error) {
      // console.log("ERR",error);
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteOutstationPackage = async (req, res) => {
    try {
      const packageId = req.params.packageId || req.body.packageId
      const deleteOutstation = await Outstation.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(packageId), deletedAt: null },
        { deletedAt: new Date() },
        { new: true }
      ).exec()
      if (!deleteOutstation) throw new Error('NOT_FOUND|OFFER')

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_PACKAGE'
      )({ message: 'DELETED|PACKAGE', outstation: deleteOutstation })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateOutstationPackage = async (req, res) => {
    try {
      const body = req.body
      // console.log('body', body)
      const packageId = req.params.packageId || req.query.packageId

      const validation = await OutstationValidator.validateData(body, 'updateOutstationPackage')
      // console.log(validation)
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const outstationPackage = await Outstation.findById(packageId).exec()
      if (!outstationPackage) throw new Error('NOT_FOUND|OUTSTATION_PACKAGE')

      outstationPackage.packageName = body.packageName || outstationPackage.packageName
      outstationPackage.hours = body.hours || outstationPackage.hours
      outstationPackage.distance = body.distance || outstationPackage.distance
      outstationPackage.serviceType = body.serviceType || outstationPackage.serviceType
      outstationPackage.serviceArea = body.serviceArea || outstationPackage.serviceArea
      const updatedOutstationPackage = await outstationPackage.save()
      // console.log(updatedOutstationPackage)

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_OUTSTATION_PACKAGE'
      )({ message: 'UPDATED|OUTSTATION_PACKAGE', outstationPackage: updatedOutstationPackage })
    } catch (error) {
      // console.log(error)

      return requestHandler.sendError(req, res, error)
    }
  }

  static getVehicles = async (req, res) => {
    try {
      const packageId = req.params.packageId || req.query.packageId
      const serviceTypeId = req.params.serviceTypeId || req.query.serviceTypeId

      const outstationPackage = await Outstation.findById(packageId)
      if (!outstationPackage) {
        throw new Error('Outstation Package not found')
      }
      if (serviceTypeId) {
        const serviceType = outstationPackage.serviceType.id(serviceTypeId)
        if (!serviceType) {
          throw new Error('Service Type not found')
        }

        return requestHandler.sendSuccess(
          req,
          res,
          'GET_OUTSTATION_PACKAGE'
        )({ message: 'GET|OUTSTATION_PACKAGE', outstationPackage: serviceType })
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_OUTSTATION_PACKAGE'
      )({ message: 'UPDATED|OUTSTATION_PACKAGE', outstationPackage: outstationPackage })
    } catch (error) {
      // console.log(error)

      return requestHandler.sendError(req, res, error)
    }
  }

  static addVehicles = async (req, res) => {
    try {
      const body = req.body
      const { packageId } = req.params
      const validation = await OutstationValidator.validateData(body, 'validateServiceType')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const outstationPackage = await Outstation.findById(packageId)
      if (!outstationPackage) {
        throw new Error('Package not found')
      }

      // Check if the serviceType already exists
      const isServiceTypeExists = outstationPackage.serviceType.some(
        (service) =>
          service.serviceType.toString() === body.serviceType.toString() && service.tripType == body.tripType
      )

      if (isServiceTypeExists) {
        return requestHandler.sendError(
          req,
          res,
          'Same service type and trip type already exists in this package'
        )
      }
      outstationPackage.serviceType.push(body)
      await outstationPackage.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'ADD_VEHICLES'
      )({ message: 'CREATED|ADD_VEHICLES', newDoc: outstationPackage })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateVehicles = async (req, res) => {
    try {
      const body = req.body
      // console.log('body', body)
      const packageId = req.params.packageId || req.query.packageId
      const serviceTypeId = req.params.serviceTypeId || req.query.serviceTypeId
      const validation = await OutstationValidator.validateData(body, 'validateServiceType')

      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const outstationPackage = await Outstation.findById(packageId)
      if (!outstationPackage) {
        throw new Error('Outstation Package not found')
      }

      const serviceType = outstationPackage.serviceType.id(serviceTypeId)
      if (!serviceType) {
        throw new Error('Service Type not found')
      }

      // Check if the updated serviceType ObjectId already exists in the array (for a different serviceTypeId)
      const isDuplicateServiceType = outstationPackage.serviceType.some(
        (service) =>
          service.serviceType.toString() === body.serviceType.toString() &&
          service._id.toString() !== serviceTypeId &&
          service.tripType === body.tripType
      )

      if (isDuplicateServiceType) {
        return requestHandler.sendError(
          req,
          res,
          'Same service type and trip type already exists in this package'
        )
      }
      serviceType.serviceType = body.serviceType || serviceType.serviceType
      serviceType.currencyId = body.currencyId || serviceType.currencyId
      serviceType.bookingFare = body.bookingFare || serviceType.bookingFare
      serviceType.commision = body.commision || serviceType.commision
      serviceType.taxFare = body.taxFare || serviceType.taxFare
      serviceType.tripType = body.tripType || serviceType.tripType
      serviceType.baseFare = body.baseFare || serviceType.baseFare
      serviceType.extraDistanceFare = body.extraDistanceFare || serviceType.extraDistanceFare
      serviceType.extraHoursFare = body.extraHoursFare || serviceType.extraHoursFare
      const updatedVehicles = await outstationPackage.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_OUTSTATION_PACKAGE'
      )({ message: 'UPDATED|OUTSTATION_PACKAGE', outstationPackage: updatedVehicles })
    } catch (error) {
      console.log(error)

      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteVehicles = async (req, res) => {
    try {
      const packageId = req.params.packageId || req.body.packageId

      const serviceTypeId = req.params.serviceTypeId || req.body.serviceTypeId

      const outstationPackage = await Outstation.findById(packageId)
      if (!outstationPackage) {
        throw new Error('Outstation Package not found')
      }

      const serviceType = outstationPackage.serviceType.id(serviceTypeId)
      if (!serviceType) {
        throw new Error('Service Type not found')
      }

      serviceType.remove()
      await outstationPackage.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_PRICING'
      )({ message: 'DELETED|PACKAGE', deletedData: serviceType })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getEstimation = async (req, res) => {
    try {
      const body = req.query || {}
      console.log('body', body)
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
      const serviceCity = await ServiceArea.findOne({
        deletedAt: null
      })
        .lean()
        .exec()
      if (!serviceCity) throw new ServiceModuleError('SERVICE_NOT_AVAILABLE')
      await this.checkBoundary(serviceCity._id, body.dropLng, body.dropLat)
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
      console.log('unitDistance', unitDistance)
      const serviceTypes = []
      const pipeline = [
        {
          $match: {
            distance: {
              $lte: unitDistance
            }
          }
        },
        {
          $unwind: '$serviceType'
        },
        {
          $match: {
            'serviceType.tripType': body.tripType
          }
        },
        {
          $lookup: {
            from: 'servicetypes',
            localField: 'serviceType.serviceType',
            foreignField: '_id',
            as: 'serviceTypeDetails'
          }
        },
        {
          $unwind: '$serviceTypeDetails'
        },
        {
          $sort: {
            distance: -1,
            'serviceType._id': 1
          }
        },
        {
          $group: {
            _id: '$serviceTypeDetails._id',
            serviceType: {
              $first: '$serviceTypeDetails'
            },
            packageId: {
              $first: '$_id'
            },
            packageName: {
              $first: '$packageName'
            },
            hours: {
              $first: '$hours'
            },
            distance: {
              $first: '$distance'
            },
            serviceArea: {
              $first: '$serviceArea'
            },
            packageServiceType: {
              $first: '$serviceType'
            },
            tripType: {
              $first: '$serviceType.tripType'
            }
          }
        }
      ]
      // console.log(JSON.stringify(pipeline))

      const serviceTypesData = await Outstation.aggregate(pipeline)
      for (const data of serviceTypesData) {
        const { packageId, serviceType, packageServiceType } = data
        const priceInfo = await this.getPricing({
          unitDistance: unitDistance,
          unitTime: unitTime,
          requestTime: requestTime,
          pricingId: packageServiceType._id, // override pricingid as package.serviceType._id
          coupon: coupon
        })
        if (!priceInfo.status) throw new Error(priceInfo.message)
        let currencyData = {}
        currencyData = await Currency.findOne({
          _id: mongoose.Types.ObjectId(priceInfo.data.pricingData.currencyId)
        })
          .lean()
          .exec()
        serviceType['vehicleDetails'] = {
          packageId: packageId,
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
            additional: priceInfo.data.estimation.additional || [],
            currency: currencyData,
            distance: unitDistance,
            unitFare: priceInfo.data.pricingData?.fare?.value,
            distanceFare: priceInfo.data?.estimation?.distanceFare,
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
  static getPricing = async (pricingInput) => {
    try {
      const { unitDistance, unitTime, pricingId } = pricingInput
      let outstationPackage = await Outstation.aggregate([
        {
          $unwind: '$serviceType'
        },
        {
          $match: {
            'serviceType._id': mongoose.Types.ObjectId(pricingId)
          }
        }
      ])
      if (!outstationPackage.length) throw new ServiceModuleError('NOT_FOUND|PRICING')
      outstationPackage = outstationPackage[0]
      const pricingData = outstationPackage.serviceType

      // Initial Value
      const estimation = {
        distanceFare: 0,
        timeFare: 0,

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
        payable: 0,
        earnings: 0
      }

      // Additional Fare
      const additionalFee = pricingData.additional
      // Night Fare
      if (Array.isArray(additionalFee?.nightFare) && additionalFee.nightFare.length > 0) {
        for (const nightFare of additionalFee.nightFare) {
          const nightFareFall = this.getFareTimeFallsIn(nightFare, pricingInput.requestTime, 'night')
          if (nightFareFall.status) {
            estimation.additionalFeeArr.push(nightFareFall)
            break
          }
        }
      }
      // Peak Fare
      if (Array.isArray(additionalFee?.peakFare) && additionalFee.peakFare.length > 0) {
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
        pricingData?.waitingFare?.status &&
        pricingInput?.waitingTime &&
        pricingInput?.waitingTime > pricingData.waitingFare?.allowedMin
      ) {
        estimation['waitingFare'] = Helpers.roundOff(
          Math.round(pricingInput?.waitingTime - pricingData.waitingFare?.allowedMin) *
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
      if (pricingData?.additional?.pickupFare?.status && pricingData?.additional?.pickupFare?.value > 0) {
        estimation.additionalFeeArr.push({
          status: true,
          name: 'Pickup Charge',
          fareType: 'amount',
          actual: 0,
          fare: pricingData.additional.pickupFare.value
        })
      }
      // extra distance and extra hour fare
      // if (pricingData?.additional?.extraDistanceFare && pricingData?.additional?.extraHoursFare) {
      if (unitDistance > outstationPackage.distance) {
        estimation.additionalFeeArr.push({
          status: true,
          name: 'Extra Distance Charge',
          fareType: 'amount',
          actual: 0,
          fare: Helpers.roundOff(
            Math.abs(parseFloat(outstationPackage.distance) - parseFloat(unitDistance)) *
              parseFloat(pricingData.extraDistanceFare)
          ),
          extraDistance: Helpers.roundOff(
            Math.abs(parseFloat(outstationPackage.distance) - parseFloat(unitDistance))
          ),
          extraFare: Helpers.roundOff(parseFloat(pricingData.extraDistanceFare))
        })
      }
      if (this.secondsToHoursMinutes(unitTime) > outstationPackage.hours) {
        estimation.additionalFeeArr.push({
          status: true,
          name: 'Extra Hours Charge',
          fareType: 'amount',
          actual: 0,
          fare: Helpers.roundOff(
            Math.abs(parseFloat(outstationPackage.hours) - this.secondsToHoursMinutes(unitTime)) *
              parseFloat(pricingData.extraHoursFare)
          ),
          extraHours: Helpers.roundOff(
            Math.abs(parseFloat(outstationPackage.hours) - this.secondsToHoursMinutes(unitTime))
          ),
          extraFare: Helpers.roundOff(parseFloat(pricingData.extraHoursFare))
        })
      }
      // }

      estimation['actualFare'] =
        parseFloat(estimation.distanceFare) +
        parseFloat(estimation.timeFare) +
        parseFloat(estimation.baseFare) +
        parseFloat(estimation.bookingFare)
      estimation['actualFare'] = Helpers.roundOff(estimation['actualFare'])

      // Check for minimum fare
      if (parseFloat(estimation['actualFare']) < parseFloat(estimation.minimumFare)) {
        // estimation['actualFare'] = estimation.minimumFare
        const minimumFareAdded = Helpers.roundOff(estimation.minimumFare - estimation['actualFare'])
        estimation.additionalFeeArr.push({
          status: true,
          name: 'Minimum Fare Added',
          fareType: 'amount',
          actual: minimumFareAdded,
          fare: minimumFareAdded
        })
      }

      for (const additionalFeeEl of estimation.additionalFeeArr) {
        // console.log(additionalFeeEl.name, additionalFeeEl.fare, '===================>')

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
      if (pricingData?.taxFare?.status) {
        estimation['taxFare'] = Helpers.roundOff(estimation['totalFare'] * (pricingData.taxFare.fare / 100))
        estimation['totalFare'] = estimation['actualFare'] = Helpers.roundOff(
          estimation['totalFare'] + estimation['taxFare']
        )
      }

      // Discount Fare
      if (pricingInput?.coupon) {
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

      // Round Off
      estimation['roundOff'] = Helpers.roundOff(Math.round(estimation['totalFare']) - estimation['totalFare'])
      estimation['totalFare'] = Math.round(estimation['totalFare'])

      estimation['commision'] = Helpers.roundOff(
        (estimation['totalFare'] - estimation['taxFare']) * (pricingData.commision / 100)
      )

      estimation['earnings'] =
        estimation['commision'] +
        estimation['taxFare'] +
        estimation['bookingFare'] -
        estimation['discountFare']
      estimation['earnings'] = Helpers.roundOff(estimation['earnings'])
      estimation['payable'] = Helpers.roundOff(estimation['totalFare'] - estimation['earnings'])

      return {
        status: true,
        message: 'ESTIMATED',
        data: {
          estimation,
          pricingInput,
          pricingData
        }
      }
    } catch (error) {
      // console.error('GET_PRICING_ERROR: ', error)
      return {
        status: false,
        message: error.message,
        data: {}
      }
    }
  }
  static getInvoice = async (tripdata, body) => {
    try {
      let coupon = null

      const dropLocations = body.latitude + ',' + body.longitude
      const dropLocationsArr = [body.latitude, body.longitude]
      const pickupLocations = tripdata.partner.startLocation[1] + ',' + tripdata.partner.startLocation[0]

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

      const travelInfo = await MapServices.getLocationData([pickupLocations], [dropLocations], {
        distanceMetric: tripdata.distanceMetric
      })
      if (!travelInfo) throw new Error('DISTANCE_ESTIMATION_FAILED')
      let unitDistance = travelInfo.data.distanceValue
      // let unitTime = travelInfo.data.timeValue
      unitDistance = unitDistance > routePathDistance ? unitDistance : routePathDistance
      const unitTime = routePathTime > routePathDistance ? routePathTime : routePathDistance

      if (body.startMeter && body.endMeter) {
        const totalKM = Number(body.endMeter) - Number(body.startMeter).toFixed()
        if (Number(unitDistance) <= Number(totalKM)) {
          unitDistance = totalKM
        }
      }
      // Waiting Time
      let waitingTime = 0 // In Minutes
      waitingTime = Math.round(
        ((((tripdata?.partner?.startTime || new Date()) - (tripdata?.partner?.arriveTime || new Date())) %
          86400000) %
          3600000) /
          60000
      )
      // Add Coupon
      if (tripdata.estimation.coupon) {
        const checkCoupon = await CreteriaService.isValidCoupon({
          coupon: tripdata.estimation.coupon,
          serviceCity: tripdata.service
        })
        if (checkCoupon.status) coupon = checkCoupon.data
      }
      console.log('unitDistance', unitDistance)

      const priceInfo = await this.getPricing({
        unitDistance: unitDistance,
        unitTime: unitTime,
        requestTime: Helpers.getISODate(),
        waitingTime: waitingTime,
        pricingId: tripdata.servicePricing,
        coupon: coupon
      })
      if (!priceInfo.status) throw new Error('CONTACT_ADMIN')

      const invoiceData = {
        distance: unitDistance,
        estTime: unitTime,
        start: travelInfo.data.originLabel,
        end: travelInfo.data.destinationLabel,
        startcoords: tripdata.estimation.startcoords,
        endcoords: dropLocationsArr,

        fareType: tripdata.estimation.fareType,
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
        coupon: tripdata.estimation.coupon || '',

        roundOff: priceInfo.data.estimation.roundOff,
        totalFare: priceInfo.data.estimation.totalFare,

        commision: priceInfo.data.estimation.commision,
        earnings: priceInfo.data.estimation.earnings,
        payable: priceInfo.data.estimation.payable
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

      return {
        status: true,
        message: 'INVOICE',
        data: {
          invoiceData,
          routeImage
        }
      }
    } catch (error) {
      console.error('CALCULATE_FINAL_AMOUNT_ERROR:', error)
      return {
        status: false,
        message: error.message,
        data: {}
      }
    }
  }
  static secondsToHoursMinutes = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return Math.round(hours + minutes / 60)
  }
  static createRequest = async (req, res) => {
    try {
      const body = req.body || {}
      const auth = req.auth || {}
      const validation = await TripValidator.validateData(body, 'createRequest')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      let customerId
      if (auth.role == Enum.ROLES.ADMIN) {
        customerId = req.body.id
      } else {
        customerId = auth.userId
      }

      const pickupLocation = body.pickupLat + ',' + body.pickupLng
      const pickupLocationArr = [body.pickupLng, body.pickupLat]
      const dropLocation = body.dropLat + ',' + body.dropLng
      const dropLocationArr = [body.dropLng, body.dropLat]
      let coupon = null

      await ServiceModule.checkExisttrip(customerId)
      const serviceCity = await ServiceModule.checkServiceArea(pickupLocationArr)

      const serviceType = await ServiceType.findOne({
        _id: mongoose.Types.ObjectId(body.vehicleId)
      })
        .lean()
        .exec()
      if (!serviceType) throw new ServiceModuleError('NOT_FOUND|SERVICE_TYPE')
      const travelInfo = await MapServices.getLocationData([pickupLocation], [dropLocation])
      if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
      const unitDistance = travelInfo.data.distanceValue
      const distanceMetric = travelInfo.data.distanceMetric || Config.app.distanceMetric
      // const timeMetric = travelInfo.data.timeMetric || Config.app.timeMetric
      const unitTime = travelInfo.data.timeValue
      const pipeline = [
        {
          $match: {
            _id: mongoose.Types.ObjectId(body.servicetypeId)
          }
        },
        {
          $unwind: '$serviceType'
        },
        {
          $match: {
            'serviceType.tripType': body.tripType,
            'serviceType.serviceType': mongoose.Types.ObjectId(serviceType._id)
          }
        },
        {
          $project: {
            'serviceType._id': 1
          }
        }
      ]
      // console.log(JSON.stringify(pipeline))
      const serviceTypesData = await Outstation.aggregate(pipeline)
      let pricingId = null
      if (serviceTypesData.length != 0) {
        pricingId = serviceTypesData[0].serviceType
      }
      if (!pricingId) throw new ServiceModuleError('NOT_FOUND|PRICING')

      let customerData = await Customer.findOne({ _id: customerId }).exec()
      if (!customerData) throw new ServiceModuleError('NOT_FOUND|CUSTOMER')

      const experience = Helpers.getDateDifference(new Date(customerData.createdAt), new Date())
      await this.checkBoundary(serviceCity._id, body.dropLng, body.dropLat)
      const response = await BookingforothersController.bookingforothers(body, customerData)
      customerData = response.data
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
        start: body.pickupAddress || travelInfo.data.originLabel,
        end: body.dropAddress || travelInfo.data.destinationLabel,
        startcoords: pickupLocationArr,
        endcoords: dropLocationArr,

        serviceId: serviceType._id,

        // fareType: priceInfo.data.pricingData.fare.type,
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
        returnOn: req.body.returnOn ? req.body.returnOn : '',
        packagename: body.tripType
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
      console.log('CREATE_REQUEST', error)
      return requestHandler.sendError(req, res, error)
    }
  }
  static updateTripstatus = async (req, res) => {
    try {
      const body = req.body || {}
      const auth = req.auth || {}
      const validation = await TripValidator.validateData(body, 'updateRequest')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const tripdata = await ServiceModule.getTripdetails(body.requestId)
      const partnerInfo = await Partner.findOne({ _id: tripdata[0].partner.id }).exec()
      if (!partnerInfo) throw new AuthendicationError('NOT_FOUND|PARTNER')

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
        const responseData = await ServiceModule.updateRequest(tripObj)
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
        additionalObj.startMeter = body.startMeter
        additionalObj.waitingTime = body.waitingTime
        tripObj.additionalObj = additionalObj
        const responseData = await ServiceModule.updateRequest(tripObj)
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
        additionalObj.startMeter = body.startMeter
        additionalObj.endMeter = body.endMeter
        additionalObj.waitingTime = body.waitingTime
        tripObj.additionalObj = additionalObj
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
      return requestHandler.sendError(req, res, error)
    }
  }
  static checkBoundary = async (id, lng, lat) => {
    let dropPoint = false
    const availableService = await ServiceArea.find({}, { polygon: 1, name: 1 })
    const availableServiceCity = await availableService.find(
      (service) => service._id.toString() === id.toString()
    )
    console.log('availableServiceCity', availableServiceCity)
    if (availableServiceCity && availableServiceCity.polygon.coordinates.length != 0) {
      dropPoint = await insidePolygon(
        [parseFloat(lng), parseFloat(lat)],
        availableServiceCity.polygon.coordinates[0]
      )
    }

    if (dropPoint) {
      throw new Error('DROP LOCATION SHOULD BE OUT OF BOUNDARY')
    }
  }
}

export { OutStationPacakgeController }
