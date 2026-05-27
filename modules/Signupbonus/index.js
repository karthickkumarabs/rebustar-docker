/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { SignupBonusController } from './controllers/SignupbonusController.js'

const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/signupbonus/config')
  .put(authorize([Enum.ROLES.ADMIN]), SignupBonusController.updateSignupBonusConfig)
  .get(authorize([Enum.ROLES.ADMIN]), SignupBonusController.getSignupBonusConfig)

export { Router as SignUpBonusModule }
