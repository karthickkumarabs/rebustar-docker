/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

import { BaseController } from '../BaseController.js'
import Offer from '../../models/Creteria/Offer.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'

import { OfferValidator } from '../../validators/Creteria/OfferValidator.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class OfferController extends BaseController {
  constructor() {
    super()
  }

  static addOffer = async (req, res) => {
    try {
      const body = req.body

      const validation = await OfferValidator.validateData(body, 'createOffer')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const newOffer = new Offer({
        start: body.start,
        end: body.end,
        title: body.title,
        description: body.description,
        scIds: body.scIds && body.scIds != '' ? body.scIds.split(',') : [],
        hasCoupon: body.hasCoupon,
        couponId: body.hasCoupon === '1' && body.couponId ? body.couponId : null
      })
      if (req.file) newOffer.offerImg = req.file.path
      const addOffer = await newOffer.save()
      return requestHandler.sendSuccess(req, res, 'ADD_OFFER')({ message: 'CREATED|OFFER', data: addOffer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getOffer = async (req, res) => {
    try {
      const validation = await OfferValidator.validateData(req.query, 'getOffer')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const queryData = req.query
      const paramData = req.params
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      // const queryObj = {}
      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(Offer, queryData)
      queryObject = queryBuilder.queryObject

      if (paramData.offerId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.offerId)
      }
      queryObject.deletedAt = null
      const getOfferDataCount = await Offer.find(queryObject).count()
      const getOfferData = await Offer.find(queryObject).skip(skip).limit(perPage)

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_OFFER'
      )({
        message: 'LISTED|OFFER',
        Offer: getOfferData,
        total: getOfferDataCount
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateOffer = async (req, res) => {
    try {
      const body = req.body
      const offerId = req.params.offerId || req.query.offerId
      if (!offerId) throw new Error('OFFER_ID_IS_REQUIRED')
      const validation = await OfferValidator.validateData(body, 'updateOffer')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const offer = await Offer.findById(offerId).exec()

      offer.start = body.start || offer.start
      offer.end = body.end || offer.end
      offer.title = body.title || offer.title
      offer.description = body.description || offer.description
      offer.scIds = body.scIds && body.scIds != '' ? body.scIds.split(',') : offer.scIds
      offer.hasCoupon = body.hasCoupon || offer.hasCoupon
      offer.couponId = body.couponId || offer.couponId

      if (req.file) offer.offerImg = req.file.path

      const updatedOffer = await offer.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_OFFER'
      )({ message: 'UPDATED|OFFER', offer: updatedOffer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteOffer = async (req, res) => {
    try {
      const offerId = req.params.offerId
      const deleteOffer = await Offer.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(offerId), deletedAt: null },
        { deletedAt: new Date() },
        { new: true }
      ).exec()
      if (!deleteOffer) throw new Error('NOT_FOUND|OFFER')

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_OFFER'
      )({ message: 'DELETED|OFFER', offer: deleteOffer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getOfferList = async (req, res) => {
    try {
      const validation = await OfferValidator.validateData(req.query, 'getOffer')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const todayDate = new Date()

      const queryObj = {
        deletedAt: null,
        start: { $lte: todayDate },
        end: { $gte: todayDate }
      }

      const offersPipeline = [
        {
          $match: queryObj
        },
        {
          $lookup: {
            from: 'coupons',
            localField: 'couponId',
            foreignField: '_id',
            as: 'couponData'
          }
        },
        {
          $unwind: {
            path: '$couponData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            $or: [
              { couponData: { $eq: null } },
              {
                $expr: {
                  $and: [
                    { $lte: [{ $toDate: '$couponData.start' }, new Date()] },
                    { $gte: [{ $toDate: '$couponData.end' }, new Date()] }
                  ]
                }
              }
            ]
          }
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: Number(skip) || 0 },
              { $limit: Number(perPage) || 10 },
              {
                $project: {
                  start: 1,
                  end: 1,
                  title: 1,
                  description: 1,
                  offerImg: 1,
                  hasCoupon: 1,
                  couponText: { $ifNull: ['$couponData.code', ''] }
                }
              }
            ]
          }
        }
      ]
      const getOfferData = await Offer.aggregate(offersPipeline)

      console.log(JSON.stringify(getOfferData))

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_OFFER'
      )({
        message: 'LISTED|OFFER',
        offers: getOfferData[0]?.data || [],
        total: getOfferData[0]?.metadata[0]?.total || 0
      })
    } catch (error) {
      console.error('GET_OFFER_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { OfferController }
