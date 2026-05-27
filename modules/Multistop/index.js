/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { MultistopController as MultistopModule } from './controllers/MultistopController.js'

const Router = express.Router()
const { authorize } = AuthMiddleware

Router.route('/services/daily/multiStop/estimation').post(MultistopModule.getEstimation)

Router.route('/services/daily/multiStop/request').post(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]),
  MultistopModule.tripRequest
)
Router.route('/services/daily/multiStop/updateTripStops').put(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  MultistopModule.updateTripStops
)
// Add stops after driver accept the trip
Router.route('/services/daily/multiStop/request/changeStops').post(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]),
  MultistopModule.changeStops
)

// update the config
Router.route('/module/multiStop/config')
  .get(authorize([Enum.ROLES.ADMIN]), MultistopModule.configData)
  .put(authorize([Enum.ROLES.ADMIN]), MultistopModule.updateConfigData)

export { Router as MultistopModule }
