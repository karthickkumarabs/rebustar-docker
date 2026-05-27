/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { RequestHandler } from '../../utils/RequestHandler.js'
import { BaseController } from '../BaseController.js'
import { Logger } from '../../utils/Logger.js'
import FeedBacks from '../../models/DataStore/FeedBack.js'
import mongoose from 'mongoose'
import { Config } from '../../config/AppConfig.js'
import { Enum } from '../../utils/Enum.js'
import { ServiceConfig } from '../../config/ServiceConfig.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class FeedBackController extends BaseController {
  constructor() {
    super()
  }

  static getFeedBacks = async (req, res) => {
    try {
      const { id } = req.params
      const { language, limit = 10, page = 1 } = req.query
      const perPage = parseInt(limit)
      const skip = (parseInt(page) - 1) * perPage

      const queryObject = {}

      if (id) {
        queryObject._id = mongoose.Types.ObjectId(id)
      } else {
        if (language) queryObject.language = language.trim()
      }

      let total = 0
      let reasons = []

      if (id) {
        const reason = await FeedBacks.findOne(queryObject).lean()
        if (reason) {
          reasons.push(reason)
          total = 1
        }
      } else {
        ;[total, reasons] = await Promise.all([
          FeedBacks.countDocuments(queryObject),
          FeedBacks.find(queryObject).skip(skip).limit(perPage).lean()
        ])
      }

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_FEEDBACK'
      )({
        message: 'GET_FEEDBACK_SUCCESS',
        total,
        reasons
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createFeedBack = async (req, res) => {
    try {
      const { language, partnerFeedBack = [], customerFeedBack = [] } = req.body

      if (!language) throw new Error('LANGUAGE_IS_REQUIRED')

      const existing = await FeedBacks.findOne({ language: language.trim() }).lean()
      if (existing) throw new Error('LANGUAGE_ALREADY_EXISTS')

      const driverReasons = Array.isArray(partnerFeedBack)
        ? partnerFeedBack.map((i) => i.trim()).filter(Boolean)
        : partnerFeedBack
            .split(/[\n,]/)
            .map((i) => i.trim())
            .filter(Boolean)

      const riderReasons = Array.isArray(customerFeedBack)
        ? customerFeedBack.map((i) => i.trim()).filter(Boolean)
        : customerFeedBack
            .split(/[\n,]/)
            .map((i) => i.trim())
            .filter(Boolean)

      const reason = await FeedBacks.create({
        language: language.trim(),
        partnerFeedBack: driverReasons,
        customerFeedBack: riderReasons
      })

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_FEEDBACK'
      )({
        message: 'CREATED|FEEDBACK',
        reason
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateFeedBack = async (req, res) => {
    try {
      const { partnerFeedBack, customerFeedBack } = req.body
      const { id } = req.params

      if (!id) throw new Error('REASON_ID_IS_REQUIRED')

      const reason = await FeedBacks.findById(id)
      if (!reason) throw new Error('CANCEL_REASON_NOT_FOUND')

      if (partnerFeedBack) {
        reason.partnerFeedBack = Array.isArray(partnerFeedBack)
          ? partnerFeedBack.map((i) => i.trim()).filter(Boolean)
          : partnerFeedBack
              .split(/[\n,]/)
              .map((i) => i.trim())
              .filter(Boolean)
      }

      if (customerFeedBack) {
        reason.customerFeedBack = Array.isArray(customerFeedBack)
          ? customerFeedBack.map((i) => i.trim()).filter(Boolean)
          : customerFeedBack
              .split(/[\n,]/)
              .map((i) => i.trim())
              .filter(Boolean)
      }

      const updated = await reason.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_FEEDBACK'
      )({
        message: 'UPDATED|FEEDBACK',
        reason: updated
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteFeedBack = async (req, res) => {
    try {
      const { id } = req.params
      if (!id) throw new Error('REASON_ID_IS_REQUIRED')

      const deleted = await FeedBacks.findByIdAndDelete(id).lean()
      if (!deleted) throw new Error('FEEDBACK_NOT_FOUND')

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_FEEDBACK'
      )({
        message: 'DELETED|FEEDBACK',
        reason: deleted
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getFeedBacksForApp = async (role, language) => {
    let feedBacks = []
    if (!language) language = Config.app.language
    const getFeedBack = await FeedBacks.findOne({
      language: language
    })
    if (getFeedBack) {
      if (role == Enum.ROLES.PARTNER) feedBacks = getFeedBack.partnerFeedBack
      else feedBacks = getFeedBack.customerFeedBack
      console.log('feedBacks', feedBacks)
      return feedBacks
    } else {
      if (role == Enum.ROLES.PARTNER) feedBacks = ServiceConfig.feedBacks.partner
      else feedBacks = ServiceConfig.feedBacks.customer
      console.log('feedBacks', feedBacks)
      return feedBacks
    }
  }
}

export { FeedBackController }
