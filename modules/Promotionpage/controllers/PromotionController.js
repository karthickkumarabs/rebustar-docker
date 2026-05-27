/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import { PromotionValidator } from '../validators/PromotionValidator.js'
import { CreteriaService } from '../../../services/Creteria/CreteriaServices.js'
import path from 'path'
import Promotion from '../models/Promotion.js'
import mongoose from 'mongoose'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class PromotionController extends BaseController {
  constructor() {
    super()
  }

  static uploadfile = async (req, res) => {
    try {
      const filepath = req.file.path
      return requestHandler.sendSuccess(req, res, 'GET_FILE')({ message: 'GET|FILE', filepath: filepath })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static removeOldfiles = async (iconurl) => {
    const __dirname = path.resolve()
    const url = `${__dirname}/${iconurl}`
    const filename = url.split('promotions/')[1]
    const newpathurl = `${__dirname}/public/promotion`
    const getPath = await CreteriaService.makeDirectory(newpathurl)
    if (!getPath.status) throw new Error(getPath.message)
    const directory = getPath.data.newPath + '/' + path.basename(filename)
    await CreteriaService.moveFile(url, directory)
    await CreteriaService.removeFile(filename)
  }

  static createPromotion = async (req, res) => {
    try {
      const body = req.body || {}
      console.log('body', body)
      const validation = await PromotionValidator.validateData(body, 'createPromotion')
      console.log('validation', validation)
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const existData = await Promotion.findById({
        serviceTypeId: mongoose.Types.ObjectId(body.serviceTypeId)
      }).exec()
      if (existData) throw new Error('ALREADY_ADDED_FOR_THIS_SERVICETYPE_|PROMOTION')

      const newDoc = new Promotion({
        serviceTypeId: mongoose.Types.ObjectId(body.serviceTypeId),
        description: body.description,
        features: body.features
      })
      const promotionData = await newDoc.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_PROMOTION'
      )({ message: 'CREATED|PROMOTION', promotionData: promotionData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updatePromotion = async (req, res) => {
    try {
      const body = req.body
      const validation = await PromotionValidator.validateData(body, 'updatePromotion')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const promotionData = await Promotion.findById({
        _id: mongoose.Types.ObjectId(req.params.promotionId)
      }).exec()
      if (body.status == 'Inactive') {
        promotionData.status = body.status
      } else {
        console.log('promotionData', promotionData)
        for (const url of promotionData.features) {
          await this.removeOldfiles(url.icon)
        }
        promotionData.serviceTypeId = mongoose.Types.ObjectId(body.serviceTypeId)
        promotionData.description = body.description
        promotionData.features = body.features
      }
      const updatePromotiondata = await promotionData.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_PROMOTION'
      )({ message: 'UPDATED|PROMOTION', promotionData: updatePromotiondata })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }
  static getPromotion = async (req, res) => {
    try {
      const queryData = req.query
      console.log('queryData', queryData)
      const perPage = parseInt(queryData.limit) || 10
      const page = parseInt(queryData.page) || 1
      const skip = (page - 1) * perPage
      const pipeline = []
      if (queryData.serviceTypeId) {
        pipeline.push({
          $match: {
            serviceTypeId: mongoose.Types.ObjectId(queryData.serviceTypeId),
            status: 'Active'
          }
        })
      } else {
        pipeline.push({
          $match: {
            status: 'Active'
          }
        })
      }
      pipeline.push({
        $lookup: {
          from: 'servicetypes',
          localField: 'serviceTypeId',
          foreignField: '_id',
          as: 'servicetypeData'
        }
      })
      pipeline.push({
        $unwind: {
          path: '$servicetypeData',
          preserveNullAndEmptyArrays: true
        }
      })
      pipeline.push({
        $lookup: {
          from: 'pricings',
          localField: 'serviceTypeId',
          foreignField: 'serviceId',
          as: 'pricingData'
        }
      })
      pipeline.push({
        $unwind: {
          path: '$pricingData',
          preserveNullAndEmptyArrays: true
        }
      })
      pipeline.push({
        $project: {
          _id: 1,
          serviceTypeId: 1,
          description: 1,
          features: 1,
          pricingData: 1,
          servicetypeData: 1
        }
      })
      pipeline.push({ $sort: { _id: -1 } })
      pipeline.push({ $skip: skip })
      pipeline.push({ $limit: perPage })
      const promotionData = await Promotion.aggregate(pipeline).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PROMOTION'
      )({
        message: 'GET|PROMOTION',
        promotionData,
        total: promotionData.length
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static removePromotion = async (req, res) => {
    try {
      const data = await Promotion.findById(mongoose.Types.ObjectId(req.params.promotionId)).exec()
      for (const url of data.features) {
        await this.removeOldfiles(url.icon)
      }
      const promotionData = await Promotion.findById(mongoose.Types.ObjectId(req.params.promotionId))
        .remove()
        .exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_PROMOTION'
      )({ message: 'DELETED|PROMOTION', promotionData: promotionData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { PromotionController }
