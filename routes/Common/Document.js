/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'

import { DocumentController as Document } from '../../controllers/Creteria/DocumentController.js'

import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware

import { UploadMiddlewware } from '../../middlewares/UploadMiddleware.js'

const DocumentFile = new UploadMiddlewware({ path: './public/Auth/Partners' }).unknownFields

const Router = express.Router()

Router.route('/common/document/partner/:partnerId?')
  .post(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), DocumentFile, Document.uploadDocument)
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Document.getPartnerDocuments)
Router.route('/common/document/vehicle/:partnerId?/:vehicleId?')
  .post(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), DocumentFile, Document.uploadVehicleDocument)
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Document.getvehicleDocuments)

Router.route('/common/document/expiredPartners').get(Document.getExpiredPartners)
Router.route('/common/document/expiredVehicles').get(Document.getExpiredVehicles)

Router.route('/common/document/partnerdocexpirynotify').get(Document.notifyExpiredPartners)
Router.route('/common/document/vehicledocexpirynotify').get(Document.notifyExpiredVehicles)

Router.route('/common/document/updateStatus').patch(Document.updateStatus)

export { Router as Document }
