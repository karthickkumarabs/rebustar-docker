/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { OTPValidationController } from './OTPValidationController.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/otpLimitation/config')
  .put(authorize([Enum.ROLES.ADMIN]), OTPValidationController.updateOTPconfig)
  .get(authorize([Enum.ROLES.ADMIN]), OTPValidationController.getOTPconfig)

export { Router as OTPModule }
