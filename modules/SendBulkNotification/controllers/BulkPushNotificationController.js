/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import BulkpushNotificationSchema from '../models/BulkPushNotification.js'
import FCMController from './function.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import { sendPushNotificationWorker } from '../workers/BulkPushNotificationWorker.js' // path as appropriate
import { Config } from '../../../config/AppConfig.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class SendBulkNotifcationController extends BaseController {
  constructor() {
    super()
  }

  // working perfect
  static sendPushNotifyBulk = async (req, res) => {
    try {
      const { message, forWhom, scId, description = '', partnerId, customerId } = req.body
      console.log('Received file fieldname:', req.file?.fieldname)

      const forType = req.params.forType === 'sms' ? 2 : 1
      let image = `${Config.app.baseurl}/public/pushnotification/${req.file?.filename}`

      console.log('🚀 ~ SendNotifcationController ~ sendPushNotifyBulk= ~ image:', image)
      const serviceCityId = (() => {
        try {
          const parsed = JSON.parse(scId)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          return Array.isArray(scId) ? scId : [scId]
        }
      })()

      const mockMode = forWhom === 'MockMode' // testing

      // Call your function directly, no worker thread
      const result = await sendPushNotificationWorker({
        message,
        description,
        forWhom,
        forType,
        image,
        scId: serviceCityId,
        partnerId,
        customerId,
        mockMode // testing
      })

      if (!result.success) {
        return requestHandler.sendError(req, res, {
          message: result.message || 'No users found.',
          count: result.count || 0
        })
      }
      image = `public/pushnotification/${req.file?.filename}`
      await FCMController.backupdata({ message, description, forWhom, forType, image })

      return requestHandler.sendSuccess(
        req,
        res
      )({
        result: 'NOTIFICATION_TASK_SUCCESSFULLY_SENT',
        count: result.count
      })
    } catch (error) {
      console.error('sendPushNotifyBulk error:', error)
      return requestHandler.sendError(req, res, { message: error.message || 'Something went wrong' })
    }
  }

  static getPushNotifications = async (req, res) => {
    try {
      const { limit = 10, page = 1, _sort = 'createdAt', _order = 'DESC', forWhom, message } = req.query

      const perPage = parseInt(limit)
      const currentPage = parseInt(page)
      const skip = (currentPage - 1) * perPage
      const sortOrder = _order.toUpperCase() === 'ASC' ? 1 : -1

      const filteredQuery = { forType: 1 }
      if (forWhom) filteredQuery.forWhom = { $regex: forWhom, $options: 'i' }
      if (message) filteredQuery.message = { $regex: message, $options: 'i' }

      console.log('Final queryObject:', filteredQuery)

      // Count total matching records (ignoring pagination)
      const totalCount = await BulkpushNotificationSchema.countDocuments(filteredQuery)

      // Get paginated data
      const docs = await BulkpushNotificationSchema.find(filteredQuery)
        .sort({ [_sort]: sortOrder })
        .skip(skip)
        .limit(perPage)
        .lean()

      res.setHeader('x-total-count', totalCount)

      return requestHandler.sendSuccess(
        req,
        res
      )({
        result: 'NOTIFICATIONS_FETCHED_SUCCESSFULLY',
        totalCount,
        data: docs
      })
    } catch (error) {
      console.error('Error in getPushNotifications:', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getAvailableTargets = async (req, res) => {
    try {
      const availableTargets = [
        { label: 'All Partners', value: 'AllPartners' },
        { label: 'Online Partners', value: 'OnlinePartners' },
        { label: 'Offline Partners', value: 'OfflinePartners' },
        { label: 'Inactive Partners', value: 'InactivePartners' },
        // { label: "Partners By Code", value: "Partners" },
        // { label: "Specific Partner", value: "SpecificPartner" },
        // { label: "Specific Customer", value: "SpecificCustomer" },
        { label: 'Pending Partners', value: 'PendingPartners' },
        { label: 'Pending Customers', value: 'PendingCustomers' },
        { label: 'All Customers', value: 'AllCustomers' },
        { label: 'Inactive Customers', value: 'InactiveCustomers' }
      ]

      return requestHandler.sendSuccess(
        req,
        res
      )({
        message: 'SUCCESS',
        availableTargets
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { SendBulkNotifcationController }
