/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../BaseController.js'
import { PricingValidator } from '../../validators/Creteria/PricingValidator.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import Pricing from '../../models/Creteria/Pricing.js'
import mongoose from 'mongoose'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class PricingController extends BaseController {
  constructor() {
    super()
  }

  static createPricing = async (req, res) => {
    try {
      const body = req.body
      const validation = await PricingValidator.validateData(body, 'createPricing')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      // split string into array
      const serviceAreaIds = body.serviceAreaId
        .trim()
        .split(',')
        .filter((e) => e)

      // Check serviceId already exists
      const existingService = await Pricing.findOne({
        serviceId: body.serviceId,
        serviceAreaId: { $in: serviceAreaIds }
      })
      if (existingService) {
        return requestHandler.sendError(req, res, {
          message: 'SERVICE_ALREADY_EXISTS',
          serviceId: body.serviceId
        })
      }
      const peakFareArr = []
      for (const peakFare of body.additional.peakFare) {
        peakFareArr.push({
          status: peakFare.status,
          from: peakFare.from,
          to: peakFare.to,
          fare: {
            type: peakFare.fare.type,
            value: peakFare.fare.value
          }
        })
      }

      const nightFareArr = []
      for (const nightFare of body.additional.nightFare) {
        nightFareArr.push({
          status: nightFare.status,
          from: nightFare.from,
          to: nightFare.to,
          fare: {
            type: nightFare.fare.type,
            value: nightFare.fare.value
          }
        })
      }

      const distanceFareArr = []
      if (body.additional.distanceFare) {
        for (const distanceFare of body.additional.distanceFare) {
          distanceFareArr.push({
            from: distanceFare.from,
            to: distanceFare.to,
            fare: {
              type: distanceFare.fare.type,
              value: distanceFare.fare.value
            },
            timeFare: distanceFare.timeFare
          })
        }
      } else {
        body.additional.distanceFare = []
      }

      const newPrice = new Pricing({
        serviceId: body.serviceId,
        serviceAreaId:
          body.serviceAreaId
            .trim()
            .split(',')
            .filter((e) => e) || [],
        currencyId: body.currencyId,
        baseFare: body.baseFare,
        bookingFare: body.bookingFare,
        fare: {
          type: body.fare['type'],
          value: body.fare['value']
        },
        minimumFare: body.minimumFare,
        timeFare: body.timeFare,
        commision: body.commision,
        cancelationFare: {
          partner: body.cancelationFare['partner'],
          customer: body.cancelationFare['customer']
        },
        waitingFare: {
          status: body.waitingFare.status,
          allowedMin: body.waitingFare.allowedMin,
          fare: body.waitingFare.fare
        },
        taxFare: {
          status: body.taxFare.status,
          fare: body.taxFare.fare
        },
        additional: {
          peakFare: peakFareArr,
          nightFare: nightFareArr,
          distanceFare: distanceFareArr,
          pickupFare: {
            status: body.additional.pickupFare.status,
            value: body.additional.pickupFare.value
          },
          bidding: {
            status: body.additional?.bidding?.status ?? false,
            minimumAmountinpercentage: body.additional?.bidding?.minimumAmountinpercentage ?? 0,
            maximumAmountinpercentage: body.additional?.bidding?.maximumAmountinpercentage ?? 0
          }
        }
      })

      const createdPricing = await newPrice.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_PRICING'
      )({ message: 'CREATED|PRICING', newDoc: createdPricing })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPricing = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      // const validation = await PricingValidator.validateData(queryData, 'getPricing')
      // if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryObj = {}
      if (paramData.pricingId) queryObj['_id'] = mongoose.Types.ObjectId(paramData.pricingId)

      const getCount = await Pricing.find(queryObj).count()
      const getData = await Pricing.find(queryObj)
        .skip(skip)
        .limit(perPage)
        .populate({ path: 'serviceId', select: 'name status' })

      // filter

      let filteredData = getData

      if (queryData['serviceId.name']) {
        const nameToMatch = queryData['serviceId.name']
        filteredData = getData.filter(
          (item) => item.serviceId?.name?.toLowerCase() === nameToMatch.toLowerCase()
        )
      }

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PRICING'
      )({ message: 'LISTED|PRICING', Pricing: filteredData, Total: getCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updatePricing = async (req, res) => {
    try {
      const body = req.body
      const validation = await PricingValidator.validateData(body, 'updatePricing')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const pricingId = req.params.pricingId
      const updates = await Pricing.findOne({ _id: pricingId }).exec()

      const peakFareArr = []
      for (const peakFare of body.additional.peakFare) {
        peakFareArr.push({
          status: peakFare.status || updates.additional.peakFare[0].status,
          from: peakFare.from || updates.additional.peakFare[0].from,
          to: peakFare.to || updates.additional.peakFare[0].to,
          fare: {
            type: peakFare.fare.type || updates.additional.peakFare[0].fare.type,
            value: peakFare.fare.value || updates.additional.peakFare[0].fare.value
          }
        })
      }

      const nightFareArr = []
      for (const nightFare of body.additional.nightFare) {
        nightFareArr.push({
          status: nightFare.status || updates.additional.nightFare[0].status,
          from: nightFare.from || updates.additional.nightFare[0].from,
          to: nightFare.to || updates.additional.nightFare[0].to,
          fare: {
            type: nightFare.fare.type || updates.additional.nightFare[0].fare.type,
            value: nightFare.fare.value || updates.additional.nightFare[0].fare.value
          }
        })
      }

      const distanceFareArr = []
      if (body.additional.distanceFare) {
        for (const distanceFare of body.additional.distanceFare) {
          distanceFareArr.push({
            from: distanceFare.from || updates.additional.distanceFare[0].from,
            to: distanceFare.to || updates.additional.distanceFare[0].to,
            fare: {
              type: distanceFare.fare.type || updates.additional.distanceFare[0].fare.type,
              value: distanceFare.fare.value || updates.additional.distanceFare[0].fare.value
            },
            // timeFare: distanceFare.timeFare || updates.additional.distanceFare[0].timeFare
            timeFare: distanceFare?.timeFare ?? updates?.additional?.distanceFare?.[0]?.timeFare ?? 0
          })
        }
      } else {
        body.additional.distanceFare = updates.additional.distanceFare
      }

      updates.serviceId = body.serviceId || updates.serviceId
      updates.serviceAreaId =
        body.serviceAreaId
          .trim()
          .split(',')
          .filter((e) => e) || updates.serviceAreaId
      updates.currencyId = body.currencyId || updates.currencyId
      updates.baseFare = body.baseFare || updates.baseFare
      updates.bookingFare = body.bookingFare || updates.bookingFare
      updates.fare.type = body.fare.type || updates.fare.type
      updates.fare.value = body.fare.value || updates.fare.value
      // updates.timeFare = body.timeFare || updates.timeFare
      updates.timeFare = body.timeFare ?? updates.timeFare ?? 0
      updates.minimumFare = body.minimumFare || updates.minimumFare
      updates.commision = body.commission || updates.commision
      updates.cancelationFare.partner = body.cancelationFare.partner || updates.cancelationFare.partner
      updates.cancelationFare.customer = body.cancelationFare.customer || updates.cancelationFare.customer
      updates.waitingFare.status = body.waitingFare.status || updates.waitingFare.status
      updates.waitingFare.allowedMin = body.waitingFare.allowedMin || updates.waitingFare.allowedMin
      updates.waitingFare.fare = body.waitingFare.fare || updates.waitingFare.fare
      updates.taxFare.status = body.taxFare.status || updates.taxFare.status
      updates.taxFare.fare = body.taxFare.fare || updates.taxFare.fare
      updates.additional.pickupFare.status =
        body.additional.pickupFare.status || updates.additional.pickupFare.status
      updates.additional.pickupFare.value =
        body.additional.pickupFare.value || updates.additional.pickupFare.value
      updates.additional.peakFare = peakFareArr
      updates.additional.nightFare = nightFareArr
      updates.additional.distanceFare = distanceFareArr
      updates.additional.bidding = body.additional?.bidding ?? updates.additional.bidding

      const updatedPricing = await updates.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_PRICING'
      )({ message: 'UPDATED|PRICING', updated: updatedPricing })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deletePricing = async (req, res) => {
    try {
      console.log(req.params, '========')
      console.log(req.params.pricingId, req.body.pricingId, '================')
      const pricingId = req.params.pricingId || req.body.pricingId // Fix typo: pricingId, not pricindId

      // Ensure pricingId is valid
      if (!pricingId) {
        return requestHandler.sendError(req, res, 'Pricing ID is required')
      }

      // Use findByIdAndDelete for simplicity
      const deletedData = await Pricing.findByIdAndDelete(pricingId)
      if (!deletedData) {
        return requestHandler.sendError(req, res, 'No pricing found with the given ID')
      }

      console.log(deletedData, '=========')
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_PRICING'
      )({
        message: 'DELETED|PRICING',
        deletedData
      })
    } catch (error) {
      console.error('Error deleting pricing:', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static async googleMatrix(fromLat, toLat) {
    try {
      const origins = fromLat
      const destinations = toLat
      const GOOGLE_CLIENT_KEY = 'AIzaSyCqQRHBpHTon8sH4Vpck2tKq9_xyIA-YKw'
      const units = 'metric'
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&units=${units}&key=${GOOGLE_CLIENT_KEY}`

      const options = {
        url: url,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
      const gResults = {}
      return new Promise(function (resolve, reject) {
        request(options, (error, response) => {
          if (error) reject(error)
          const resData = JSON.parse(response.body)
          if (resData.rows[0].elements[0].status == 'NOT_FOUND') {
            reject(resData.rows[0].elements[0].status)
          } else {
            gResults.distance = resData.rows[0].elements[0].distance.value / 1000
            gResults.duration = resData.rows[0].elements[0].duration.value / 60
            resolve(gResults)
          }
        })
      })
    } catch (err) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { PricingController }
