/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../BaseController.js'
import Notification from '../../models/Notification/Notification.js'
// import { SmsController } from './SmsGateway.js'
import { MailController } from './MailGateway.js'
import { pushNotification } from './PushNotification.js'
import { Template } from './Template.js'

import { Enum } from '../../utils/Enum.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import Mustache from 'mustache'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class NotifcationController extends BaseController {
  constructor() {
    super()
  }

  static createNotification = async (messageData) => {
    let response = {
      status: false,
      data: {},
      message: 'Unprocessable Entry'
    }
    try {
      const { processType = [], data = {} } = messageData
      if (!Array.isArray(processType)) throw new Error('UNPROCESSABLE_ENTITY')

      if (processType.includes(Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION)) {
        if (data.template) {
          if (!Template.pushNotification[data.template]) throw new Error('TEMPLATE_NOT_REGISTERED')
          const bodyContent = Template.pushNotification[data.template]
          data.body = Mustache.render(bodyContent, data.templateData || {})
        }
        await pushNotification.init()
        const pushToken = data.pushToken
        const tokens = (Array.isArray(pushToken) ? pushToken : [pushToken]).filter(
          (token) => typeof token === 'string' && token.trim().length > 0
        ) // normalize to array

        for (const token of tokens) {
          await pushNotification.sendNotification({
            pushToken: token,
            data: {
              title: data.title,
              body: data.body
            },
            template: data.template
          })
        }
        response.status = true
        response.message = 'Notified'
      }

      if (processType.includes(Enum.NOTIFICATION.TYPE.MAIL)) {
        const sendEmail = await MailController.sendMail({
          mailData: {
            email: data.email,
            content: data.contentdata,
            subject: data.subject
          }
        })
        response.status = sendEmail
        response.message = sendEmail ? 'Sent' : response.message
      }

      if (processType.includes(Enum.NOTIFICATION.TYPE.SMS)) {
        response.message = 'NEET_TO_DO'
      }

      if (processType.includes(Enum.NOTIFICATION.TYPE.INACCOUNT)) {
        const createObject = {
          userId: data.userId || null,
          userType: data.userType || Enum.ROLES.ADMIN,
          module: data.module || Enum.NOTIFICATION.TYPE.INACCOUNT,
          severity: data.severity || Enum.NOTIFICATION.SEVERITY.INFO,

          title: data.title,
          body: data.body,
          image: data.image || '',
          supplementary: data.supplementary || {}
        }
        await this.sendInAccount(createObject)
      }

      response = {
        status: true,
        data: {},
        message: 'NOTIFICATION_UPDATED'
      }
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static sendInAccount = async (createObj) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const createData = await Notification.create(createObj)
      if (createData) {
        response = {
          status: true,
          message: 'Success'
        }
      }
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static testPushNotification = async (req, res) => {
    try {
      const sendPushNotification = await pushNotification.sendNotification({
        pushToken: req.body.pushToken,
        data: {
          title: req.body.title,
          body: req.body.body
        }
      })
      return requestHandler.sendSuccess(
        req,
        res,
        'TEST_PUSHNOTIFICATION'
      )({ message: 'SUCCESS', pushNotification: sendPushNotification })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getNotification = async (req, res) => {
    try {
      const queryData = req.query || {}
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const auth = req.auth
      const userId = auth.userId

      const matchQuery = { deletedAt: null, module: Enum.NOTIFICATION.TYPE.INACCOUNT }
      if (auth.role == Enum.ROLES.ADMIN) {
        matchQuery['userType'] = Enum.ROLES.ADMIN
      } else {
        matchQuery['userId'] = userId
      }

      const notification = await Notification.aggregate([
        { $match: matchQuery },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            unRead: [{ $match: { isRead: false } }, { $count: 'total' }],
            data: [{ $skip: Number(skip) || 0 }, { $limit: Number(perPage) || 10 }]
          }
        }
      ])

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_NOTIFICATION'
      )({
        message: 'SUCCESS',
        notification: notification[0]?.data || [],
        total: notification[0]?.metadata[0]?.total || 0,
        unRead: notification[0]?.unRead[0]?.total || 0
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static readNotification = async (req, res) => {
    try {
      const auth = req.auth
      const userId = auth.userId

      const matchQuery = { deletedAt: null, module: Enum.NOTIFICATION.TYPE.INACCOUNT }
      if (auth.role == Enum.ROLES.ADMIN) {
        matchQuery['userType'] = Enum.ROLES.ADMIN
      } else {
        matchQuery['userId'] = userId
      }

      const isReadUpdate = await Notification.updateMany(matchQuery, { $set: { isRead: true } })
      if (!isReadUpdate) throw new Error('SOMETHING_WENT_WRONG')

      return requestHandler.sendSuccess(
        req,
        res,
        'READ_NOTIFICATION'
      )({ message: 'SUCCESS', count: isReadUpdate.modifiedCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteNotification = async (req, res) => {
    try {
      const auth = req.auth
      const userId = auth.userId

      const matchQuery = { deletedAt: null, module: Enum.NOTIFICATION.TYPE.INACCOUNT }
      if (auth.role == Enum.ROLES.ADMIN) {
        matchQuery['userType'] = Enum.ROLES.ADMIN
      } else {
        matchQuery['userId'] = userId
      }

      const isDeleted = await Notification.updateMany(matchQuery, { $set: { deletedAt: new Date() } })
      if (!isDeleted) throw new Error('SOMETHING_WENT_WRONG')

      return requestHandler.sendSuccess(
        req,
        res,
        'READ_NOTIFICATION'
      )({ message: 'SUCCESS', count: isDeleted.modifiedCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { NotifcationController }
