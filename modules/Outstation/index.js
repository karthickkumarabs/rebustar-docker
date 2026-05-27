/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { OutStationPacakgeController as Outstation } from './controllers/OutstationController.js'

import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/outstation/package/:packageId?')
  .post(authorize([Enum.ROLES.ADMIN]), Outstation.createOutstationPackage)
  .get(authorize([Enum.ROLES.ADMIN]), Outstation.getOutstationPackage)
  .put(authorize([Enum.ROLES.ADMIN]), Outstation.updateOutstationPackage)
  .delete(authorize([Enum.ROLES.ADMIN]), Outstation.deleteOutstationPackage)

Router.route('/module/outstation/vehicles/:packageId/:serviceTypeId?')
  .get(authorize([Enum.ROLES.ADMIN]), Outstation.getVehicles)
  .post(authorize([Enum.ROLES.ADMIN]), Outstation.addVehicles)
  .put(authorize([Enum.ROLES.ADMIN]), Outstation.updateVehicles)
  .delete(authorize([Enum.ROLES.ADMIN]), Outstation.deleteVehicles)

Router.route('/services/estimation/outstation').get(Outstation.getEstimation)
Router.route('/services/request/create/outstation').post(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]),
  Outstation.createRequest
)
Router.route('/services/request/update/outstation').put(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  Outstation.updateTripstatus
)

export { Router as OutstationModule }
