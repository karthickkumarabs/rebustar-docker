/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { ShareRideController as ShareRide } from './controllers/ShareRideController.js'
// import { Enum } from '../../utils/Enum.js'
// import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
// const { authorize } = AuthMiddleware
const Router = express.Router()

Router.route('/module/services/request/shareRide/:shareRideId?')
  .post(
    // authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
    ShareRide.createShareRide
  )
  .get(
    // authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
    ShareRide.listAllShareRide
  )
  .patch(
    // authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
    ShareRide.updateShareRide
  )
  .delete(
    // authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
    ShareRide.deleteShareRide
  )
Router.route('/module/services/request/getShareRideMatch').post(
  // authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
  ShareRide.getMatchForShareRide
)
Router.route('/modules/services/request/requestPartnerForShareRide').post(
  // authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
  ShareRide.requestPartnerForShareRide
)
Router.route('/modules/services/request/listRequestedCustomer/:id?').get(
  // authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
  ShareRide.listRequestedCustomer
)

export { Router as ShareRideModule }
