/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'

import { BaseController } from './../controllers/BaseController.js'
import { FrontEnd } from './frontend.js'
import { Auth } from './Common/Auth.js'
import { Creteria } from './Common/Creteria.js'
import { DataStore } from './Common/DataStore.js'
import { Test } from './test.js'
import { Document } from './Common/Document.js'
import { ServiceModule } from './Common/ServiceModule.js'
import { Notification } from './Common/Notification.js'
import { Translation } from '../modules/index.js'
// import { AutocompleteModule } from '../modules/Autocomplete/index.js'
import { OutstationModule } from '../modules/Outstation/index.js'
import { RentalModule } from '../modules/Rental/index.js'
import { ReferralModule } from '../modules/Referral/index.js'
import { DatabaseModule } from '../modules/Database/index.js'
import { PromotionModule } from '../modules/Promotionpage/index.js'
// import { ShareRideModule } from '../modules/CarPool/index.js'
import { BiddingModule } from '../modules/Bidding/index.js'
import { AdminTheme } from './Common/Theme.js'
import { CancellationModule } from '../modules/Cancellation/index.js'
import { SignUpBonusModule } from '../modules/Signupbonus/index.js'
import { MultistopModule } from '../modules/Multistop/index.js'
import { CmsPagesModule } from '../modules/AppCms/index.js'
import { DynamicDocument } from '../modules/Document/index.js'
import { PartnersoundQrImageRouter } from '../modules/Partnersound-QrImage/index.js'
import { OTPModule } from '../modules/OTPValidations/index.js'
import { SendBulkNoticiationModule } from '../modules/SendBulkNotification/index.js'
import { HailTripsModule } from '../modules/HailTrips/index.js'
import { MediaModule } from '../modules/MediaSettings/index.js'
import { SubscriptionModule } from '../modules/Subscription/index.js'
import { GooglePlaces } from '../modules/Googleplaces/Index.js'

const Router = express.Router()
Router.get('/success', BaseController.getSuccess)
Router.get('/error', BaseController.getError)
Router.get('/validator', BaseController.getValidator)
Router.use('/', FrontEnd)
Router.use('/', Auth)
Router.use('/', DataStore)
Router.use('/', AdminTheme)
Router.use('/test', Test)
Router.use('/creteria', Creteria)
Router.use('/', Document)
Router.use('/', ServiceModule)
Router.use('/', Notification)
Router.use('/', Translation)
// Router.use('/', AutocompleteModule)
Router.use('/', OutstationModule)
Router.use('/', RentalModule)
Router.use('/', ReferralModule)
Router.use('/', CancellationModule)
Router.use('/', DatabaseModule)
Router.use('/', PromotionModule)
// Router.use('/', ShareRideModule)
Router.use('/', BiddingModule)
Router.use('/', SignUpBonusModule)
Router.use('/', CmsPagesModule)
Router.use('/', MultistopModule)
Router.use('/', DynamicDocument)
Router.use('/', PartnersoundQrImageRouter)
Router.use('/', SendBulkNoticiationModule)
Router.use('/', OTPModule)
Router.use('/', HailTripsModule)
Router.use('/', MediaModule)
Router.use('/', SubscriptionModule)
Router.use('/', GooglePlaces)

export { Router }
