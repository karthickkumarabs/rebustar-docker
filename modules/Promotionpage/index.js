/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { PromotionController as Promotion } from './controllers/PromotionController.js'
import { UploadMiddlewware } from '../../middlewares/UploadMiddleware.js'
const AuthFile = new UploadMiddlewware({ path: './public/temp/promotions' }).singleFileUpload
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/promotion/file').post(authorize([Enum.ROLES.ADMIN]), AuthFile, Promotion.uploadfile)

Router.route('/module/promotion/:promotionId?')
  .post(authorize([Enum.ROLES.ADMIN]), Promotion.createPromotion)
  .put(authorize([Enum.ROLES.ADMIN]), Promotion.updatePromotion)
  .get(Promotion.getPromotion)
  .delete(authorize([Enum.ROLES.ADMIN]), Promotion.removePromotion)

export { Router as PromotionModule }
