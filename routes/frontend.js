/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'

import { Enum } from '../utils/Enum.js'

import { OnboardingController as Onboarding } from '../controllers/FrontEnd/OnboardingController.js'

import { AuthMiddleware } from '../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware

import { UploadMiddlewware } from '../middlewares/UploadMiddleware.js'
const OnboaringFile = new UploadMiddlewware({ path: './public/Onboardings/' }).singleFileUpload

const Router = express.Router()

Router.route('/admin/onboardings/:id?')
  .get(authorize([Enum.ROLES.ADMIN]), Onboarding.getOnboarding)
  .post(authorize([Enum.ROLES.ADMIN]), OnboaringFile, Onboarding.createOnboarding)
  .put(authorize([Enum.ROLES.ADMIN]), OnboaringFile, Onboarding.updateOnboarding)
  .delete(authorize([Enum.ROLES.ADMIN]), Onboarding.deleteOnboarding)

Router.route('/api/onboardings').get(Onboarding.getOnboarding)

export { Router as FrontEnd }
