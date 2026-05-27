/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'

import { HailTripsModuleController as HailTripsModule } from './controllers/HailTripsController.js'

import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'

const { authorize } = AuthMiddleware
import { Enum } from '../../utils/Enum.js'

const Router = express.Router()

Router.route('/services/estimation/hailride').get(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.ADMIN]),
  HailTripsModule.getEstimation
)
Router.route('/services/request/create/hailride').post(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  HailTripsModule.createHailRideRequest
)
Router.route('/services/request/update/hailride').put(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  HailTripsModule.updateTripstatus
)
Router.route('/list/hail').get(HailTripsModule.listHailTrips)

Router.route('/module/hailtrip/config')
  .put(authorize([Enum.ROLES.ADMIN]), HailTripsModule.updateConfig)
  .get(authorize([Enum.ROLES.ADMIN]), HailTripsModule.getConfig)

export { Router as HailTripsModule }
