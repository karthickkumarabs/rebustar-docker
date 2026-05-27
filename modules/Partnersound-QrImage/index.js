/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const QRFile = new UploadMiddlewware({ path: './public/QRcodes' }).singleFileUpload
import { PartnerQRController as Qrcode } from './controllers/SoundQRController.js'
import { UploadMiddlewware } from '../../middlewares/UploadMiddleware.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/partnerqr/uploadqrcode')
  .put(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), QRFile, Qrcode.uploadPartnerQR)
  .get(authorize([Enum.ROLES.ADMIN]), Qrcode.getPartnerqrConfig)
  .post(authorize([Enum.ROLES.ADMIN]), Qrcode.updatePartnerqrConfig)
export { Router as PartnersoundQrImageRouter }
