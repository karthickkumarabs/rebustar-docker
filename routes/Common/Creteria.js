/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'

import { VehicleController as vehicle } from '../../controllers/Creteria/VehicleController.js'
import { ServiceAreaController as ServiceArea } from '../../controllers/Creteria/ServiceAreaController.js'
import { ServiceTypeController as ServiceType } from '../../controllers/Creteria/ServiceTypeController.js'
import { PricingController as Price } from '../../controllers/Creteria/PricingController.js'
import { CouponController as CouponModule } from '../../controllers/Creteria/CouponController.js'
import { OfferController as OfferModule } from '../../controllers/Creteria/OfferController.js'

import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize, addAuth } = AuthMiddleware

import { UploadMiddlewware } from './../../middlewares/UploadMiddleware.js'
const ServiceTypeFile = new UploadMiddlewware({ path: './public/temp/auth' }).multipleKnownFields
const OfferFile = new UploadMiddlewware({ path: './public/Offer' }).singleFileUpload

const Router = express.Router()

Router.route('/serviceType/list').get(ServiceType.listAllServiceType)
Router.route('/serviceType/:serviceTypeId?')
  .get(ServiceType.getServicesType)
  .post(authorize([Enum.ROLES.ADMIN]), ServiceTypeFile, ServiceType.createServicesType)
  .put(authorize([Enum.ROLES.ADMIN]), ServiceTypeFile, ServiceType.updateServicesType)
  .delete(authorize([Enum.ROLES.ADMIN]), ServiceType.deleteServicesType)

Router.route('/serviceArea/list').get(ServiceArea.listServiceArea)
Router.route('/serviceArea/:serviceAreaId?')
  .get(authorize([Enum.ROLES.ADMIN]), ServiceArea.getServiceArea)
  .post(authorize([Enum.ROLES.ADMIN]), ServiceArea.createServiceArea)
  .put(authorize([Enum.ROLES.ADMIN]), ServiceArea.updateServiceArea)
  .delete(authorize([Enum.ROLES.ADMIN]), ServiceArea.deleteServiceArea)

Router.route('/vehicle/partner/:partnerId?').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  vehicle.getPartnerVehicle
)

Router.route('/vehicle/list').get(vehicle.listAllVehicles)
Router.route('/vehicle/active').get(addAuth([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), vehicle.activeVehicle)
Router.route('/vehicle/:vehicleId?')
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), vehicle.getVehicle)
  .post(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), vehicle.createVehicle)
  .put(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), vehicle.updateVehicle)
  .patch(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), vehicle.vehicleStatus)
  .delete(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), vehicle.deleteVechicle)

Router.route('/pricing/:pricingId?')
  .get(authorize([Enum.ROLES.ADMIN]), Price.getPricing)
  .post(authorize([Enum.ROLES.ADMIN]), ServiceTypeFile, Price.createPricing)
  .put(authorize([Enum.ROLES.ADMIN]), ServiceTypeFile, Price.updatePricing)
  .delete(authorize([Enum.ROLES.ADMIN]), Price.deletePricing)

Router.route('/coupon/:couponId?')
  .post(authorize([Enum.ROLES.ADMIN]), CouponModule.addCoupon)
  .get(authorize([Enum.ROLES.ADMIN]), CouponModule.getCoupon)
  .put(authorize([Enum.ROLES.ADMIN]), CouponModule.updateCoupon)
  .delete(authorize([Enum.ROLES.ADMIN]), CouponModule.deleteCoupon)

Router.route('/offer/:offerId?')
  .post(authorize([Enum.ROLES.ADMIN]), OfferFile, OfferModule.addOffer)
  .get(authorize([Enum.ROLES.ADMIN]), OfferModule.getOffer)
  .put(authorize([Enum.ROLES.ADMIN]), OfferFile, OfferModule.updateOffer)
  .delete(authorize([Enum.ROLES.ADMIN]), OfferModule.deleteOffer)

Router.route('/offerList').get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]), OfferModule.getOfferList)

export { Router as Creteria }
