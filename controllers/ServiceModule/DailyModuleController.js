/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import moment from 'moment'
import mongoose from 'mongoose'

import { BaseController } from './../BaseController.js'

import { Helpers } from './../../helpers/Function.js'
import { MapServices } from './../../modules/Map/index.js'

import Pricing from './../../models/Creteria/Pricing.js'
import ServiceTracker from './../../models/ServiceModule/ServiceTracker.js'

import { CreteriaService } from '../../services/Creteria/CreteriaServices.js'
import { ServiceModuleError, AuthendicationError } from '../../utils/ErrorHandler.js'
import { Enum } from '../../utils/Enum.js'
import { ServiceModuleController as ServiceModule } from './ServiceModuleController.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { TripValidator } from '../../validators/serviceModule/TripValidator.js'
import Customer from '../../models/Auth/Customer.js'
import Partner from '../../models/Auth/Partner.js'
import { Logger } from '../../utils/Logger.js'
import ServiceType from '../../models/Creteria/ServiceType.js'
import { BookingforothersController } from '../../modules/Bookingforothers/controllers/BookingforothersController.js'
import { Config } from '../../config/AppConfig.js'
import Company from '../../models/Auth/Company.js'
import { CustomerController } from '../Auth/CustomerController.js'
import PurchasePackage from '../../modules/Subscription/models/PurchasePackage.js'
import { SettingsConfig } from '../../config/SettingsConfig.js'
import { SubscriptionConfig } from '../../modules/Subscription/config.js'
import Trip from '../../models/ServiceModule/Trip.js'
import { WalletController } from '../../modules/Payment/Wallet/WalletController.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class DailyModuleController extends BaseController {
  constructor() {
    super()
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

  static updateTripStopHelperFunction = async function ({ requestId, latitude, longitude, status }) {
    const trip = await Trip.findById(requestId)
    if (trip.length == 0) throw new Error('TRIP_NOT_FOUND')

    const idx = trip.invoice.stopCurrentIndex
    console.log('idx', trip.invoice.stopCurrentIndex)
    const stop = trip.invoice.stops[idx]
    console.log('stop', stop)
    const previousStop = trip.invoice.stops[idx - 1]
    if (!stop) throw new Error('STOP_NOT_FOUND')

    const startLocation = previousStop.coords[1] + ',' + previousStop.coords[0]
    const endLocation = latitude + ',' + longitude

    const now = new Date(Helpers.getISODate())

    // ARRIVED
    if (status == 0) {
      // if (stop.status !== 'PENDING') throw new Error('INVALID_STATE')
      const travelInfo = await MapServices.getLocationData([startLocation], [endLocation], {
        distanceMetric: trip.distanceMetric
      })
      if (!travelInfo) throw new Error('DISTANCE_ESTIMATION_FAILED')

      stop.status = 'ARRIVED'
      stop.arrivedTime = now
      stop.coords = [longitude, latitude]
      stop.address = travelInfo.data.destinationLabel
      stop.distanceLabel = travelInfo.data.distanceLabel
      stop.timeLabel = travelInfo.data.timeLabel
      stop.distance = travelInfo.data.distanceValue
      stop.time = travelInfo.data.timeValue
      await trip.save()

      // DESTINATION ARRIVED → END TRIP
      if (stop.name === 'DESTINATION') {
        stop.status = 'COMPLETED'
        await trip.save()
      }
    }
    // STARTED / LEAVING STOP
    else if (status == 1) {
      if (stop.name !== 'STOP') throw new Error('INVALID_OPERATION')
      if (stop.status !== 'ARRIVED') throw new Error('STOP_NOT_ARRIVED')

      stop.startTime = now
      stop.waitingTime = now.getTime() - stop.arrivedTime.getTime()
      stop.status = 'COMPLETED'

      trip.invoice.stopCurrentIndex += 1
      await trip.save()
    } else {
      throw new Error('INVALID_REQUEST')
    }
    return trip
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
      console.log('pricingData', pricingData)

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
      //   additional: [],//need to add information (fare details)
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
      console.log('travelledKm', travelledKm)
      const defaultFareType = pricingData.fare?.type || 'unitRate'
      const defaultFareValue = parseFloat(pricingData.fare?.value || 0)

      const slabs = pricingData?.additional?.distanceFare || []
      console.log('slabs', JSON.stringify(slabs))
      if (Array.isArray(slabs) && slabs.length > 0) {
        slabs.sort((a, b) => parseFloat(a.from) - parseFloat(b.from))

        let coveredUntil = 0

        for (let i = 0; i < slabs.length; i++) {
          let from = parseFloat(slabs[i].from)
          console.log('from', from)
          const to = parseFloat(slabs[i].to)
          console.log('to', to)

          if (i === 0 && from > 0) from = 0 // ensure first slab starts at 0

          if (travelledKm >= from) {
            const slabEnd = Math.min(travelledKm, to)
            console.log('slabEnd', slabEnd)
            const coveredKm = slabEnd - from
            console.log('coveredKm', coveredKm)

            if (coveredKm > 0) {
              const fareType = slabs[i].fare?.type || defaultFareType
              console.log('fareType', fareType)
              const fareValue = parseFloat(slabs[i].fare?.value || defaultFareValue)
              console.log('fareValue', fareValue)

              if (fareType === 'flatRate') {
                distanceFare += fareValue
              } else if (fareType === 'unitRate') {
                distanceFare += coveredKm * fareValue
              }
              console.log('distanceFare^^^^^^', distanceFare)
              coveredUntil = slabEnd
            }
          }
        }
        console.log('coveredUntil', coveredUntil)
        if (travelledKm > coveredUntil) {
          const remainingKm = travelledKm - coveredUntil
          console.log('remainingKm', remainingKm)
          if (defaultFareType === 'flatRate') {
            distanceFare += defaultFareValue
            console.log('distanceFare$$$$$$$$$', distanceFare)
          } else {
            distanceFare += remainingKm * defaultFareValue
            console.log('distanceFare#############', distanceFare)
          }
        }
      } else {
        if (defaultFareType === 'flatRate') {
          distanceFare = defaultFareValue
          console.log('distanceFare@@@@@@@@@@', distanceFare)
        } else {
          distanceFare = travelledKm * defaultFareValue
          console.log('distanceFare!!!!!!!!!!!!!!!!!!!!!!!!!!!', distanceFare)
        }
      }

      distanceFare = Helpers.roundOff(distanceFare)
      console.log('distanceFare', distanceFare)

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
      console.log('estimation', estimation)
      // Additional Fare
      const additionalFee = pricingData.additional
      console.log('additionalFee', additionalFee)
      // Night Fare
      if (Array.isArray(additionalFee.nightFare) && additionalFee.nightFare.length > 0) {
        for (const nightFare of additionalFee.nightFare) {
          const nightFareFall = this.getFareTimeFallsIn(nightFare, pricingInput.requestTime, 'night')
          console.log('nightFareFall', nightFareFall)
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
          console.log('peakFareFall', peakFareFall)
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
        console.log('waitingFare', estimation['waitingFare'])
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
      console.log(
        'distanceFare',
        estimation['distanceFare'],
        'timeFare',
        estimation['timeFare'],
        'baseFare',
        estimation['baseFare'],
        'distanceFare',
        estimation['distanceFare']
      )

      estimation['actualFare'] =
        parseFloat(estimation.distanceFare) +
        parseFloat(estimation.timeFare) +
        parseFloat(estimation.baseFare) +
        parseFloat(estimation.bookingFare)
      estimation['actualFare'] = Helpers.roundOff(estimation['actualFare'])
      console.log('actualFare', estimation['actualFare'])

      // Check for minimum fare
      if (parseFloat(estimation['actualFare']) < parseFloat(estimation.minimumFare)) {
        // estimation['actualFare'] = estimation.minimumFare
        const minimumFareAdded = Helpers.roundOff(estimation.minimumFare - estimation['actualFare'])
        console.log('minimumFareAdded', minimumFareAdded)
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
      console.log('additionalFare', estimation['additionalFare'])
      estimation['additional'] = estimation.additionalFeeArr
      console.log('additional', estimation['additional'])

      estimation['totalFare'] = estimation['actualFare'] = Helpers.roundOff(
        parseFloat(parseFloat(estimation['actualFare']) + parseFloat(estimation['additionalFare']))
      )
      console.log('totalFare', estimation['totalFare'])

      // Tax Fare
      if (pricingData.taxFare.status) {
        estimation['taxFare'] = Helpers.roundOff(estimation['totalFare'] * (pricingData.taxFare.fare / 100))
        console.log('taxFare', estimation['taxFare'])
        estimation['totalFare'] = estimation['actualFare'] = Helpers.roundOff(
          estimation['totalFare'] + estimation['taxFare']
        )
        console.log('totalFare after Tax', estimation['totalFare'])
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
        console.log('discountFare', estimation['discountFare'])

        estimation['totalFare'] = Helpers.roundOff(
          parseFloat(parseFloat(estimation['totalFare']) - parseFloat(estimation['discountFare']))
        )
        console.log('Total fare after discount', estimation['totalFare'])
      }

      // Round Off
      estimation['roundOff'] = Helpers.roundOff(Math.round(estimation['totalFare']) - estimation['totalFare'])
      estimation['totalFare'] = Math.round(estimation['totalFare'])
      console.log('Total fare roundOff', estimation['roundOff'])

      estimation['commision'] = Helpers.roundOff(
        (estimation['totalFare'] - estimation['taxFare']) *
          ((pricingInput.commission ?? pricingData.commision) / 100) // Admin special subscription commission or pricing default commission
      )
      console.log('commision', estimation['commision'])

      estimation['companycommission'] = Helpers.roundOff(
        (estimation['totalFare'] - estimation['taxFare']) * (pricingInput.companycommission / 100)
      )
      console.log('companycommission', estimation['companycommission'])

      estimation['earnings'] =
        estimation['commision'] +
        estimation['taxFare'] +
        estimation['bookingFare'] -
        estimation['discountFare']
      estimation['earnings'] = Helpers.roundOff(estimation['earnings'])
      console.log('earnings', estimation['earnings'])
      estimation['payable'] = Helpers.roundOff(estimation['totalFare'] - estimation['earnings'])
      console.log('payable', estimation['payable'])

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

  static getInvoice = async (tripdata, body) => {
    const response = {
      status: false,
      message: 'UNPROCESSABLE_ENTITY',
      data: {}
    }
    try {
      let coupon = null
      let dropLocations
      const dropLocationsArr = [body.longitude, body.latitude]
      let pickupLocations
      let unitDistance
      let unitTime
      let waitingTime = 0
      let invoiceObj = {}
      let others = {}

      const routePath = await ServiceTracker.findOne({ requestId: tripdata._id }).lean().exec()
      let routePathDistance = await MapServices.calculateLinestringLength(
        routePath?.dropPolyline?.coordinates || [],
        { distanceMetric: tripdata.distanceMetric }
      )
      if (body.endTime == undefined) body.endTime = Helpers.getISODate()
      routePathDistance = parseFloat(routePathDistance).toFixed(2)
      let routePathTime = Math.round(
        ((((new Date(body.endTime) || new Date()) - (new Date(tripdata?.partner?.startTime) || new Date())) %
          86400000) %
          3600000) /
          60000
      ) // In Minutes
      routePathTime = parseFloat(routePathTime).toFixed(2)
      console.log('routePathTime', routePathTime)

      if (tripdata.module == 'DAILY') {
        dropLocations = body.latitude + ',' + body.longitude
        pickupLocations = tripdata.partner.startLocation[1] + ',' + tripdata.partner.startLocation[0]

        const travelInfo = await MapServices.getLocationData([pickupLocations], [dropLocations], {
          distanceMetric: tripdata.distanceMetric
        })
        if (!travelInfo) throw new Error('DISTANCE_ESTIMATION_FAILED')

        unitDistance = travelInfo.data.distanceValue
        console.log('unitDistance', unitDistance)
        unitTime = travelInfo.data.timeValue
        console.log('unitTime', unitTime)

        unitDistance = unitDistance > routePathDistance ? unitDistance : routePathDistance
        console.log('unitDistance______', unitDistance)
        unitTime = routePathTime > unitTime ? routePathTime : unitTime
        console.log('unitTime_____', unitTime)

        waitingTime = Math.round(
          ((((new Date(tripdata?.partner?.startTime) || new Date()) -
            (new Date(tripdata?.partner?.arriveTime) || new Date())) %
            86400000) %
            3600000) /
            60000
        )
        console.log('waitingTime', waitingTime)

        invoiceObj = {
          start: travelInfo.data.originLabel,
          end: travelInfo.data.destinationLabel
        }
        others = {
          timeLabel: travelInfo.data.timeLabel,
          distanceLabel: travelInfo.data.distanceLabel
        }
      } else if (tripdata.module == 'DAILY-MULTISTOP') {
        // distance and times were updated while multi stop progressing
        const travelData = tripdata.invoice.stops?.reduce(
          (accumulator, stop) => {
            accumulator.unitDistance += stop.distance || 0
            accumulator.unitTime += stop.time || 0
            accumulator.waitingTime += stop.waitingTime || 0
            return accumulator
          },
          {
            unitTime: 0,
            unitDistance: 0,
            waitingTime: 0
          }
        )

        unitTime = isNaN(travelData.unitTime) ? 0 : travelData.unitTime
        unitDistance = travelData.unitDistance

        unitDistance = unitDistance > routePathDistance ? unitDistance : routePathDistance
        unitDistance = Number(Number(unitDistance).toFixed(2))

        unitTime = routePathTime > unitTime ? routePathTime : unitTime
        waitingTime = travelData.waitingTime / 1000 / 60

        invoiceObj = {
          start: tripdata.invoice.stops[0].address,
          end: tripdata.invoice.stops[tripdata.invoice.stops.length - 1].address
        }
        others = {
          timeLabel: `${unitTime} mins`,
          distanceLabel: `${unitDistance} km`
        }
      } else if (tripdata.module == Enum.MODULES.HAILRIDE) {
        // Default (for HAILRIDE / others)
        dropLocations = body.latitude + ',' + body.longitude
        pickupLocations = tripdata.estimation?.startcoords
          ? tripdata.estimation.startcoords[1] + ',' + tripdata.estimation.startcoords[0]
          : tripdata.partner.startLocation[1] + ',' + tripdata.partner.startLocation[0]

        const travelInfo = await MapServices.getLocationData([pickupLocations], [dropLocations], {
          distanceMetric: tripdata.distanceMetric
        })

        if (travelInfo?.status) {
          unitDistance = travelInfo.data.distanceValue
          unitTime = travelInfo.data.timeValue

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
        console.log('companycommission', companycommission)
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
        commission: adminTripCommission,
        companycommission: companycommission,
        estimationObj: tripdata.estimation
      })
      if (!priceInfo.status) throw new Error('CONTACT_ADMIN')
      console.log('priceInfo', priceInfo)

      let adminEarnings = priceInfo.data.estimation.earnings
      let payable = priceInfo.data.estimation.payable
      if (subscriptionModule.enabled && JSON.parse(SubscriptionConfig.isEnabled)) {
        const findPartner = await Partner.findById(tripdata.partner?.id)
        const payment = findPartner?.payment || null // Null means no subscription active.
        // Check subscription active or not.
        if (payment && payment.subscriptionStatus) {
          const packageData = await PurchasePackage.findOne({
            _id: findPartner.payment?.packageId,
            status: Enum.PACKAGE.STATUS.ACTIVE
          })
          // Check subscription free trips
          const completedTripsCount = await Trip.find({
            'partner.id': findPartner._id,
            status: Enum.TRIP.STATUS.FINISHED
          })
            .countDocuments()
            .exec()

          if (completedTripsCount <= packageData.newPurchaseFreeTrips) {
            // Don't need to deduct booking fee from partner
            adminEarnings = priceInfo.data.estimation.earnings - priceInfo.data.estimation.bookingFare
            payable = priceInfo.data.estimation.payable + priceInfo.data.estimation.bookingFare
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
        stops: tripdata.invoice.stops,
        stopCurrentIndex: tripdata.invoice.stopCurrentIndex
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

  static createRequest = async (req, res) => {
    try {
      const body = req.body || {}
      const auth = req.auth || {}
      let travelInfo
      console.log(body, '============body', req.headers.authorization)

      const pickupLocation = body.pickupLat + ',' + body.pickupLng
      const pickupLocationArr = [body.pickupLng, body.pickupLat]
      const dropLocation = body.dropLat + ',' + body.dropLng
      const dropLocationArr = [body.dropLng, body.dropLat]

      if (body.type == 'DAILY-MULTISTOP') {
        const MultiStopModule = SettingsConfig.menulist.find(
          (item) => item.value === Enum.SETTINGS.MULTISTOPSETTING
        )
        if (!MultiStopModule.enabled) throw new Error('MULTISTOP_NOT_ENABLED')
        const validation = await TripValidator.validateData(body, 'multiStopTripRequest')
        if (!validation.status) return requestHandler.sendError(req, res, validation.data)

        travelInfo = await MapServices.getMultipleLocationData(body.stops)
        if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
      } else {
        const validation = await TripValidator.validateData(body, 'createRequest')
        if (!validation.status) return requestHandler.sendError(req, res, validation.data)

        travelInfo = await MapServices.getLocationData([pickupLocation], [dropLocation])
        if (!travelInfo?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
      }

      let customerId
      if (auth.role == Enum.ROLES.ADMIN) {
        customerId = req.body.id

        if (!customerId) {
          const body = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            phoneCode: req.body.phoneCode
          }

          const CreateData = await CustomerController.createCustomerinManualdispatch(body)
          customerId = CreateData.customerId
        }
      } else {
        customerId = auth.userId
      }

      let coupon = null
      // await ServiceModule.checkExisttrip(customerId)
      const serviceCity = await ServiceModule.checkServiceArea(pickupLocationArr)
      console.log('serviceCity', serviceCity)
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

      const unitDistance = travelInfo.data?.unitDistance || travelInfo.data.distanceValue
      const distanceMetric = travelInfo.data.distanceMetric || Config.app.distanceMetric
      // const timeMetric = travelInfo.data.timeMetric || Config.app.timeMetric
      const unitTime = travelInfo.data?.unitTime || travelInfo.data.timeValue

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

      const priceInfo = await this.getPricing({
        unitDistance: unitDistance,
        unitTime: unitTime,
        requestTime: scheduleOn,
        pricingId: pricingId._id,
        coupon: coupon,
        companycommission: 0,
        estimationObj: {}
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
        companycommission: priceInfo.data.estimation.companycommission,
        earnings: priceInfo.data.estimation.earnings,
        payable: priceInfo.data.estimation.payable,
        ...(body.type == 'DAILY-MULTISTOP' && { stops: travelInfo.data?.stops || [] })
      }
      const paymentMethod = body.paymentMethod ? body.paymentMethod : body.paymentMode
      body.paymentMethod = paymentMethod ? paymentMethod.toUpperCase() : paymentMethod
      if (body.paymentMethod == Enum.TRIP.PAYMENT_MODE.WALLET) {
        const balanceAvaible = await WalletController.checkWalletBalance(
          customerId,
          priceInfo.data.estimation.totalFare
        )
        if (!balanceAvaible) throw new Error('Insufficient Wallet Balance')
      }
      const bookingData = {
        type: body.type,
        requestFrom: body.requestFrom,
        scheduleOn: body.scheduleOn ? body.scheduleOn : Helpers.getISODate(),
        timeZone: body.timeZone,
        isScheduleLater: body.isScheduleLater,
        distanceMetric: distanceMetric,
        currency: body.currency || Config.app.currency,
        paymentMethod: body.paymentMethod ? body.paymentMethod : body.paymentMode,
        paymentMethodId: body.paymentMethodId || '',
        userId: customerId
      }
      console.log(bookingData, '=============')
      if (body.bidding) {
        // Applying Bidding in Before Estimate
        bookingData.Bidding = true
        estimateData.additional.push({
          name: Enum.SOCKET.BIDDING,
          fareType: 'amount',
          actual: estimateData.totalFare,
          fare: Number(body.biddingFare) - Number(estimateData.totalFare)
        })
        estimateData.totalFare = body.biddingFare
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
      console.log('CREATE_REQUEST', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateTripStop = async (req, res) => {
    try {
      console.log('request.body', req.body)
      const trip = await this.updateTripStopHelperFunction(req.body)
      return requestHandler.sendSuccess(
        req,
        res,
        'TRIP_PROGRESS'
      )({
        currentStopIndex: trip.currentStopIndex
      })
    } catch (err) {
      return requestHandler.sendError(req, res, err)
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
      const shareLink = Config.productLinks.shareTrip + tripdata[0]._id
      const tripObj = {
        body: body,
        tripdata: tripdata,
        auth: auth
      }
      // If Partner Arrived
      if (body.status == 1) {
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
      if (body.status == 3) {
        if (tripdata[0].module == 'DAILY-MULTISTOP') {
          // update last stop status in the invoice array
          const updatedTrip = await this.updateTripStopHelperFunction({
            requestId: tripdata[0]._id,
            latitude: body.latitude,
            longitude: body.longitude,
            status: 0
          })
          const getInvoice = await this.getInvoice(updatedTrip, body, updatedTrip.customer)
          if (!getInvoice?.status) throw new Error(getInvoice.message)
          tripObj.getInvoice = getInvoice
        } else {
          const getInvoice = await this.getInvoice(tripdata[0], body, tripdata[0].customer)
          if (!getInvoice?.status) throw new Error(getInvoice.message)
          tripObj.getInvoice = getInvoice
        }
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
}
export { DailyModuleController }
