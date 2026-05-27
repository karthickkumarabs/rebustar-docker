/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { CmsPageController } from './controllers/CmsController.js'
import { SosController } from './sos/SosController.js'
import { UploadMiddlewware } from './../../middlewares/UploadMiddleware.js'

const { authorize } = AuthMiddleware
const SosFile = new UploadMiddlewware({ path: './public/temp/' }).singleFileUpload // optional not mandatory to upload

const Router = express.Router()

Router.route('/dynamic-pages')
  .put(authorize([Enum.ROLES.ADMIN]), CmsPageController.updateDynamicPages)
  .get(authorize([Enum.ROLES.ADMIN]), CmsPageController.getDynamicPages)
  .post(authorize([Enum.ROLES.ADMIN]), CmsPageController.createDynamicPages)
Router.route('/getDynamicPages').get(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  CmsPageController.getDynamicPagesForApp
)
// contact us

Router.route('/contact-us').post(CmsPageController.createContactRequest)

Router.post(
  '/module/sos/sendAlert',
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  SosController.sendAlert
)

// Sos routes
Router.route('/module/sos/:id?')
  .get(authorize(Enum.ROLES.ADMIN), SosController.getSosContent)
  .post(SosFile, authorize(Enum.ROLES.ADMIN), SosController.addSosContent)
  .put(SosFile, authorize(Enum.ROLES.ADMIN), SosController.updateSosContent)
  .delete(/* authorize(Enum.ROLES.ADMIN)*/ SosController.deleteSosContent)

export { Router as CmsPagesModule }
