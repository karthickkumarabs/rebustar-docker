/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { CancelController } from './controllers/CancelController.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/cancel/config')
  .put(authorize([Enum.ROLES.ADMIN]), CancelController.updateCancelconfig)
  .get(authorize([Enum.ROLES.ADMIN]), CancelController.getCancelconfig)

export { Router as CancellationModule }
