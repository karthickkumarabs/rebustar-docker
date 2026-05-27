/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'
import { ThemeController as AdminTheme } from '../../controllers/Theme/admin-theme.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware

const Router = express.Router()
Router.route('/common/configuration/adminTheme')
  .get(AdminTheme.getAdminTheme)
  .post(authorize([Enum.ROLES.ADMIN]), AdminTheme.updateAdminTheme)

export { Router as AdminTheme }
