/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { SocialLoginController } from './SocialLoginController.js'

const Router = express.Router()

// Login Using Google
Router.get('/module/oauth/google', SocialLoginController.initiateGoogleLogin)
Router.get('/module/oauth/google/callback', SocialLoginController.getUserDetailsUsingGoogle)

// FB Login - will implement in future
// Router.get('/module/oauth/facebook', SocialLoginController.initiateGoogleLogin)
// Router.get('/module/oauth/facebook/callback', SocialLoginController.getUserDetailsUsingGoogle)

export { Router as SocialLoginModule }
