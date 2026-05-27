/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import express from 'express'
import { RentalPackageController as Rental } from './controllers/RentalController.js'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/rental/package/:packageId?')
  .post(authorize([Enum.ROLES.ADMIN]), Rental.createRentalPackage)
  .get(authorize([Enum.ROLES.ADMIN]), Rental.getRentalPackage)
  .put(authorize([Enum.ROLES.ADMIN]), Rental.updateRentalPackage)

Router.route('/module/rental/package/:packageId/:serviceTypeId?')
  .get(authorize([Enum.ROLES.ADMIN]), Rental.getService)
  .post(authorize([Enum.ROLES.ADMIN]), Rental.addService)
  .put(authorize([Enum.ROLES.ADMIN]), Rental.updateService)
  .delete(authorize([Enum.ROLES.ADMIN]), Rental.deleteRentalPackage)

Router.route('/services/packages/rental/:packageId?').get(Rental.getPackages)

Router.route('/services/estimation/rental').get(Rental.getEstimation)
Router.route('/services/request/create/rental').post(
  authorize([Enum.ROLES.CUSTOMER, Enum.ROLES.ADMIN]),
  Rental.createRequest
)
Router.route('/services/request/update/rental').put(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  Rental.updateTripstatus
)

export { Router as RentalModule }
