/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { SendBulkNotifcationController as SendNotification } from './controllers/BulkPushNotificationController.js'

import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { UploadMiddlewware } from '../../middlewares/UploadMiddleware.js'
const { authorize } = AuthMiddleware
const PushNotificationFile = new UploadMiddlewware({ path: './public/pushnotification' }).singleFileUpload

const Router = express.Router()

Router.route('/sendPushNotifyBulk/:forType').post(
  authorize([Enum.ROLES.ADMIN]),
  PushNotificationFile,
  SendNotification.sendPushNotifyBulk
)

Router.route('/getPushNotification').get(authorize([Enum.ROLES.ADMIN]), SendNotification.getPushNotifications)
Router.route('/getTarget').get(SendNotification.getAvailableTargets)

export { Router as SendBulkNoticiationModule }
