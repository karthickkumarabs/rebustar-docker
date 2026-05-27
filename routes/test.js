/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { VerificationService } from '../services/Common/VerificationService.js'
import { NotifcationController } from '../controllers/Notification/Index.js'

const Router = express.Router()
Router.route('/verification/create').post(VerificationService.addVerify)
Router.route('/verification/check').post(VerificationService.checkVerify)
Router.route('/notification/pushNotification').post(NotifcationController.testPushNotification)

export { Router as Test }
