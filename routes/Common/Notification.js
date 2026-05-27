/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'

import { NotifcationController as Notification } from '../../controllers/Notification/Index.js'
import { MailTemplate } from '../../controllers/Notification/MailTemplate.js'

import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { MailController } from '../../controllers/Notification/MailGateway.js'
import { SmsController } from '../../controllers/Notification/SmsGateway.js'
import { NotificationController } from '../../controllers/Notification/expiryDocuments.js'
const { authorize } = AuthMiddleware

const Router = express.Router()
Router.route('/common/notifications')
  .get(authorize([Enum.ROLES.ADMIN]), Notification.getNotification)
  .put(authorize([Enum.ROLES.ADMIN]), Notification.readNotification)
  .delete(authorize([Enum.ROLES.ADMIN]), Notification.deleteNotification)

Router.route('/common/template/:id?')
  .post(authorize([Enum.ROLES.ADMIN]), MailTemplate.createTemplate)
  .get(MailTemplate.getTemplates)
  .put(MailTemplate.updateTemplate)
  .delete(MailTemplate.deleteTemplate)

Router.route('/common/email/testmail').post(MailController.sendMail)
Router.route('/common/email/testsms').post(SmsController.sendSms)

Router.route('/common/config/getsmsconfig').get(SmsController.getConfig)
Router.route('/common/config/setsmsconfig').post(SmsController.updateConfig)
Router.route('/common/config/activesmsgateway').put(SmsController.activegateway)

Router.route('/common/config/getmailconfig').get(MailController.getConfig)
Router.route('/common/config/setmailconfig').post(MailController.updateConfig)
Router.route('/common/config/activemailgateway').put(MailController.activegateway)

Router.route('/common/config/getExpiredPartnerDocsconfig').get(
  NotificationController.getPartnerExpiredDocuments
)

export { Router as Notification }
