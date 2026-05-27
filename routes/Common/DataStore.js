/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'

import { ConfigController as Config } from '../../controllers/DataStore/ConfigController.js'
import { PresetController as Preset } from './../../controllers/DataStore/PresetController.js'
import { ReportController as Report } from '../../controllers/DataStore/ReportController.js'

import { UploadMiddlewware } from '../../middlewares/UploadMiddleware.js'
const configFile = new UploadMiddlewware({ path: './public/' }).unknownFields

const fileUpload = new UploadMiddlewware({ fileParam: 'file' }).memoryUpload
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware

import CancelReasonController from '../../controllers/DataStore/CancellationReasonController.js'
import ReviewRatingsController from '../../controllers/DataStore/ReviewRatingsController.js'
import { PartnerServiceConfigController } from '../../controllers/DataStore/PartnerServiceConfigController.js'
const Router = express.Router()

Router.route('/common/configuration/firebase')
  .get(Config.getFirbaseConfig)
  .post(authorize([Enum.ROLES.ADMIN]), Config.updateFirbaseConfig)

Router.route('/common/configuration/public').get(Config.getDatas)
Router.route('/common/configuration/app').post(
  authorize([Enum.ROLES.ADMIN]),
  configFile,
  Config.updateAppConfig
)
Router.route('/common/configuration/socialLinks/:name?')
  .post(authorize([Enum.ROLES.ADMIN]), configFile, Config.addorupdateSocialLink)
  .delete(authorize([Enum.ROLES.ADMIN]), Config.deleteSocialLink)
Router.route('/common/configuration').get(Config.getConfiguration)

Router.route('/common/configuration/services').get(Config.getServices).post(Config.updateServices)

Router.route('/common/configuration/getSettings').get(Config.getSettings)

Router.route('/common/modules').get(Preset.getServiceModule)
Router.route('/common/language/exists').get(authorize([Enum.ROLES.ADMIN]), Preset.getLanguageExists)
Router.route('/common/language/:languageId?')
  .get(authorize([Enum.ROLES.ADMIN]), Preset.getAllLanguages)
  .post(authorize([Enum.ROLES.ADMIN]), Preset.createLanguage)
  .put(authorize([Enum.ROLES.ADMIN]), Preset.updateLanguage)
  .delete(authorize([Enum.ROLES.ADMIN]), Preset.deleteLanguage)

Router.route('/common/country/exists').get(authorize([Enum.ROLES.ADMIN]), Preset.getCountryExists)
Router.route('/common/country/:countryId?')
  .get(authorize([Enum.ROLES.ADMIN]), Preset.getAllCountry)
  .post(authorize([Enum.ROLES.ADMIN]), Preset.createCountry)
  .put(authorize([Enum.ROLES.ADMIN]), Preset.updateCountry)
  .delete(authorize([Enum.ROLES.ADMIN]), Preset.deleteCountry)

Router.route('/common/list/country').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Preset.listAllCountries
)
Router.route('/common/list/state/:countryId?').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Preset.listAllStates
)
Router.route('/common/list/city/:countryId?/:stateId?').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Preset.listAllCities
)

Router.route('/common/state/exists').get(authorize([Enum.ROLES.ADMIN]), Preset.getStateExists)
Router.route('/common/state/:stateId?')
  .get(authorize([Enum.ROLES.ADMIN]), Preset.getAllState)
  .post(authorize([Enum.ROLES.ADMIN]), Preset.createState)
  .put(authorize([Enum.ROLES.ADMIN]), Preset.updateState)
  .delete(authorize([Enum.ROLES.ADMIN]), Preset.deleteState)

Router.route('/common/city/exists').get(authorize([Enum.ROLES.ADMIN]), Preset.getCityExists)
Router.route('/common/city/:cityId?')
  .get(authorize([Enum.ROLES.ADMIN]), Preset.getAllCity)
  .post(authorize([Enum.ROLES.ADMIN]), Preset.createCity)
  .put(authorize([Enum.ROLES.ADMIN]), Preset.updateCity)
  .delete(authorize([Enum.ROLES.ADMIN]), Preset.deleteCity)

Router.route('/common/model/exists').get(authorize([Enum.ROLES.ADMIN]), Preset.getModelExists)
Router.route('/common/model/:modelId?')
  .get(authorize([Enum.ROLES.ADMIN]), Preset.getAllModel)
  .post(authorize([Enum.ROLES.ADMIN]), Preset.createModel)
  .put(authorize([Enum.ROLES.ADMIN]), Preset.updateModel)
  .delete(authorize([Enum.ROLES.ADMIN]), Preset.deleteModel)

Router.route('/common/list/makes').get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Preset.listAllMakes)
Router.route('/common/list/models/:makeId?').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  Preset.listAllModels
)
Router.route('/common/list/years').get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Preset.listAllYears)

Router.route('/common/make/exists').get(authorize([Enum.ROLES.ADMIN]), Preset.getMakeExists)
Router.route('/common/make/:makeId?')
  .get(authorize([Enum.ROLES.ADMIN]), Preset.getAllMake)
  .post(authorize([Enum.ROLES.ADMIN]), Preset.createMake)
  .put(authorize([Enum.ROLES.ADMIN]), Preset.updateMake)
  .delete(authorize([Enum.ROLES.ADMIN]), Preset.deleteMake)
Router.route('/common/addYear').post(authorize([Enum.ROLES.ADMIN]), Preset.addYear)
Router.route('/common/year/:yearId?/:id?')
  .get(authorize([Enum.ROLES.ADMIN]), Preset.getAllYear)
  .post(authorize([Enum.ROLES.ADMIN]), Preset.createYear)
  .put(authorize([Enum.ROLES.ADMIN]), Preset.updateYear)
  .delete(authorize([Enum.ROLES.ADMIN]), Preset.deleteYear)
Router.route('/common/currency/:currencyId?')
  .get(authorize([Enum.ROLES.ADMIN]), Preset.getCurrency)
  .post(authorize([Enum.ROLES.ADMIN]), Preset.createCurrency)
  .put(authorize([Enum.ROLES.ADMIN]), Preset.updateCurrency)
  .delete(authorize([Enum.ROLES.ADMIN]), Preset.deleteCurrency)

Router.route('/common/report/dashboard/:requestType(totalRecord|tripEarning|tripReport)?').get(
  authorize([Enum.ROLES.ADMIN]),
  Report.dashboard
)
Router.route('/common/report/siteStatistics/:requestType(tripReport|tripCount|customerCount)?').get(
  authorize([Enum.ROLES.ADMIN]),
  Report.siteStatistics
)
Router.route('/common/report/admin').get(authorize([Enum.ROLES.ADMIN]), Report.adminReport)
Router.route('/common/report/partner').get(authorize([Enum.ROLES.ADMIN]), Report.partnerReport)
Router.route('/common/report/customer').get(authorize([Enum.ROLES.ADMIN]), Report.customerReport)
Router.route('/common/report/trip').get(authorize([Enum.ROLES.ADMIN]), Report.tripReport)
Router.route('/common/report/trippayment').get(authorize([Enum.ROLES.ADMIN]), Report.tripPaymentReport)
Router.route('/common/report/invoice').get(authorize([Enum.ROLES.ADMIN]), Report.createInvoice)
Router.route('/common/report/make').get(authorize([Enum.ROLES.ADMIN]), Report.makeReport)
Router.route('/common/report/model').get(authorize([Enum.ROLES.ADMIN]), Report.modelReport)
Router.route('/common/report/country').get(authorize([Enum.ROLES.ADMIN]), Report.countryReport)
Router.route('/common/report/state').get(authorize([Enum.ROLES.ADMIN]), Report.stateReport)
Router.route('/common/report/city').get(authorize([Enum.ROLES.ADMIN]), Report.cityReport)
Router.route('/common/report/vehicle').get(authorize([Enum.ROLES.ADMIN]), Report.vehicleReport)

Router.route('/common/import/countries').post(fileUpload, Preset.importCountries)
Router.route('/common/import/states').post(fileUpload, Preset.importCities)
Router.route('/common/import/cities').post(fileUpload, Preset.importStates)

// cancellation reason

Router.route('/cancelReason/:id?')
  .get(authorize([Enum.ROLES.ADMIN]), CancelReasonController.getCancelReasons)
  .post(authorize([Enum.ROLES.ADMIN]), CancelReasonController.createCancelReason)

Router.route('/cancelReason/:id')
  .put(authorize([Enum.ROLES.ADMIN]), CancelReasonController.updateCancelReason)
  .delete(authorize([Enum.ROLES.ADMIN]), CancelReasonController.deleteCancelReason)

Router.route('/review/:id?')
  .post(ReviewRatingsController.addReview)
  .get(ReviewRatingsController.getReview)
  .put(ReviewRatingsController.updateReview)
  .delete(ReviewRatingsController.deleteReview)

// partner configuration

Router.route('/PartnerServiceConfig').post(PartnerServiceConfigController.updateServiceConfig)

Router.route('/getPartnerServiceConfig').get(PartnerServiceConfigController.getServiceConfig)

export { Router as DataStore }
