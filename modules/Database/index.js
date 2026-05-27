/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { DatabaseController as Database } from './DatabaseController.js'

import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/database/list').get(authorize([Enum.ROLES.ADMIN]), Database.getLogs)
Router.route('/module/database/download/:logId').get(authorize([Enum.ROLES.ADMIN]), Database.downloadLog)
Router.route('/module/database/:logId?')
  .get(authorize([Enum.ROLES.ADMIN]), Database.getParticularLog)
  .post(authorize([Enum.ROLES.ADMIN]), Database.createLog)
  .put(authorize([Enum.ROLES.ADMIN]), Database.updateLog)
  .delete(authorize([Enum.ROLES.ADMIN]), Database.deleteLog)

export { Router as DatabaseModule }
