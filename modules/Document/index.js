/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { DocumentController as DocModule } from './controllers/DocumentController.js'

const Router = express.Router()
const { authorize } = AuthMiddleware

// for admin panel dropdown selection
Router.get('/module/document/types', authorize([Enum.ROLES.ADMIN]), DocModule.getTypes)
Router.get('/module/document/fileTypes', authorize([Enum.ROLES.ADMIN]), DocModule.getFileTypes)

// update the config
Router.route('/module/document/config')
  .get(authorize([Enum.ROLES.ADMIN]), DocModule.configData)
  .put(authorize([Enum.ROLES.ADMIN]), DocModule.updateConfigData)

Router.route('/module/document/:id?/:serviceId?')
  .get(authorize([Enum.ROLES.ADMIN]), DocModule.getDocument)
  .post(authorize([Enum.ROLES.ADMIN]), DocModule.addDocument)
  .put(authorize([Enum.ROLES.ADMIN]), DocModule.updateDocument)
  .delete(authorize(Enum.ROLES.ADMIN), DocModule.deleteDocument)

export { Router as DynamicDocument }
