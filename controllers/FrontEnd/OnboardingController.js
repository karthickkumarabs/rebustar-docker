/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

import { BaseController } from '../BaseController.js'

import Onboarding from '../../models/FrontEnd/Onboarding.js'

import { RequestHandler } from './../../utils/RequestHandler.js'
import { Logger } from './../../utils/Logger.js'
import { NotFoundError } from '../../utils/ErrorHandler.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class OnboardingController extends BaseController {
  constructor() {
    super()
  }
  static async getOnboarding(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      // const queryObj = {}
      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(Onboarding, queryData)
      queryObject = queryBuilder.queryObject

      if (paramData.id) {
        queryObject._id = mongoose.Types.ObjectId(paramData.id)
      }
      const getDataCount = await Onboarding.find(queryObject).count()
      const getData = await Onboarding.find(queryObject).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ONBOARDING'
      )({ message: 'SUCCESS', onboarding: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static async createOnboarding(req, res) {
    try {
      const onboarding = new Onboarding()
      const bodyData = req.body

      onboarding.title = bodyData.title
      onboarding.description = bodyData.description

      if (req.file) onboarding.image = req.file.path

      const saveData = await onboarding.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_ONBOARDING'
      )({ message: 'CREATED|ONBORADING', onboarding: saveData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static async updateOnboarding(req, res) {
    try {
      const onboardingId = req.params.id
      const bodyData = req.body
      const onboarding = await Onboarding.findOne({ _id: onboardingId }).exec()
      if (!onboarding) throw new NotFoundError('NOT_FOUND|DOCUMENT')

      onboarding.title = bodyData.title
      onboarding.description = bodyData.description

      if (req.file) onboarding.image = req.file.path

      const saveData = await onboarding.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_ONBOARING'
      )({ message: 'UPDATED|ONBOARDING', onboarding: saveData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static async deleteOnboarding(req, res) {
    try {
      const onboardingId = req.params.id
      const deleteItem = await Onboarding.findByIdAndDelete({ _id: onboardingId }).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_ONBOARDING'
      )({ message: 'DELETED|ONBOARDING', deleteItem: deleteItem })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}
export { OnboardingController }
