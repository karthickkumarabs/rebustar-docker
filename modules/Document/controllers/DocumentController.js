/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import mongoose from 'mongoose'
import path from 'path'
import fs from 'fs'
import { DocumentConfig } from '../config.js'
import { DocumentConfig as globalDocConfig } from '../../../config/DocumentConfig.js'
import { DocumentValidator } from '../validator/DocumentValidator.js'
import Document from '../models/DocumentModel.js'
import { ServiceModuleError } from '../../../utils/ErrorHandler.js'
import { QueryBuilder } from '../../../helpers/QueryBuilder.js'
import { permissions } from '../../../config/Permissions.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class DocumentController extends BaseController {
  constructor() {
    super()
  }

  static updateConfigData = async (req, res) => {
    try {
      const body = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/Document/config.js`
      const fileContent = `
          /* ************************
     * Copyright 2023
     * ABSERVETECH
     ************************ */
    import { Enum } from '../../utils/Enum.js'
    const DocumentConfig = ${JSON.stringify(body, null, 2)} 
        export { DocumentConfig }`
      const utilityMenu = permissions.menusList.find((elem) => elem.module == 'utility')
      const documentMenu = {
        menu: 'Document',
        status: true,
        subMenu: true,
        module: 'document',
        subMenuList: []
      }

      if (body.isDynamic) {
        utilityMenu.subMenuList.unshift(documentMenu)
      } else {
        utilityMenu.subMenuList = utilityMenu.subMenuList.filter((item) => item.module != documentMenu.module)
      }
      const permissionsPath = `${__dirname}/config/Permissions.js`
      const permissionsContent = `
      /* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
    const permissions = ${JSON.stringify(permissions, null, 2)} 
    export { permissions }`

      fs.writeFileSync(filePath, fileContent)
      fs.writeFileSync(permissionsPath, permissionsContent)

      return requestHandler.sendSuccess(req, res, 'UPDATE_CONFIG')({ message: 'UPDATED', data: body })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static configData = async (req, res) => {
    try {
      const config = DocumentConfig
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_MULTISTOP_CONFIG'
      )({ message: 'SUCCESS', data: config })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getTypes = async (req, res) => {
    try {
      const config = globalDocConfig.types
      return requestHandler.sendSuccess(req, res, 'GET_TYPES')({ message: 'SUCCESS', types: config })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getFileTypes = async (req, res) => {
    try {
      const config = globalDocConfig.fileTypes
      return requestHandler.sendSuccess(req, res, 'GET_FILE_TYPES')({ message: 'SUCCESS', types: config })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getDocument = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params
      const perPage = parseInt(queryData.limit) || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}

      console.log(queryData, 'queryData')

      const queryBuilder = await QueryBuilder.getSearchable(Document, queryData)
      queryObject = queryBuilder.queryObject || queryObject
      queryObject['deletedAt'] = null

      if (paramData.id) {
        queryObject._id = new mongoose.Types.ObjectId(paramData.id)
      }

      const pipeline = [
        {
          $lookup: {
            from: 'serviceareas',
            localField: 'serviceCities',
            foreignField: '_id',
            as: 'serviceArea'
          }
        },
        {
          $unwind: {
            path: '$serviceArea',
            preserveNullAndEmptyArrays: true
          }
        },
        { $match: queryObject },
        {
          $project: {
            type: 1,
            name: 1,
            indexName: 1,
            mandatory: 1,
            status: 1,
            description: 1,
            fields: 1,
            serviceArea: {
              name: '$serviceArea.name',
              _id: '$serviceArea._id'
            }
          }
        },
        {
          $facet: {
            data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: perPage }],
            count: [
              {
                $count: 'totalCount'
              }
            ]
          }
        }
      ]

      console.log('pipeline', JSON.stringify(pipeline))

      const getData = await Document.aggregate(pipeline).sort({ _id: -1 })
      console.log('RESULT', getData)

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_VEHICLE'
      )({ message: 'SUCCESS', document: getData[0].data, total: getData[0].count[0]?.totalCount || 0 })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addDocument = async (req, res) => {
    try {
      const body = req.body
      const serviceCities = req.body.serviceAreaId?.split(',') || []
      const validation = await DocumentValidator.validateData(body, 'addDocument')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existCityDocument = await Document.findOne({
        serviceCities: { $in: serviceCities },
        type: body.type,
        name: body.name
      })

      if (existCityDocument) {
        throw new ServiceModuleError('DOCUMENT_ALREADY_EXIST')
      }

      const document = new Document({
        serviceCities: serviceCities,
        type: body.type,
        name: body.name,
        indexName: body.indexName,
        mandatory: body.mandatory,
        fields: body.fields // array of object
      })

      await document.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'DOCUMENT_ADDED'
      )({ message: 'SUCCESS', document: document })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateDocument = async (req, res) => {
    try {
      const body = req.body
      const serviceCities = req.body.serviceAreaId?.split(',') || []
      const validation = await DocumentValidator.validateData(body, 'updateDocument')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      // to avoid duplicate document creation in the document
      const data = await Document.findOne({
        _id: { $ne: body.documentId },
        type: body.type,
        serviceCities: { $in: serviceCities },
        name: body.name
      })

      if (data) throw new ServiceModuleError('DOCUMENT_EXISTSs_WITH_SAME_CREDENTIAL')

      const existCityDocument = await Document.findOne({
        _id: body.documentId,
        deletedAt: null
      })

      if (!existCityDocument) {
        throw new ServiceModuleError('DOCUMENT_NOT_FOUND')
      }

      existCityDocument.serviceCities = body.serviceCities || existCityDocument.serviceCities
      existCityDocument.type = body.type || existCityDocument.type
      existCityDocument.name = body.name || existCityDocument.name
      existCityDocument.mandatory = body.mandatory || existCityDocument.mandatory
      existCityDocument.status = body.status || existCityDocument.mandatory
      existCityDocument.description = body.description || existCityDocument.description
      existCityDocument.fields = body.fields || existCityDocument.fields

      await existCityDocument.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'DOCUMENT_UPDATED'
      )({ message: 'SUCCESS', data: existCityDocument })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteDocument = async (req, res) => {
    try {
      const id = req.params.id
      const serviceId = req.params.serviceId
      const existCityDocument = await Document.findOne({
        _id: id,
        serviceCities: { $in: [serviceId] }
      })

      if (!existCityDocument) {
        throw new ServiceModuleError('SOMETHING_WENT_WRONG')
      }

      if (existCityDocument.serviceCities.length > 1) {
        existCityDocument.serviceCities = existCityDocument.serviceCities.filter((item) => item != serviceId)
      } else {
        existCityDocument.deletedAt = new Date()
      }
      await existCityDocument.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'DOCUMENT_DELETED'
      )({ message: 'SUCCESS', data: existCityDocument })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { DocumentController }
