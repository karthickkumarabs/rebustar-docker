/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

import { Enum } from '../../utils/Enum.js'

import { SettingsConfig } from '../../config/SettingsConfig.js'

import Customer from './../../models/Auth/Customer.js'
import Partner from '../../models/Auth/Partner.js'

import { BaseController } from './../BaseController.js'
import { NotifcationController } from '../Notification/Index.js'
import { FirebaseServices } from '../../services/FirebaseService.js'

import { AuthValidator } from '../../validators/Common/AuthValidator.js'
import { AuthServices } from '../../services/Common/AuthService.js'

import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { VerificationService } from '../../services/Common/VerificationService.js'

import { AuthendicationError, ValidationError, NotFoundError } from '../../utils/ErrorHandler.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'

import { Config } from '../../config/AppConfig.js'
import { SmsController } from '../Notification/SmsGateway.js'
import { ReferralController } from '../../modules/Referral/controllers/ReferralController.js'
import { SignupBonusController } from '../../modules/Signupbonus/controllers/SignupbonusController.js'
import { PaymentConfig } from '../../config/PaymentConfig.js'
import { OTPValidationController } from '../../modules/OTPValidations/OTPValidationController.js'
import { OTPConfig } from '../../modules/OTPValidations/config.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class CustomerController extends BaseController {
  constructor() {
    super()
  }

  static getProfile = async (req, res) => {
    try {
      const authData = req.auth
      const paramData = req.params

      const customerId =
        authData.role == Enum.ROLES.CUSTOMER ? authData.userId : mongoose.Types.ObjectId(paramData.customerId)

      const customerData = await Customer.findOne({ _id: customerId }).lean().exec()
      if (!customerData) throw new Error('NOT_FOUND|CUSTOMER')
      let paymentGatewaykey = PaymentConfig.gateway.find(
        (g) => g.indexName != 'CASH' && g.indexName != 'WALLET' && g.status === true && g.isActive === true
      )
      paymentGatewaykey = paymentGatewaykey.fields.find((f) => f.indexName === 'publicKey')?.value || ''

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_CUSTOMER'
      )({
        message: 'SUCCESS',
        profile: customerData,
        paymentGatewaykey: paymentGatewaykey
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getSuccess = async (req, res) => {
    try {
      return requestHandler.sendSuccess(req, res, 'GET_SUCCESS')({ message: 'SUCCESS' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getCustomerExists = async (req, res) => {
    try {
      const query = req.query
      const response = {
        message: 'EXIST|CUSTOMER',
        account: {
          isExist: false
        }
      }

      const validation = await AuthValidator.validateData(query, 'getCustomerExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getCustomer(req.query)
      if (account?.status) response.account.isExist = true
      else response.message = 'NOT_EXIST|CUSTOMER'

      return requestHandler.sendSuccess(req, res, 'GET_CUSTOMER_EXISTS')(response)
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static changePassword = async (req, res) => {
    try {
      const auth = req.auth ? req.auth : { userId: '' }
      const body = req.body
      const userId = auth.role == Enum.ROLES.ADMIN ? body._id : auth.userId.toString()
      const skipArray = [Enum.VERIFICATION.FORGETPASSWORD, Enum.VERIFICATION.CHANGEPASSWORD]

      const validation = await AuthValidator.validateData(body, 'changepassword')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const customerWhere = {}
      if (skipArray.includes(body.verifyFrom)) {
        if (body.verifyFrom == Enum.VERIFICATION.FORGETPASSWORD) {
          if (body.email) {
            customerWhere['email'] = body.email
          } else {
            customerWhere['phone'] = body.phone
            customerWhere['phoneCode'] = body.phoneCode
          }
        } else {
          customerWhere['_id'] = userId
        }
      }
      const account = await Customer.findOne(customerWhere).exec()
      if (!account) throw new Error('NOT_FOUND|CUSTOMER')

      if (body.verifyFrom == Enum.VERIFICATION.FORGETPASSWORD) {
        const verifyObj = {
          code: body.code,
          userType: body.userType,
          verifyFrom: body.verifyFrom,
          ...(body.verifyBy === 'email'
            ? { email: body.email, verifyBy: 'email' }
            : { phoneNumber: body.phone, phoneCode: body.phoneCode, verifyBy: 'phone' })
        }

        const verifyRes = await VerificationService.validate(verifyObj)
        if (!verifyRes.status) throw new ValidationError('OTP_DOES_NOT_VERIFIED')
        account.setPassword(body.password)
        await account.save()
      } else if (auth.role && body.verifyFrom == Enum.VERIFICATION.CHANGEPASSWORD) {
        if (auth.role == Enum.ROLES.CUSTOMER) {
          const passwordIsValid = account.validPassword(body.oldpassword, account.salt, account.hash)
          if (!passwordIsValid) throw new ValidationError('INVALID_PASSWORD')
          if (body.password != body.newpassword) throw new ValidationError('PASSWORD_MISMATCH')
          if (body.password == body.oldpassword)
            throw new ValidationError('OLD_PASSWORD_NEW_PASSWORD_CANT_BE_SAME')
        }
        account.setPassword(body.password)
        await account.save()
      } else {
        throw new Error('UNKNOWN_VERIFY_FROM')
      }

      return requestHandler.sendSuccess(req, res, 'CHANGE_PASSWORD')({ message: 'PASSWORD_CHANGED|CUSTOMER' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static verification = async (req, res) => {
    try {
      const body = req.body
      const validation = await AuthValidator.validateData(body, 'verification')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      let account
      let updateVerify = true
      const skipArray = [
        Enum.VERIFICATION.LOGIN,
        Enum.VERIFICATION.FORGETPASSWORD,
        Enum.VERIFICATION.CHANGEPASSWORD
      ]
      if (skipArray.includes(body.verifyFrom)) {
        const customerWhere = {}
        if (req.auth == null) {
          if (body.email) {
            customerWhere['email'] = body.email
          } else {
            customerWhere['phone'] = body.phone
            customerWhere['phoneCode'] = body.phoneCode
          }
        } else {
          customerWhere['_id'] = req.auth.userId
        }
        account = await Customer.findOne(customerWhere).exec()
        if (!account) throw new AuthendicationError('CUSTOMER_NOT_FOUND')

        if ([Enum.VERIFICATION.FORGETPASSWORD, Enum.VERIFICATION.CHANGEPASSWORD].includes(body.verifyFrom))
          updateVerify = false
      }
      // const account = await Customer.findOne({ _id: req.auth.userId }).exec()
      // if (!account) throw new Error('Customer not found')

      let verifyObj = {
        code: body.code,
        userType: body.userType,
        verifyFrom: body.verifyFrom,
        updateVerify: updateVerify
      }

      if (body.verifyBy == 'email') {
        verifyObj = {
          ...verifyObj,
          email: body.email,
          verifyBy: 'email'
        }
      } else {
        verifyObj = {
          ...verifyObj,
          phoneNumber: body.phone,
          phoneCode: body.phoneCode,
          verifyBy: 'phone'
        }
      }

      const verifyRes = await VerificationService.validate(verifyObj)
      if (!verifyRes.status) throw new ValidationError('OTP_DOES_NOT_VERIFIED')
      let customer
      if (account) {
        if (body.verifyBy == 'email') {
          account.emailVerified = true
        } else {
          account.phoneVerified = true
        }

        customer = await account.save()
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'VERIFICATION'
      )({ message: 'OTP_VERIFIED', customer: customer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static loginCustomer = async (req, res) => {
    try {
      const body = req.body
      console.log('body', body)
      const validation = await AuthValidator.validateData(body, 'loginCustomer')
      console.log('validation', validation)
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const DeviceId = req.headers['x-client-id'] || undefined
      if (!DeviceId) throw new ValidationError('DEVICE_ID_IS_REQUIRED')

      let otpUsed = false
      if (body.code) {
        let verifyObj = {
          code: body.code,
          userType: body.userType
        }
        if (body.verifyBy == 'email') {
          verifyObj = {
            ...verifyObj,
            email: body.email,
            verifyBy: 'email'
          }
        } else {
          verifyObj = {
            ...verifyObj,
            phoneNumber: body.phone,
            phoneCode: body.phoneCode,
            verifyBy: 'phone'
          }
        }
        const verifyRes = await VerificationService.validate(verifyObj)
        if (!verifyRes.status) {
          if (
            SettingsConfig.menulist.find(
              (item) => item.value == Enum.SETTINGS.OTPSETTING && item.enabled == true
            ) &&
            verifyObj.verifyBy == 'phone'
          ) {
            const updateWrongOTPLimit = await OTPValidationController.updateWrongOTPLimit(verifyObj)
            console.log('updateWrongOTPLimit', updateWrongOTPLimit)
            if (updateWrongOTPLimit.status && updateWrongOTPLimit.LimitExceeded) {
              verifyObj.blockedFor = 'Wrong OTP limit Exceeded'
              verifyObj.wrongOTPLimitExceeded = true
              if (OTPConfig.isBlock?.isEnable) await OTPValidationController.blockForExceededLimit(verifyObj)
              throw new ValidationError('WRONG_OTP_LIMIT_EXCEEDED')
            }
          }
          throw new ValidationError('OTP_DOES_NOT_VERIFIED')
        } else otpUsed = true
      }
      const query = {}

      if (body.email) {
        query['email'] = body.email
      } else {
        query['phone'] = body.phone
        query['phoneCode'] = body.phoneCode
      }

      const update = {
        deviceId: DeviceId,
        fcmId: body.fcmId || ''
      }
      const customerData = await Customer.findOne(query).exec()
      if (!customerData) throw new AuthendicationError('ACCOUNT_NOT_FOUND!')

      const customer = await Customer.findOneAndUpdate(query, update, { new: true }).exec()
      if (!body.code && !otpUsed) {
        const passwordIsValid = await customer.validPassword(body.password, customer.salt, customer.hash)
        if (!passwordIsValid) throw new ValidationError('MAKE_SURE_YOUR_PASSWORD')
      }
      const tokenData = {
        userId: customer._id,
        email: customer.email,
        name: customer.fname,
        role: Enum.ROLES.CUSTOMER,
        deviceId: customer.deviceId
      }
      const loginToken = await customer.generateJwt(tokenData)
      const firebaseToken = await FirebaseServices.authToken(customer._id)

      return requestHandler.sendSuccess(
        req,
        res,
        'LOGIN_CUSTOMER'
      )({ message: 'LOGIN_SUCCESS', customer: customer, token: loginToken, firebaseToken: firebaseToken })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getCustomer = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(Customer, queryData)
      queryObject = queryBuilder.queryObject

      // ratings filter
      for (const key in queryData) {
        if (key.includes('.') && queryData[key] !== undefined) {
          const value = isNaN(queryData[key]) ? queryData[key] : Number(queryData[key])
          queryObject[key] = value
        }
      }

      if (queryData.status) {
        queryObject.status = queryData.status
      }

      if (paramData.customerId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.customerId)
      }
      let paymentGatewaykey = PaymentConfig.gateway.find(
        (g) => g.indexName != 'CASH' && g.indexName != 'WALLET' && g.status === true && g.isActive === true
      )
      paymentGatewaykey = paymentGatewaykey.fields.find((f) => f.indexName === 'publicKey')?.value || ''
      const getDataCount = await Customer.find(queryObject).count()
      const getData = await Customer.find(queryObject).sort({ _id: -1 }).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_CUSTOMER'
      )({ message: 'SUCCESS', customer: getData, total: getDataCount, paymentGatewaykey: paymentGatewaykey })
    } catch (error) {
      console.log(error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static createCustomer = async (req, res) => {
    try {
      const body = req.body
      console.log('body', body)

      const validation = await AuthValidator.validateData(body, 'createCustomer')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingCustomer = await Customer.findOne({
        $or: [{ email: body.email }, { phone: body.phone, phoneCode: body.phoneCode }]
      }).lean()

      if (existingCustomer) {
        existingCustomer.email === body.email
          ? (() => {
              throw new AuthendicationError('EMAIL ALREADY EXISTS')
            })()
          : existingCustomer.phone === body.phone && existingCustomer.phoneCode === body.phoneCode
          ? (() => {
              throw new AuthendicationError('PHONE NUMBER ALREADY EXISTS')
            })()
          : null
      }
      const module = await AuthServices.uniCodeGenerator('Customer')
      if (!module.status) throw new ValidationError('MODULE_CODE_NOT_GENERATED')

      const newCustomer = new Customer({
        uniCode: module.data.code,

        fname: body.fname,
        lname: body.lname,
        email: body.email,
        phone: body.phone,
        phoneCode: body.phoneCode,
        currency: body.currency || Config.app.currency,

        language: body.language,
        gender: body.gender,

        city: body.city,
        state: body.state,
        country: body.country,

        deviceId: req.headers['x-client-id'],
        fcmId: body.fcmId,

        emailVerified: body.emailVerified,
        phoneVerified: body.phoneVerified,
        referrer: body.referalcode
      })
      if (req.body.companyId) newCustomer.companyId = mongoose.Types.ObjectId(req.body.companyId)
      if (req.file) newCustomer.profile = req.file.path

      newCustomer.setPassword(body.password)

      const customer = await newCustomer.save()
      if (
        SettingsConfig.menulist.find(
          (item) => item.value == Enum.SETTINGS.REFERRALSETTING && item.enabled == true
        )
      ) {
        if (body.referalcode && body.referalcode != '') {
          await ReferralController.referralProcess(
            body.referalcode,
            customer._id,
            Enum.ROLES.CUSTOMER,
            Enum.PAYMENT.MODE.CREDIT
          )
        }
      }
      if (
        SettingsConfig.menulist.find(
          (item) => item.value == Enum.SETTINGS.SIGNUPSETTING && item.enabled == true
        )
      ) {
        await SignupBonusController.signupBonusProcess(customer._id, Enum.ROLES.CUSTOMER)
      }
      const tokenData = {
        userId: customer._id,
        email: customer.email,
        name: customer.fname,
        role: Enum.ROLES.CUSTOMER,
        deviceId: customer.deviceId
      }
      const loginToken = await customer.generateJwt(tokenData)
      const firebaseToken = await FirebaseServices.authToken(customer._id)
      const customerObj = {
        status: 'free'
      }
      await FirebaseServices.customerFbStatus('ADD', customer._id, customerObj)
      await NotifcationController.createNotification({
        processType: [Enum.NOTIFICATION.TYPE.MAIL],
        data: {
          email: customer.email,
          contentdata: { name: customer.fname },
          subject: 'Customer Welcome'
        }
      })
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CUSTOMER'
      )({ message: 'CREATED|CUSTOMER', customer: customer, token: loginToken, firebaseToken: firebaseToken })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateCustomer = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.customerId || req.body.userId
      body.exceptId = userId

      const validation = await AuthValidator.validateData(body, 'updateCustomer')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingCustomer = await Customer.findOne({
        $or: [{ email: body.email }, { phone: body.phone, phoneCode: body.phoneCode }],
        _id: { $ne: userId }
      }).lean()

      if (existingCustomer) {
        existingCustomer.email === body.email
          ? (() => {
              throw new AuthendicationError('EMAIL ALREADY EXISTS')
            })()
          : existingCustomer.phone === body.phone && existingCustomer.phoneCode === body.phoneCode
          ? (() => {
              throw new AuthendicationError('PHONE NUMBER ALREADY EXISTS')
            })()
          : null
      }

      const customer = await Customer.findById(userId).exec()

      customer.fname = body.fname || customer.fname
      customer.lname = body.lname || customer.lname
      customer.email = body.email || customer.email
      customer.phone = body.phone || customer.phone
      customer.phoneCode = body.phoneCode || customer.phoneCode
      customer.currency = body.currency || customer.currency

      customer.phoneCode = body.phoneCode || customer.phoneCode
      customer.gender = body.gender || customer.gender
      customer.language = body.language || customer.language

      customer.city = body.city || customer.city
      customer.state = body.state || customer.state
      customer.country = body.country || customer.country

      customer.emailVerified = body.emailVerified || customer.emailVerified
      customer.phoneVerified = body.phoneVerified || customer.phoneVerified

      // if (body.password) customer.setPassword(body.password)

      if (req.file) customer.profile = req.file.path
      const updatedCustomer = await customer.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_CUSTOMER'
      )({ message: 'UPDATED|CUSTOMER', customer: updatedCustomer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteCustomer = async (req, res) => {
    try {
      const body = req.body
      const auth = req.auth

      let userId = null
      if (auth.userRole == Enum.ROLES.CUSTOMER) userId = auth.userId
      else userId = req.params.customerId || req.body.userId

      if (!userId) throw new Error('PERMISSION_DENIED')
      body._id = userId

      const account = await AuthServices.getCustomer(body)
      if (!account?.status) {
        throw new AuthendicationError('NOT_EXISTS')
      }
      const customer = await Customer.findById(userId).remove().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_CUSTOMER'
      )({ message: 'DELETED|CUSTOMER', customer: customer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateCustomerStatus = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.customerId || req.body.userId
      body.exceptId = userId

      const validation = await AuthValidator.validateData(body, 'updateCustomerStatus')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getCustomer(body)
      if (!account?.status) {
        throw new AuthendicationError('NOT_EXIST|customer')
      }
      const customer = await Customer.findById(userId).exec()
      customer.status = body.status

      const updatedCustomer = await customer.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_CUSTOMER_STATUS'
      )({ message: 'UPDATED|CUSTOMER', customer: updatedCustomer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static sendOtp = async (req, res) => {
    try {
      const body = req.body
      const validation = await AuthValidator.validateData(body, 'sendOtpverify')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      let verifyObj = {
        verifyFrom: body.verifyFrom || Enum.VERIFICATION.LOGIN,
        userType: body.userType
      }
      if (body.verifyBy == 'email') {
        verifyObj = {
          ...verifyObj,
          email: body.email,
          verifyBy: 'email'
        }
      } else {
        verifyObj = {
          ...verifyObj,
          phoneNumber: body.phone,
          phoneCode: body.phoneCode,
          verifyBy: 'phone'
        }
      }

      if (
        SettingsConfig.menulist.find(
          (item) => item.value == Enum.SETTINGS.OTPSETTING && item.enabled == true
        ) &&
        body.verifyBy == 'phone'
      ) {
        const dataToCheck = {
          userType: body.userType,
          phoneNumber: body.phone,
          phoneCode: body.phoneCode,
          verifyBy: body.verifyBy,
          verifyFrom: body.verifyFrom || Enum.VERIFICATION.LOGIN
        }
        const validateOTPLimit = await OTPValidationController.validateOTPLimit(dataToCheck)
        console.log('validateOTPLimit', validateOTPLimit)
        if (!validateOTPLimit.status) throw new ValidationError('OTP_LIMIT_EXCEEDED')
        const validateWrongOTPLimit = await OTPValidationController.validateWrongOTPLimit(dataToCheck)
        if (!validateWrongOTPLimit.status) throw new ValidationError('WRONG_OTP_LIMIT_EXCEEDED')
      }

      const verifyRes = await VerificationService.create(verifyObj)

      console.log('verifyRes', verifyRes)
      if (!verifyRes.status) throw new ValidationError('CONTACT_SUPPORT')

      if (body.verifyBy == 'email') {
        await NotifcationController.createNotification({
          processType: [Enum.NOTIFICATION.TYPE.MAIL],
          data: {
            email: body.email,
            subject: 'OTP Verification',
            contentdata: {
              APP_NAME: Config.app.name,
              APP_EMAIL: Config.app?.email || 'support@rebustar.com',
              APP_LOGO: Config.app.baseurl + '/public/logo.png',
              OTP: verifyRes.data.randomSMS
            }
          }
        })
      } else if (body.verifyBy == 'sms') {
        const smsData = {
          template: 'OTP',
          templateData: { otp: verifyRes.data.randomSMS },
          phone: body.phone,
          phCode: body.phoneCode
        }
        await SmsController.sendSms(smsData)
      }

      return requestHandler.sendSuccess(
        req,
        res,
        'SEND_OTP'
      )({ message: 'OTP_SENT_SUCCESS', verifyRes: verifyRes.data })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  /**
   * Logout Respective User
   * @param  {[type]} req [description]
   * @param  {[type]} res [description]
   * @return {[type]}     [description]
   */
  static logout = async (req, res) => {
    try {
      const userRole = req.auth.role
      if (userRole == 'PARTNER') {
        const update = {
          deviceId: '',
          fcmId: '',
          online: false
        }
        Partner.findOneAndUpdate({ _id: req.auth.userId }, update, { new: true }).exec()

        return requestHandler.sendSuccess(
          req,
          res,
          'LOGOUT'
        )({
          message: 'LOGOUT_SUCCESS'
        })
      } else {
        const update = {
          deviceId: ''
        }
        Customer.findOneAndUpdate({ _id: req.auth.userId }, update, { new: true }).exec()

        return requestHandler.sendSuccess(
          req,
          res,
          'LOGOUT'
        )({
          message: 'LOGOUT_SUCCESS'
        })
      }
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addEmgContact = async (req, res) => {
    try {
      const body = req.body
      const validation = await AuthValidator.validateData(body, 'addEmgContact')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const updateData = {
        name: body.name,
        email: body.email,
        phoneNumber: body.phoneNumber,
        phoneCode: body.phoneCode
      }

      const addEmgData = await Customer.findByIdAndUpdate(
        { _id: mongoose.Types.ObjectId(req.auth.userId) },
        {
          $push: { EmergencyContact: updateData }
        },
        { new: true }
      )
        .lean()
        .exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'ADD_EMERGENCY_CONTACT'
      )({ message: 'CONTACT_SUCCESS', contacts: addEmgData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateEmgContact = async (req, res) => {
    try {
      const body = req.body

      const validation = await AuthValidator.validateData(body, 'updateEmgContact')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const updateEmgContact = await Customer.findById({ _id: req.auth.userId }).lean().exec()
      if (!updateEmgContact) throw new NotFoundError('NO_DATA_FOUND')
      const id = mongoose.Types.ObjectId(req.auth.userId)
      const query = {
        _id: id,
        EmergencyContact: { $elemMatch: { _id: req.query.emgContactId } }
      }

      const update = {
        $set: {
          'EmergencyContact.$.name': body.name,
          'EmergencyContact.$.email': body.email,
          'EmergencyContact.$.phoneNumber': body.phoneNumber,
          'EmergencyContact.$.phoneCode': body.phoneCode
        }
      }

      const EmgContact = await Customer.findOneAndUpdate(query, update, { new: true }).exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_EMERGENCY_CONTACT'
      )({ message: 'CONTACT_SUCCESS', contacts: EmgContact })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getEmgContact = async (req, res) => {
    try {
      const getEmgContact = await Customer.findOne({ _id: req.auth.userId }).lean().exec()
      if (!getEmgContact) {
        throw new NotFoundError('NO_DATA_FOUND')
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_EMERGENCY_CONTACT'
      )({ message: 'CONTACT_SUCCESS', contacts: getEmgContact.EmergencyContact })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static delEmgContact = async (req, res) => {
    try {
      const body = req.query

      const delEmgContact = await Customer.findById(req.auth.userId).exec()
      if (!delEmgContact) throw new NotFoundError('NO_DATA_FOUND')

      const id = mongoose.Types.ObjectId(req.auth.userId)

      await Customer.updateOne(
        { _id: id },
        { $pull: { EmergencyContact: { _id: mongoose.Types.ObjectId(body.emgContactId) } } }
      )
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_EMERGENCY_CONTACT'
      )({ message: 'CONTACT_DELETED_SUCCESSFULLY' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addFavLocation = async (req, res) => {
    try {
      const body = req.body

      const validation = await AuthValidator.validateData(body, 'addFavLocation')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const updateData = {
        name: body.name,
        address: body.address,
        location: body.location
      }
      const addFavLocation = await Customer.findByIdAndUpdate(
        { _id: mongoose.Types.ObjectId(req.auth.userId) },
        {
          $push: { FavouriteLocation: updateData }
        },
        { new: true }
      )
        .lean()
        .exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'ADD_FAV_LOCATION'
      )({ message: 'LOCATION_SUCCESS', locations: addFavLocation })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateFavLocation = async (req, res) => {
    try {
      const body = req.body
      const validation = await AuthValidator.validateData(body, 'updateFavLocation')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const updateFavLocation = await Customer.findById({ _id: req.auth.userId }).lean().exec()
      if (!updateFavLocation) throw new NotFoundError('NO_DATA_FOUND')
      const id = mongoose.Types.ObjectId(req.auth.userId)
      const query = {
        _id: id,
        FavouriteLocation: { $elemMatch: { _id: req.query.favLocationId } }
      }

      const update = {
        $set: {
          'FavouriteLocation.$.name': body.name,
          'FavouriteLocation.$.address': body.address,
          'FavouriteLocation.$.location': body.location
        }
      }

      const FavLocation = await Customer.findOneAndUpdate(query, update, { new: true }).exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_FAV_LOCATION'
      )({ message: 'LOCATION_SUCCESS', locations: FavLocation })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getFavLocation = async (req, res) => {
    try {
      const getFavLocation = await Customer.findOne({ _id: req.auth.userId }).lean().exec()
      if (!getFavLocation) {
        throw new NotFoundError('NO_DATA_FOUND')
      }
      // if (getFavLocation.FavouriteLocation.length == 0) {
      //   throw new Error('NO_DATA_FOUND')
      // }
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_FAV_LOCATION'
      )({ message: 'LOCATION_SUCCESS', locations: getFavLocation.FavouriteLocation })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static delFavLocation = async (req, res) => {
    try {
      const body = req.query

      const delFavLocation = await Customer.findById(req.auth.userId).exec()
      if (!delFavLocation) throw new NotFoundError('NO_DATA_FOUND')

      await Customer.updateOne(
        { _id: mongoose.Types.ObjectId(req.auth.userId) },
        { $pull: { FavouriteLocation: { _id: mongoose.Types.ObjectId(body.favLocationId) } } }
      )
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_FAV_LOCATION'
      )({ message: 'LOCATION_DELETED_SUCCESSFULLY' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static addFavPerson = async (req, res) => {
    try {
      const Details = req.body.persondetails
      const customerData = await Customer.findOne({ _id: req.auth.userId }).exec()
      if (customerData.addFavPerson && customerData.addFavPerson.FavouritePerson.length >= 4) {
        throw new ValidationError('FAV_PERSON_LIMIT_EXCEEDS')
      }
      const addFavPerson = await Customer.findByIdAndUpdate(
        { _id: mongoose.Types.ObjectId(req.auth.userId) },
        {
          $push: { FavouritePerson: Details }
        },
        { new: true }
      )
        .lean()
        .exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'ADD_FAV_PERSON'
      )({ message: 'FAV_PERSON_SUCCESS', data: addFavPerson.FavouritePerson })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getFavPerson = async (req, res) => {
    try {
      const getFavPerson = await Customer.findOne({ _id: req.auth.userId }).lean().exec()
      if (!getFavPerson) {
        throw new NotFoundError('NO_DATA_FOUND')
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_FAV_PERSON'
      )({ message: 'FAV_PERSON_SUCCESS', data: getFavPerson.FavouritePerson })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static delFavPerson = async (req, res) => {
    try {
      const body = req.query

      const delFavPerson = await Customer.findById(req.auth.userId).exec()
      if (!delFavPerson) throw new NotFoundError('NO_DATA_FOUND')

      await Customer.updateOne(
        { _id: mongoose.Types.ObjectId(req.auth.userId) },
        { $pull: { FavouritePerson: { _id: mongoose.Types.ObjectId(body.favPersonId) } } }
      )
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_FAV_PERSON'
      )({ message: 'FAV_PERSON_DELETED_SUCCESSFULLY' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static createCustomerinManualdispatch = async (body) => {
    const res = {
      success: false,
      status: 500,
      customerId: null,
      message: 'NOT ADDED'
    }
    try {
      const existingCustomer = await Customer.findOne({
        $or: [{ email: body.email }, { phone: body.phone, phoneCode: body.phoneCode }]
      }).lean()
      if (existingCustomer) return res
      const module = await AuthServices.uniCodeGenerator('Customer')
      if (!module.status) throw new ValidationError('MODULE_CODE_NOT_GENERATED')
      const newCustomer = new Customer({
        uniCode: module.data.code,
        fname: body.name,
        email: body.email,
        phone: body.phone,
        phoneCode: body.phoneCode
      })
      newCustomer.setPassword(Config.app.name)
      const customer = await newCustomer.save()
      const customerObj = {
        status: 'free'
      }
      await FirebaseServices.customerFbStatus('ADD', customer._id, customerObj)
      res.status = 200
      ;(res.success = true), (res.customerId = customer._id)
      return res
    } catch (error) {
      res.message = error.message
      return res
    }
  }
}

export { CustomerController }
