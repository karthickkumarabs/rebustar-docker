/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Payment } from './Payment/index.js'
import { Enum } from '../utils/Enum.js'

import { AttendanceController as Attendance } from './Attendance/AttendanceController.js'
import { TranslationController as Translation } from './Translation/TranslationController.js'
import { ChatController as Chat } from './Socket/controllers/ChatController.js'
import { EnCryptionController as Encryption } from './Encryption/encryptionController.js'

import { AuthMiddleware } from '../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware

import { UploadMiddlewware } from '../middlewares/UploadMiddleware.js'
const TransaltionFile = new UploadMiddlewware({ path: './public/locale' }).singleFileUpload

const Router = express.Router()

Router.use('/', Payment)

Router.route('/module/attendance/:partnerId?')
  .get(authorize([Enum.ROLES.ADMIN]), Attendance.getAttendance)
  .post(authorize([Enum.ROLES.ADMIN]), Attendance.updateAttendance)

Router.route('/module/chat/messages')
  .get(authorize([Enum.ROLES.CUSTOMER, Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Chat.getMessages)
  .delete(authorize([Enum.ROLES.CUSTOMER, Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Chat.deleteMessages)

Router.route('/module/translation/language/:languageId?')
  .get(authorize([Enum.ROLES.ADMIN]), Translation.getLanguages)
  .post(authorize([Enum.ROLES.ADMIN]), TransaltionFile, Translation.updateLanguage)
Router.route('/module/translation').get(authorize([Enum.ROLES.ADMIN]), Translation.getTranslation)
Router.route('/module/translation/groups').get(authorize([Enum.ROLES.ADMIN]), Translation.getTranslationGroup)

Router.route('/module/translation/transcribe/generate').post(
  authorize([Enum.ROLES.ADMIN]),
  Translation.generateJson
)
Router.route('/module/translation/transcribe/:translationId?')
  .get(authorize([Enum.ROLES.ADMIN]), Translation.getTranscribe)
  .post(authorize([Enum.ROLES.ADMIN]), Translation.updateTranscribe)
Router.route('/module/encryption/GenerateKeyFile').get(Encryption.generateMasterKeyFile)
export { Router as Translation }
