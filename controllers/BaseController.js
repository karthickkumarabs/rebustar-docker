/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { RequestHandler } from '../utils/RequestHandler.js'
import { Logger } from '../utils/Logger.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)
class BaseController {
  static async getSuccess(req, res) {
    try {
      return requestHandler.sendSuccess(req, res, 'SERVER_INFORMATION')({ message: 'IAM_SUCCESS' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static async getError(req, res) {
    try {
      throw new Error('I am Error')
      // return requestHandler.sendSuccess(req, res, 'SERVER_INFORMATION')({ message: 'IAM_INTRUDER' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static async getValidator(req, res) {
    try {
      requestHandler.validator(new Error('IMA_VALIDATOR'), 400, 'BAD_REQUEST', 'IAM_VALIDATOR')
      return requestHandler.sendSuccess(req, res, 'SERVER_INFORMATION')({ message: 'IAM_INTRUDER' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}
export { BaseController }
