/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'

import { ServiceModuleController as ServiceModule } from '../../controllers/ServiceModule/ServiceModuleController.js'
import { TestController as Test } from '../../controllers/ServiceModule/TestController.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { DailyModuleController as DailyModule } from '../../controllers/ServiceModule/DailyModuleController.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

// customer
Router.route('/services').get(ServiceModule.getServices)
Router.route('/services/nearby').get(ServiceModule.getNearbyPartners)
Router.route('/services/estimation/daily').get(ServiceModule.getEstimation)
// this api used for single request flow for customer and driver
Router.route('/services/request').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
  ServiceModule.getRequestDetails
)
// this api used for bulkrequest for partners
Router.route('/services/partnerRequest').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
  ServiceModule.getPartnerRequestDetails
)

Router.route('/services/request/create/daily').post(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]),
  DailyModule.createRequest
)

// Change destination for customer and admin while in trip
Router.route('/services/request/daily/change-destination').post(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]),
  ServiceModule.changeDestination
)

Router.route('/services/request/customerCancel').put(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]),
  ServiceModule.cancelRequest
)
Router.route('/services/request/customerHistory').get(
  authorize([Enum.ROLES.CUSTOMER]),
  ServiceModule.customerHistory
)

// Partner
Router.route('/services/request/status').patch(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  ServiceModule.patchRequestStatus
)

// Router.route('/services/daily/multiStop/request/changeStops').post(
//   authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]),
//   DailyModule.changeDestination
// )

// for changing status - Multi-stop
Router.route('/services/request/daily/stop/status').patch(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  DailyModule.updateTripStop
)

Router.route('/services/request/update/daily').put(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  DailyModule.updateTripstatus
)
Router.route('/services/request/locater').get(ServiceModule.getRequestLocater)
Router.route('/services/request/feedback').post(
  authorize([Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]),
  ServiceModule.feedBack
)
Router.route('/services/request/partnerCancel').put(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  ServiceModule.cancelTrip
)

Router.route('/services/request/partnerEarnings').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  ServiceModule.partnerEarnings
)

// admin
Router.route('/services/request/adminHistory').get(authorize([Enum.ROLES.ADMIN]), ServiceModule.adminHistory)
Router.route('/services/request/heatMap').get(authorize([Enum.ROLES.ADMIN]), ServiceModule.heatMapReport)

Router.route('/service/testfirebaseupdate').post(Test.testfirebaseupdate)
Router.route('/service/testEmail').post(Test.testemail)
Router.route('/service/testPartnerApproval').post(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  Test.partnerAutoApproval
)

Router.route('/services/request/getcustomerDetails').get(ServiceModule.getCustomerDetails)
Router.route('/services/request/checkPayment').get(ServiceModule.checkPayment)
Router.route('/services/request/reviews').get(ServiceModule.getReviewDetails)

export { Router as ServiceModule }
