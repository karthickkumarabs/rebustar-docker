/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { ReferralController } from './controllers/ReferralController.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/referral/config')
  .put(authorize([Enum.ROLES.ADMIN]), ReferralController.updatereferralConfig)
  .get(authorize([Enum.ROLES.ADMIN]), ReferralController.getreferralConfig)

Router.route('/module/referral/referralreport').get(
  authorize([Enum.ROLES.ADMIN]),
  ReferralController.getReferralreport
)

Router.route('/module/referral/referraltrxreport').get(
  authorize([Enum.ROLES.ADMIN]),
  ReferralController.getReferraltrxReport
)

export { Router as ReferralModule }
