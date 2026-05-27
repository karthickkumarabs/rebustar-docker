/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../BaseController.js'
import EmailTemplate from '../../models/Notification/EmailTemplate.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class MailTemplate extends BaseController {
  constructor() {
    super()
  }
  static createTemplate = async (req, res) => {
    try {
      const body = req.body

      const createObj = {
        subject: body.subject,
        description: body.description,
        body: body.body,
        status: body.status,
        header: body.header,
        language: body.language
      }

      const checkExist = await EmailTemplate.findOne({ subject: body.subject, language: body.language })
      if (checkExist) throw new Error('TEMPLATE_ALREADY_EXISTS')

      const createData = await EmailTemplate.create(createObj)
      if (!createData) throw new Error('SOMETHING_WENT_WRONG')

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_TEMPLATE'
      )({ message: 'CREATED|TEMPLATE', documents: createData })
    } catch (error) {
      return requestHandler.sendError(req, res, Error)
    }
  }

  static getTemplates = async (req, res) => {
    try {
      let findCon = {}
      if (req.query.id) {
        findCon = { _id: req.query.id }
      }

      if (req.query.subject) {
        findCon.subject = { $regex: req.query.subject, $options: 'i' }
      }
      const getData = await EmailTemplate.find(findCon)
      if (!getData.length) throw new Error('NOT_FOUND|TEMPLATE')

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_TEMPLATES'
      )({ message: 'SUCCESS', documents: getData, totalCount: getData.length })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateTemplate = async (req, res) => {
    try {
      const body = req.body
      const updateData = await EmailTemplate.findOne({ _id: body._id })
      if (!updateData) throw new Error('NOT_FOUND|TEMPLATE')

      updateData.subject = body.subject || updateData.subject
      updateData.description = body.description || updateData.description
      updateData.body = body.body || updateData.body
      updateData.status = body.status ? body.status : false
      updateData.header = body.header || updateData.header
      updateData.language = body.language || updateData.language

      const updatedTemplate = await updateData.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_TEMPLATE'
      )({ message: 'UPDATED|TEMPLATE', documents: updatedTemplate })
    } catch (error) {
      return requestHandler.sendError(req, res, Error)
    }
  }

  static deleteTemplate = async (req, res) => {
    try {
      const body = req.params || req.body

      const deletedTemplate = await EmailTemplate.findByIdAndDelete(body.id)
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_TEMPLATE'
      )({ message: 'DELETED|TEMPLATE', deletedData: deletedTemplate })
    } catch (error) {
      return requestHandler.sendError(req, res, Error)
    }
  }
}

export { MailTemplate }
