/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { SubscriptionController as Subscription } from './SubscriptionController.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware
import { UploadMiddlewware } from '../../middlewares/UploadMiddleware.js'
const PackageFile = new UploadMiddlewware({ path: './public/temp/' }).singleFileUpload
const Router = express.Router()

Router.route('/module/subscription/package/:packageId?')
  .post(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), PackageFile, Subscription.addPackage)
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Subscription.getPackage)
  .put(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), PackageFile, Subscription.updatePackage)
  .delete(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Subscription.deletePackage)

Router.route('/module/subscription/purchasePackage/:purchasePackageId?')
  .post(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Subscription.addPurchasePackage)
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Subscription.getPurchasePackage)
  .put(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Subscription.updatePurchasePackage)
  .delete(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Subscription.deletePurchasePackage)

Router.route('/modules/subscription/config')
  .get(authorize([Enum.ROLES.ADMIN]), Subscription.configData)
  .put(authorize([Enum.ROLES.ADMIN]), Subscription.updateConfigData)

Router.route('/modules/subscription/types').get(Subscription.packageTypes)

export { Router as SubscriptionModule }
