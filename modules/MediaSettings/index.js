/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { SocialLinkController } from './controllers/SocialLinkController.js'
import MediaSectionController from './controllers/MediaSectionController.js'
import { UploadMiddlewware } from '../../middlewares/UploadMiddleware.js'
const { authorize } = AuthMiddleware
const Upload = new UploadMiddlewware({ path: './public/stickers/' }).multipleUpload

const Router = express.Router()

// social link

Router.route('/socialLink/:id?')
  .put(authorize([Enum.ROLES.ADMIN]), SocialLinkController.update)
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), SocialLinkController.getAll)
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), SocialLinkController.getById)
  .post(authorize([Enum.ROLES.ADMIN]), SocialLinkController.create)
  .delete(authorize([Enum.ROLES.ADMIN]), SocialLinkController.remove)

Router.route('/socialLinkById/:id?').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  SocialLinkController.getById
)

Router.route('/module/socialLink/config')
  .put(authorize([Enum.ROLES.ADMIN]), SocialLinkController.updateConfig)
  .get(authorize([Enum.ROLES.ADMIN]), SocialLinkController.getConfig)

// media section

Router.route('/stickers/:id?')
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), MediaSectionController.getAll)
  .post(authorize([Enum.ROLES.ADMIN]), Upload, MediaSectionController.create)
  .put(authorize([Enum.ROLES.ADMIN]), Upload, MediaSectionController.update)
  .delete(authorize([Enum.ROLES.ADMIN]), MediaSectionController.remove)

Router.route('/stickersById/:id').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  MediaSectionController.getById
)

Router.route('/module/media/config')
  .put(authorize([Enum.ROLES.ADMIN]), MediaSectionController.updateConfig)
  .get(authorize([Enum.ROLES.ADMIN]), MediaSectionController.getConfig)

// app side

Router.route('/api/socialLink/:id?').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  SocialLinkController.getAllForApp
)

Router.route('/api/stickers/:id?').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  MediaSectionController.getAllForApp
)

export { Router as MediaModule }
