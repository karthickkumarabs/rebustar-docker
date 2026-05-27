/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { Enum } from '../../utils/Enum.js'

import { CustomerController as Customer } from './../../controllers/Auth/CustomerController.js'
import { PartnerController as Partner } from './../../controllers/Auth/PartnerController.js'
import { AdminController as Admin } from './../../controllers/Auth/AdminController.js'
import { CompanyController as Company } from './../../controllers/Auth/CompanyController.js'
// import { SocialiteController as Socialite } from '../../controllers/Auth/SocialiteController.js'

import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize, addAuth } = AuthMiddleware

import { UploadMiddlewware } from './../../middlewares/UploadMiddleware.js'
const AuthFile = new UploadMiddlewware({ path: './public/temp/auth' }).singleFileUpload

const Router = express.Router()

// Customer API

Router.route('/common/login/customer').post(Customer.loginCustomer)
Router.route('/common/customer/profile/:customerId?').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]),
  Customer.getProfile
)

Router.route('/common/customer/exists').get(Customer.getCustomerExists)

Router.route('/common/customer/verification').post(
  addAuth([Enum.ROLES.CUSTOMER, Enum.ROLES.ADMIN]),
  Customer.verification
)

Router.route('/common/customer/changePassword').post(
  addAuth([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]),
  Customer.changePassword
)

Router.route('/common/customer/emergencyContact')
  .post(authorize([Enum.ROLES.CUSTOMER]), Customer.addEmgContact)
  .get(authorize([Enum.ROLES.CUSTOMER]), Customer.getEmgContact)
  .put(authorize([Enum.ROLES.CUSTOMER]), Customer.updateEmgContact)
  .delete(authorize([Enum.ROLES.CUSTOMER]), Customer.delEmgContact)

Router.route('/common/customer/favouriteLocation')
  .post(authorize([Enum.ROLES.CUSTOMER]), Customer.addFavLocation)
  .get(authorize([Enum.ROLES.CUSTOMER]), Customer.getFavLocation)
  .put(authorize([Enum.ROLES.CUSTOMER]), Customer.updateFavLocation)
  .delete(authorize([Enum.ROLES.CUSTOMER]), Customer.delFavLocation)

Router.route('/common/customer/favouritePerson')
  .post(authorize([Enum.ROLES.CUSTOMER]), Customer.addFavPerson)
  .get(authorize([Enum.ROLES.CUSTOMER]), Customer.getFavPerson)
  .delete(authorize([Enum.ROLES.CUSTOMER]), Customer.delFavPerson)

Router.route('/common/customer/:customerId?')
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]), Customer.getCustomer)
  .post(AuthFile, Customer.createCustomer)
  .put(authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]), AuthFile, Customer.updateCustomer)
  .patch(authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]), Customer.updateCustomerStatus)
  .delete(authorize([Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER]), Customer.deleteCustomer)

// Partner API

Router.route('/common/login/partner').post(Partner.loginPartner)

Router.route('/common/partner/exists').get(Partner.getPartnerExists)

Router.route('/common/partner/verification').post(addAuth([Enum.ROLES.PARTNER]), Partner.verification)

Router.route('/common/partner/changePassword').post(
  addAuth([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  Partner.changepassword
)

Router.route('/common/partner/partnerOnline').patch(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  Partner.partnerOnline
)

Router.route('/common/partner/partnerActive').post(
  addAuth([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  Partner.partnerActive
)

Router.route('/common/partner/partnerInactive').post(
  addAuth([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  Partner.partnerInactive
)

Router.route('/common/partner/currentLocation').put(authorize([Enum.ROLES.PARTNER]), Partner.currentLocation)

Router.route('/common/partner/getValidation').get(authorize([Enum.ROLES.PARTNER]), Partner.getValidation)

Router.route('/common/partner/emgergencyContact')
  .get(authorize([Enum.ROLES.PARTNER]), Partner.getEmgContact)
  .post(authorize([Enum.ROLES.PARTNER]), Partner.addEmgContact)
  .put(authorize([Enum.ROLES.PARTNER]), Partner.updateEmgContact)
  .delete(authorize([Enum.ROLES.PARTNER]), Partner.delEmgContact)

Router.route('/common/partner/profile/:partnerId?').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]),
  Partner.getProfile
)

Router.route('/common/partner/:partnerId?')
  .post(AuthFile, Partner.createPartner)
  .get(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Partner.getPartner)
  .put(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), AuthFile, Partner.updatePartner)
  .patch(addAuth([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Partner.updatePartnerStatus)
  .delete(authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER]), Partner.deletePartner)

// Company API
Router.route('/common/login/company').post(Company.companyLogin)

Router.route('/common/company/changePassword').post(addAuth([Enum.ROLES.ADMIN]), Company.changePassword)

Router.route('/common/company/exists').get(Company.getCompanyExists)

Router.route('/common/company/:companyId?')
  .post(AuthFile, Company.createCompany)
  .get(authorize([Enum.ROLES.ADMIN]), AuthFile, Company.getCompany)
  .put(authorize([Enum.ROLES.ADMIN]), AuthFile, Company.updateCompany)
  .delete(authorize([Enum.ROLES.ADMIN]), AuthFile, Company.deleteCompany)

// Admin API

Router.route('/common/admin/menusList').get(Admin.getMenuList)

Router.route('/common/login/admin').post(Admin.loginAdmin)

Router.route('/common/admin/changePassword').post(addAuth([Enum.ROLES.ADMIN]), Admin.changePassword)

Router.route('/common/admin/exists').get(Admin.getAdminExists)

Router.route('/common/admin/partnerTracking').get(addAuth([Enum.ROLES.ADMIN]), Partner.partnerTracking)

Router.route('/common/admin/:adminId?')
  .post(AuthFile, Admin.createAdmin)
  .get(authorize([Enum.ROLES.ADMIN]), AuthFile, Admin.getAdmin)
  .put(authorize([Enum.ROLES.ADMIN]), AuthFile, Admin.updateAdmin)
  .delete(authorize([Enum.ROLES.ADMIN]), AuthFile, Admin.deleteAdmin)

Router.route('/common/adminGroup/list').get(authorize([Enum.ROLES.ADMIN]), Admin.listAdminGroup)
Router.route('/common/adminGroup/:adminGroupId?')
  .get(authorize([Enum.ROLES.ADMIN]), Admin.getAdminGroup)
  .post(authorize([Enum.ROLES.ADMIN]), Admin.createAdminGroup)
  .put(authorize([Enum.ROLES.ADMIN]), Admin.updateAdminGroup)
  .delete(authorize([Enum.ROLES.ADMIN]), Admin.deleteAdminGroup)

// Common API

Router.route('/common/sendOtp').post(Customer.sendOtp)

Router.route('/common/logout').patch(authorize([Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER]), Customer.logout)

// Social Login
// Router.route('/common/social/:userRole/:provider').post(Socialite.socialHandler)

export { Router as Auth }
