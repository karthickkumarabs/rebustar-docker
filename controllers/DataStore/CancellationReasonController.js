/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { RequestHandler } from '../../utils/RequestHandler.js'
import { BaseController } from '../BaseController.js'
import { Logger } from '../../utils/Logger.js'
import CancelReasons from '../../models/DataStore/Cancellation.js'
import Language from '../../models/DataStore/Language.js'
import { ServiceConfig } from '../../config/ServiceConfig.js'
import mongoose from 'mongoose'
import { Config } from '../../config/AppConfig.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

const formatReasons = (reasons) =>
  Array.isArray(reasons)
    ? reasons.map((i) => i.trim()).filter(Boolean)
    : reasons
        ?.split(/[\n,]/)
        .map((i) => i.trim())
        .filter(Boolean) || []

class CancelReasonController extends BaseController {
  constructor() {
    super()
  }

  static getCancelReasons = async (req, res) => {
    try {
      const { id } = req.params
      const { limit = 10, page = 1 } = req.query
      const perPage = parseInt(limit)
      const skip = (parseInt(page) - 1) * perPage

      const queryObject = id ? { _id: mongoose.Types.ObjectId(id) } : {}

      const [total, reasons] = id
        ? await CancelReasons.findOne(queryObject)
            .lean()
            .then((reason) => [reason ? 1 : 0, reason ? [reason] : []])
        : await Promise.all([
            CancelReasons.countDocuments(queryObject),
            CancelReasons.find(queryObject)
              .skip(skip)
              .limit(perPage)
              .populate('languageId', 'name indexName')
              .lean()
          ])

      const finalReasons = reasons?.length
        ? reasons
        : [
            {
              languageId: ServiceConfig.cancelReasons.languageId,
              partnerCancelReason: ServiceConfig.cancelReasons.partner,
              customerCancelReason: ServiceConfig.cancelReasons.customer
            }
          ]

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_CANCEL_REASONS'
      )({
        message: 'GET_CANCEL_REASONS_SUCCESS',
        total: reasons?.length ? total : 1,
        reasons: finalReasons
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createCancelReason = async (req, res) => {
    try {
      const { languageId, partnerCancelReason = [], customerCancelReason = [] } = req.body

      !languageId
        ? (() => {
            throw new Error('LANGUAGE_ID_IS_REQUIRED')
          })()
        : !mongoose.Types.ObjectId.isValid(languageId)
        ? (() => {
            throw new Error('INVALID_LANGUAGE_ID')
          })()
        : null

      const existing = await CancelReasons.findOne({ languageId }).lean()
      existing &&
        (() => {
          throw new Error('LANGUAGE_ALREADY_EXISTS')
        })()

      const reason = await CancelReasons.create({
        languageId,
        partnerCancelReason: formatReasons(partnerCancelReason),
        customerCancelReason: formatReasons(customerCancelReason)
      })

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CANCEL_REASON'
      )({
        message: 'CREATED|CANCEL_REASON',
        reason
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateCancelReason = async (req, res) => {
    try {
      const { partnerCancelReason, customerCancelReason } = req.body
      const { id } = req.params

      !id &&
        (() => {
          throw new Error('REASON_ID_IS_REQUIRED')
        })()

      const reason = await CancelReasons.findById(id)
      !reason &&
        (() => {
          throw new Error('CANCEL_REASON_NOT_FOUND')
        })()

      partnerCancelReason && (reason.partnerCancelReason = formatReasons(partnerCancelReason))
      customerCancelReason && (reason.customerCancelReason = formatReasons(customerCancelReason))

      const updated = await reason.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_CANCEL_REASON'
      )({
        message: 'UPDATED|CANCEL_REASON',
        reason: updated
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteCancelReason = async (req, res) => {
    try {
      const { id } = req.params

      !id &&
        (() => {
          throw new Error('REASON_ID_IS_REQUIRED')
        })()

      const deleted = await CancelReasons.findByIdAndDelete(id).lean()
      !deleted &&
        (() => {
          throw new Error('CANCEL_REASON_NOT_FOUND')
        })()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_CANCEL_REASON'
      )({
        message: 'DELETED|CANCEL_REASON',
        reason: deleted
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getCancelReasonsForApp = async (role, language) => {
    let cancelReasons = []
    if (!language) language = Config.app.language
    const languageId = null
    const findLanguage = await Language.findOne({ indexName: language })
    let queryObj = {}
    if (findLanguage) {
      queryObj = {
        languageId: languageId
      }
    }
    const getCancelReason = await CancelReasons.findOne(queryObj)
    if (getCancelReason) {
      if (role == Enum.ROLES.PARTNER) cancelReasons = getCancelReason.partnerCancelReason
      else cancelReasons = getCancelReason.customerCancelReason
      console.log('cancelReasons', cancelReasons)
      return cancelReasons
    } else {
      if (role == Enum.ROLES.PARTNER) cancelReasons = ServiceConfig.cancelReasons.partner
      else cancelReasons = ServiceConfig.cancelReasons.customer
      console.log('cancelReasons', cancelReasons)
      return cancelReasons
    }
  }
}

export default CancelReasonController
