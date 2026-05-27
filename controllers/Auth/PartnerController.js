/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import moment from 'moment'
import { Enum } from '../../utils/Enum.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'

import { SettingsConfig } from '../../config/SettingsConfig.js'

import { BaseController } from '../BaseController.js'
import { NotifcationController } from '../Notification/Index.js'

import { AuthValidator } from '../../validators/Common/AuthValidator.js'

import { AuthServices } from '../../services/Common/AuthService.js'
import { VerificationService } from '../../services/Common/VerificationService.js'
import { FirebaseServices } from '../../services/FirebaseService.js'
import { Config } from '../../config/AppConfig.js'

import Partner from '../../models/Auth/Partner.js'
import Wallet from '../../models/Creteria/Wallet.js'
// import ServiceType from '../../models/Creteria/ServiceType.js'
import Vehicle from '../../models/Creteria/Vehicle.js'
import Trip from '../../models/ServiceModule/Trip.js'

import { DocumentController } from '../Creteria/DocumentController.js'
import { AuthendicationError, ValidationError, NotFoundError } from '../../utils/ErrorHandler.js'

import { QueryBuilder } from '../../helpers/QueryBuilder.js'
import { ReferralController } from '../../modules/Referral/controllers/ReferralController.js'
import { SignupBonusController } from '../../modules/Signupbonus/controllers/SignupbonusController.js'
import { DrivingTimeController } from '../../modules/DrivingTimeRestriction/controllers/DrivingTimeRestrictionController.js'
import { MapServices } from '../../modules/Map/index.js'
import { PaymentConfig } from '../../config/PaymentConfig.js'
import { PartnerSoundQrConfig } from '../../modules/Partnersound-QrImage/config.js'
import { OTPValidationController } from '../../modules/OTPValidations/OTPValidationController.js'
import { OTPConfig } from '../../modules/OTPValidations/config.js'
import { SubscriptionConfig } from '../../modules/Subscription/config.js'
import { DrivingTimeConfig } from '../../modules/DrivingTimeRestriction/config.js'
import PurchasePackage from '../../modules/Subscription/models/PurchasePackage.js'
import Trips from '../../models/ServiceModule/Trip.js'
import { HailTripConfig } from '../../modules/HailTrips/config.js'
import { Helpers } from '../../helpers/Function.js'

const logger = new Logger()

const requestHandler = new RequestHandler(logger)

class PartnerController extends BaseController {
  constructor() {
    super()
  }

  static getProfile = async (req, res) => {
    // console.log(req.headers.authorization)
    try {
      const authData = req.auth
      const paramData = req.params
      console.log('token', req.headers.authorization)

      const partnerId =
        authData.role == Enum.ROLES.PARTNER ? authData.userId : mongoose.Types.ObjectId(paramData.partnerId)

      const partnerData = await Partner.findOne(
        { _id: partnerId },
        {
          document: 0,
          events: 0,
          updatedBy: 0,
          hash: 0,
          salt: 0
        }
      )
        .lean()
        .exec()
      if (!partnerData) throw new Error('NOT_FOUND|PARTNER')

      const validationData = await this.getValidation(partnerId)
      const vehicleMatch = {
        partnerId: partnerId,
        deletedAt: null
      }
      if (partnerData.activeVechicle) vehicleMatch['_id'] = partnerData.activeVechicle
      const vehicleData = await Vehicle.aggregate([
        {
          $match: vehicleMatch
        },
        {
          $lookup: {
            from: 'servicetypes',
            localField: 'servicetype',
            foreignField: '_id',
            as: 'serviceTypeData'
          }
        },
        {
          $unwind: {
            path: '$serviceTypeData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'pricings',
            localField: 'serviceTypeData._id',
            foreignField: 'serviceId',
            as: 'pricingData'
          }
        },
        {
          $unwind: {
            path: '$pricingData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            partnerId: 1,
            status: 1,
            registrationnumber: 1,
            makeid: 1,
            model: 1,
            servicetype: 1,
            year: 1,
            color: 1,
            servicetypeid: { $ifNull: ['$serviceTypeData.name', ''] },
            vehicleimage: { $ifNull: ['$serviceTypeData.image', ''] },
            bidding: { $ifNull: ['$pricingData.additional.bidding.status', false] }
          }
        }
      ]).exec()
      let paymentGatewaykey = PaymentConfig.gateway.find(
        (g) => g.indexName != 'CASH' && g.indexName != 'WALLET' && g.status === true && g.isActive === true
      )
      paymentGatewaykey = paymentGatewaykey.fields.find((f) => f.indexName === 'publicKey')?.value || ''
      let dayStart = moment().format('YYYY-MM-DD')
      console.log('dayStart', dayStart)
      dayStart = Helpers.getISOStartDate(dayStart)
      console.log('dayStart', dayStart, new Date(dayStart))
      let dayEnd = moment().format('YYYY-MM-DD')
      console.log('dayEnd', dayEnd)
      dayEnd = Helpers.getISOEndDate(dayEnd)
      console.log('dayEnd', dayEnd, new Date(dayEnd))

      const tripEarningArr = await Trip.aggregate([
        {
          $match: {
            'partner.id': partnerId,
            status: Enum.TRIP.STATUS.FINISHED,
            $and: [
              {
                scheduleOn: { $gte: new Date(dayStart) }
              },
              {
                scheduleOn: { $lte: new Date(dayEnd) }
              }
            ]
          }
        },
        {
          $group: {
            _id: '$partner.id',
            count: { $sum: 1 },
            partner: { $sum: '$invoice.payable' }
          }
        }
      ])
      let earnings = Number(tripEarningArr?.[0]?.partner || 0)
      if (earnings > 0) earnings = Number(earnings.toFixed(2))

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PARTNER'
      )({
        message: 'SUCCESS',
        profile: partnerData,
        activeVechicle: vehicleData && vehicleData.length > 0 ? vehicleData[0] : null,
        validation: validationData,
        paymentGatewaykey: paymentGatewaykey,
        Tripalertsound: PartnerSoundQrConfig.TripalertSoundpath,
        tripCount: tripEarningArr?.[0]?.count || 0,
        earnings: earnings
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static loginPartner = async (req, res) => {
    try {
      const body = req.body
      const query = {}

      const deviceId = req.headers['x-client-id'] || undefined
      if (!deviceId) throw new ValidationError('DEVICE_ID_IS_REQUIRED')

      const validation = await AuthValidator.validateData(body, 'loginPartner')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      if (body.email) {
        query['email'] = body.email
      } else {
        query['phone'] = body.phone
        query['phoneCode'] = body.phoneCode
      }
      const partnerData = await Partner.findOne(query).exec()
      if (!partnerData) throw new AuthendicationError('NOT_FOUND|ACCOUNT')

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
        }
      } else {
        const passwordIsValid = await partnerData.validPassword(
          body.password,
          partnerData.salt,
          partnerData.hash
        )
        if (!passwordIsValid) throw new ValidationError('MAKE_SURE_YOUR_PASSWORD')
      }

      const update = {
        deviceId: deviceId,
        fcmId: body.fcmId || ''
      }
      const partner = await Partner.findOneAndUpdate(query, update, { new: true }).exec()
      const tokenData = {
        userId: partner._id,
        email: partner.email,
        name: partner.fname,
        role: Enum.ROLES.PARTNER,
        deviceId: partner.deviceId
      }
      const loginToken = await partner.generateJwt(tokenData)
      const firebaseToken = await FirebaseServices.authToken(partner._id)
      let paymentGatewaykey = PaymentConfig.gateway.find(
        (g) => g.indexName != 'CASH' && g.indexName != 'WALLET' && g.status === true && g.isActive === true
      )
      paymentGatewaykey = paymentGatewaykey.fields.find((f) => f.indexName === 'publicKey')?.value || ''
      return requestHandler.sendSuccess(
        req,
        res,
        'LOGIN_PARTNER'
      )({
        message: 'SUCCESS',
        partner: partner,
        token: loginToken,
        firebaseToken: firebaseToken,
        paymentGatewaykey: paymentGatewaykey,
        Tripalertsound: PartnerSoundQrConfig.TripalertSoundpath
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPartnerExists = async (req, res) => {
    try {
      const query = req.query
      const response = {
        message: 'EXIST|PARNTER',
        account: {
          isExist: false
        }
      }

      const validation = await AuthValidator.validateData(query, 'getPartnerExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getPartner(req.query)
      if (account?.status) response.account.isExist = true
      else response.message = 'NOT_EXIST|PARTNER'

      return requestHandler.sendSuccess(req, res, 'GET_PATNER_EXISTS')(response)
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createPartner = async (req, res) => {
    try {
      const body = req.body
      console.log('body', req.body)

      const validation = await AuthValidator.validateData(body, 'createPartner')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingPartner = await Partner.findOne({
        $or: [{ email: body.email }, { phone: body.phone, phoneCode: body.phoneCode }]
      }).lean()

      if (existingPartner) {
        existingPartner.email === body.email
          ? (() => {
              throw new AuthendicationError('EMAIL ALREADY EXISTS')
            })()
          : existingPartner.phone === body.phone && existingPartner.phoneCode === body.phoneCode
          ? (() => {
              throw new AuthendicationError('PHONE NUMBER ALREADY EXISTS')
            })()
          : null
      }

      const module = await AuthServices.uniCodeGenerator('Partner')
      if (!module.status) throw new ValidationError('MODULE_CODE_NOT_GENERATED')

      // find the service area for driver register location
      const serviceCity = await MapServices.findServiceCity({
        latitude: body.latitude || 9.9252,
        longitude: body.longitude || 78.1198
      })
      const newPartner = new Partner({
        uniCode: module.data.code,

        fname: body.fname,
        lname: body.lname,
        email: body.email,
        phoneCode: body.phoneCode,
        phone: body.phone,
        dob: body.dob,

        currency: body.currency || Config.app.currency,
        gender: body.gender,
        language: body.language,

        city: body.city,
        state: body.state,
        country: body.country,

        emailVerified: body.emailVerified,
        phoneVerified: body.phoneVerified,

        deviceId: req.headers['x-client-id'],
        fcmId: body.fcmId,
        // scId: body.scId && body.scId != '' ? body.scId.split(',') : [],
        scId: serviceCity.data,
        referrer: body.referalcode
      })

      if (req.body.companyId) newPartner.companyId = mongoose.Types.ObjectId(req.body.companyId)
      if (req.file) newPartner.profile = req.file.path
      if (req.body.loginType == 'facebook' || req.body.loginType == 'google') {
        newPartner.loginType = req.body.loginType
        newPartner.loginId = req.body.loginId
      } else {
        newPartner.setPassword(req.body.password)
      }
      const hailTripsModule = SettingsConfig.menulist.find(
        (item) => item.value == Enum.SETTINGS.HAILTRIPSETTINGS
      )
      if (hailTripsModule.enabled && HailTripConfig.isEnabled && HailTripConfig.partnerDiscount?.isEnabled) {
        newPartner.hailTripDiscountStatus = body.hailTripDiscountStatus || false
        newPartner.hailTripDiscountPercentage = body.hailTripDiscountPercentage || 0 // percentage amount
      }

      const partner = await newPartner.save()
      if (
        SettingsConfig.menulist.find(
          (item) => item.value == Enum.SETTINGS.REFERRALSETTING && item.enabled == true
        )
      ) {
        if (req.body.referalcode != 'undefined' && req.body.referalcode != '') {
          await ReferralController.referralProcess(
            req.body.referalcode,
            partner._id,
            Enum.ROLES.PARTNER,
            Enum.PAYMENT.MODE.CREDIT
          )
        }
      }

      const pWallet = new Wallet({
        userId: partner._id
      })
      const wallet = await pWallet.save()
      if (
        SettingsConfig.menulist.find(
          (item) => item.value == Enum.SETTINGS.SIGNUPSETTING && item.enabled == true
        )
      ) {
        await SignupBonusController.signupBonusProcess(partner._id, Enum.ROLES.PARTNER)
      }
      const tokenData = {
        userId: partner._id,
        email: partner.email,
        name: partner.fname,
        role: Enum.ROLES.PARTNER,
        deviceId: partner.deviceId
      }

      const loginToken = await partner.generateJwt(tokenData)
      const firebaseToken = await FirebaseServices.authToken(partner._id)
      const partnerObj = {
        status: 'free'
      }
      await FirebaseServices.partnerFbStatus('ADD', partner._id, partnerObj)
      await NotifcationController.createNotification({
        processType: [Enum.NOTIFICATION.TYPE.MAIL],
        data: {
          email: partner.email,
          contentdata: { name: partner.fname },
          subject: 'Partner Welcome'
        }
      })
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_PARTNER'
      )({
        message: 'CREATED|PARTNER',
        partner: partner,
        Pwallet: wallet,
        token: loginToken,
        firebaseToken: firebaseToken
      })
    } catch (error) {
      console.log('erro', error)

      return requestHandler.sendError(req, res, error)
    }
  }

  static getPartner = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(Partner, queryData)
      queryObject = queryBuilder.queryObject

      for (const key in queryData) {
        if (!key.includes('.') || queryData[key] === undefined) continue

        if (key === 'payment.subscriptionEndDate') {
          const date = new Date(queryData[key])
          if (!isNaN(date)) {
            const yyyy = date.getUTCFullYear()
            const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
            const dd = String(date.getUTCDate()).padStart(2, '0')

            queryObject[key] = {
              $gte: `${yyyy}-${mm}-${dd}T00:00:00.000Z`,
              $lte: `${yyyy}-${mm}-${dd}T23:59:59.999Z`
            }
          }
        } else {
          const value = isNaN(queryData[key]) ? queryData[key] : Number(queryData[key])
          queryObject[key] = value
        }
      }

      if (paramData.partnerId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.partnerId)
      }
      const getDataCount = await Partner.find(queryObject).count()
      const getData = await Partner.find(queryObject).sort({ _id: -1 }).skip(skip).limit(perPage)
      let paymentGatewaykey = PaymentConfig.gateway.find(
        (g) => g.indexName != 'CASH' && g.indexName != 'WALLET' && g.status === true && g.isActive === true
      )
      paymentGatewaykey = paymentGatewaykey.fields.find((f) => f.indexName === 'publicKey')?.value || ''

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PARTNER'
      )({
        message: 'SUCCESS',
        partner: getData,
        total: getDataCount,
        paymentGatewaykey: paymentGatewaykey,
        Tripalertsound: PartnerSoundQrConfig.TripalertSoundpath
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updatePartner = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.partnerId || req.body.userId
      body.exceptId = userId

      const validation = await AuthValidator.validateData(body, 'updatePartner')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingPartner = await Partner.findOne({
        $or: [{ email: body.email }, { phone: body.phone, phoneCode: body.phoneCode }],
        _id: { $ne: userId }
      }).lean()

      if (existingPartner) {
        existingPartner.email === body.email
          ? (() => {
              throw new AuthendicationError('EMAIL ALREADY EXISTS')
            })()
          : existingPartner.phone === body.phone && existingPartner.phoneCode === body.phoneCode
          ? (() => {
              throw new AuthendicationError('PHONE NUMBER ALREADY EXISTS')
            })()
          : null
      }

      const partner = await Partner.findById(userId).exec()

      partner.fname = body.fname || partner.fname
      partner.lname = body.lname || partner.lname
      partner.email = body.email || partner.email
      partner.phone = body.phone || partner.phone
      partner.phoneCode = body.phoneCode || partner.phoneCode
      partner.currency = body.currency || partner.currency

      partner.phoneCode = body.phoneCode || partner.phoneCode

      partner.gender = body.gender || partner.gender
      partner.language = body.language || partner.language

      partner.city = body.city || partner.city
      partner.state = body.state || partner.state
      partner.country = body.country || partner.country

      partner.emailVerified = body.emailVerified || partner.emailVerified
      partner.phoneVerified = body.phoneVerified || partner.phoneVerified
      partner.updatedBy.userId = req.auth.userId || partner.updatedBy.userId
      partner.updatedBy.role = req.auth.role || partner.updatedBy.role

      const hailTripsModule = SettingsConfig.menulist.find(
        (item) => item.value == Enum.SETTINGS.HAILTRIPSETTINGS
      )
      if (hailTripsModule.enabled && HailTripConfig.isEnabled && HailTripConfig.partnerDiscount?.isEnabled) {
        partner.hailTripDiscountStatus = body.hailTripDiscountStatus || partner.hailTripDiscountStatus
        partner.hailTripDiscountPercentage =
          body.hailTripDiscountPercentage || partner.hailTripDiscountPercentage
      }

      if (body.password) partner.setPassword(body.password)
      if (req.file) partner.profile = req.file.path
      partner.scId = body.scId && body.scId != '' ? body.scId.split(',') : partner.scId

      const updatedPartner = await partner.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_PARTNER'
      )({ message: 'UPDATED|PARTNER', partner: updatedPartner })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deletePartner = async (req, res) => {
    try {
      const body = req.body
      const auth = req.auth

      let userId = null
      if (auth.userRole == Enum.ROLES.PARTNER) userId = auth.userId
      else userId = req.params.partnerId || req.body.userId

      if (!userId) throw new Error('PERMISSION_DENIED')
      body.exceptId = userId

      const account = await AuthServices.getPartner(body)
      if (!account?.status) {
        throw new AuthendicationError('NOT_EXISTS')
      }
      const getPartnerData = await Partner.findOne({ _id: userId })
      // Remove Vehicle associated with this partner
      if (getPartnerData) {
        if (getPartnerData.activeVechicle != null) {
          await Vehicle.findById(getPartnerData.activeVechicle).remove().exec()
        } else {
          // remove all vehicle that matches partnerId
          await Vehicle.deleteMany({ partnerId: userId })
        }
      }
      const customer = await Partner.findById(userId).remove().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_PARTNER'
      )({ message: 'DELETED|PARTNER', customer: customer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static partnerOnline = async (req, res) => {
    try {
      const body = req.body
      const partnerId = body.id || req.auth.userId

      let findPartner = await Partner.findOne({ _id: partnerId }).exec()

      if (!findPartner) throw new NotFoundError('NOT_FOUND|ACCOUNT')

      if (findPartner.status === 'Pending') throw new ValidationError('ACCOUNT_APPROVED_ACTIVATED')

      // Check subscription status.
      const subscriptionModule = SettingsConfig.menulist.find(
        (item) => item.value == Enum.SETTINGS.SUBSCRIPTIONSETTING
      )
      if (
        subscriptionModule.enabled &&
        JSON.parse(SubscriptionConfig.isEnabled) &&
        JSON.parse(SubscriptionConfig.partnerRestriction)
      ) {
        const payment = findPartner?.payment || null // Null means no subscription active.
        // Check subscription active or not.
        if (payment && payment.subscriptionStatus) {
          const packageData = await PurchasePackage.findOne({
            _id: findPartner.payment?.packageId,
            status: Enum.PACKAGE.STATUS.ACTIVE
          })
          // Check subscription free trips
          const completedTripsCount = await Trips.find({
            'partner.id': findPartner._id,
            status: Enum.TRIP.STATUS.FINISHED
          })
            .countDocuments()
            .exec()
          console.log('Completed Trip Counts', completedTripsCount)
          const minWalletBalance = 50 // Feature from vehicle min balance.
          const isFreeTripCompleted = completedTripsCount >= packageData.newPurchaseFreeTrips
          // Free trips completed and balance also low
          if (isFreeTripCompleted && findPartner.payment?.wallet < minWalletBalance) {
            throw new Error('PLEASE_TOP_UP_YOUR_wALLET')
          }
        } else {
          throw new Error('PLEASE_BUY_SUBSCRIPTION')
        }
      }

      const drivingTimeModule = SettingsConfig.menulist.find(
        (item) => item.value == Enum.SETTINGS.DRIVINGTIMERESTRICTION
      )

      if (drivingTimeModule.enabled && JSON.parse(DrivingTimeConfig.isEnabled)) {
        const drivingCheck = await DrivingTimeController.checkDrivingTime(findPartner, body.status)
        if (drivingCheck.status === 'blocked') {
          // findPartner.online = false;
          findPartner.online = [0, '0'].includes(body.status)
          await findPartner.save()
          return requestHandler.sendError(req, res, new Error(drivingCheck.message))
        }
      }

      findPartner.online = [1, '1'].includes(body.status)
      findPartner = await findPartner.save()

      const message = findPartner.online ? 'ONLINE|PARTNER' : 'OFFLINE|PARTNER'
      return requestHandler.sendSuccess(
        req,
        res,
        'PARTNER_ONLINE'
      )({ message: message, partner: findPartner })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static partnerActive = async (req, res) => {
    try {
      const update = {
        status: 'Active'
      }
      const id = req.query.id || req.auth.userId
      const activedata = await Partner.findOneAndUpdate({ _id: id }, update, { new: true }).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'PARTNER_ACTIVE'
      )({ message: 'PARTNER_ACTIVATED_SUCCESS', Data: activedata })
    } catch (error) {
      return requestHandler.sendSuccess(req, res, error)
    }
  }

  static partnerInactive = async (req, res) => {
    try {
      const update = {
        status: 'Inactive'
      }
      const id = req.query.id || req.auth.userId
      const inactivedata = await Partner.findOneAndUpdate({ _id: id }, update, { new: true }).exec()
      // updatePartnerProofStatusInFB(req.params.id, 'Accepted');
      return requestHandler.sendSuccess(
        req,
        res,
        'PARTNER_INACTIVE'
      )({ message: 'PARTNER_INACTIVATED_SUCCESS', Data: inactivedata })
    } catch (error) {
      return requestHandler.sendSuccess(req, res, error)
    }
  }

  static updatePartnerStatus = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.partnerId || req.auth.userId

      body._id = userId

      const validation = await AuthValidator.validateData(body, 'updateCustomerStatus')

      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getPartner(body)
      if (!account?.status) {
        throw new NotFoundError('NOT_EXIST|PARTNER')
      }
      const partner = await Partner.findOne({ _id: userId })
      if (partner) {
        if (body.status != 'Inactive' && partner.activeVechicle == null) throw new Error('NOT_ACTIVE|VEHICLE')
      }
      if (body.status == 'Active') {
        const partnerDocument = partner.document
        if (partnerDocument.length == 0) throw new ValidationError('Upload Document before approving')
        if (partnerDocument.length > 0) {
          const filtered = partnerDocument.filter(
            (doc) => doc.status === 'pending' || doc.status === 'rejected'
          )
          if (filtered.length > 0) throw new ValidationError('Approve Document before approving profile')
        }
        const findQuery = { deletedAt: null }
        const chedkInActiveQuery = { deletedAt: null, status: 'active' }
        if (partner.activeVechicle != null) {
          findQuery['_id'] = chedkInActiveQuery['_id'] = partner.activeVechicle
        } else {
          findQuery['partnerId'] = chedkInActiveQuery['partnerId'] = userId
        }
        const checkVehicle = await Vehicle.findOne(findQuery)
        if (!checkVehicle) throw new Error('Add Vehicle before approving profile')
        const checkInactiveVehicle = await Vehicle.findOne(chedkInActiveQuery)
        if (!checkInactiveVehicle) throw new Error('Approve Vehicle before approving profile')
      }
      partner.status = body.status

      const updatedUser = await partner.save()

      await NotifcationController.createNotification({
        processType: [Enum.NOTIFICATION.TYPE.MAIL],
        data: {
          email: partner.email,
          subject: 'Account Status',
          contentdata: {
            NAME: partner.fname + ' ' + partner.lname, // driver name
            CONTENT: 'Your account is currently',
            ACCOUNT_STATUS: partner.status,
            APP_NAME: Config.app.name,
            APP_EMAIL: Config.app?.email || 'support@rebustar.com',
            APP_LOGO: Config.app.baseurl + '/public/logo.png'
          }
        }
      })

      let title = ''
      let template = ''
      if (partner.status == 'Inactive') {
        title = 'InactivePartner'
        template = 'accountInactive'
      } else {
        title = 'ActivePartner'
        template = 'accountActive'
      }

      await NotifcationController.createNotification({
        processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
        data: {
          pushToken: partner.fcmId,
          title: title,
          body: '',
          template: template,
          templateData: {}
        }
      })

      return requestHandler.sendSuccess(
        req,
        res,
        'PARTNER_STATUS_UPDATED'
      )({ message: 'UPDATED|PARTNER', data: updatedUser })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static changepassword = async (req, res) => {
    try {
      const auth = req.auth ? req.auth : null
      const body = req.body

      let partnerId = null
      if (auth) {
        if (auth.role == Enum.ROLES.ADMIN) partnerId = body._id
        else partnerId = auth.userId
      }
      if (partnerId) body._id = partnerId.toString()

      const validation = await AuthValidator.validateData(body, 'changepassword')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      let account
      const skipArray = [
        Enum.VERIFICATION.LOGIN,
        Enum.VERIFICATION.FORGETPASSWORD,
        Enum.VERIFICATION.CHANGEPASSWORD
      ]
      if (skipArray.includes(body.verifyFrom)) {
        const partnerWhere = {}
        if (req.auth == null) {
          if (body.email) {
            partnerWhere['email'] = body.email
          } else {
            partnerWhere['phone'] = body.phone
            partnerWhere['phoneCode'] = body.phoneCode
          }
        } else {
          partnerWhere['_id'] = partnerId
        }
        account = await Partner.findOne(partnerWhere).exec()
        if (!account) throw new AuthendicationError('NOT_FOUND|PARTNER')
      }
      let partner = null

      if (
        /* !auth || !auth.role || auth.role == Enum.ROLES.PARTNER && */ body.verifyFrom ==
        Enum.VERIFICATION.FORGETPASSWORD
      ) {
        let verifyObj = {
          code: body.code,
          userType: body.userType,
          verifyFrom: body.verifyFrom
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
        account.setPassword(body.password)
        partner = await account.save()
      } else if (auth.role && body.verifyFrom == Enum.VERIFICATION.CHANGEPASSWORD) {
        if (auth.role == Enum.ROLES.PARTNER) {
          const passwordIsValid = account.validPassword(body.oldpassword, account.salt, account.hash)
          if (!passwordIsValid) throw new ValidationError('INVALID_PASSWORD')
          if (body.password != body.newpassword) throw new ValidationError('PASSWORD_MISMATCH')
          if (body.password == body.oldpassword)
            throw new ValidationError('OLD_PASSWORD_AND_NEW_PASSWORD_CANT_BE_SAME')
        }
        account.setPassword(body.password)
        partner = await account.save()
      } else {
        throw new Error('UNKNOWN_VERIFY_FROM')
      }

      return requestHandler.sendSuccess(
        req,
        res,
        'CHANGE_PASSWORD'
      )({ message: 'PASSWORD_CHANGED|PARTNER', partner: partner })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static verification = async (req, res) => {
    try {
      const body = req.body
      const validation = await AuthValidator.validateData(body, 'verification')
      let account
      let updateVerify = true
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const skipArray = [
        Enum.VERIFICATION.LOGIN,
        Enum.VERIFICATION.FORGETPASSWORD,
        Enum.VERIFICATION.CHANGEPASSWORD
      ]
      if (skipArray.includes(body.verifyFrom)) {
        const partnerWhere = {}
        if (req.auth == null) {
          if (body.email) {
            partnerWhere['email'] = body.email
          } else {
            partnerWhere['phone'] = body.phone
            partnerWhere['phoneCode'] = body.phoneCode
          }
        } else {
          partnerWhere['_id'] = req.auth.userId
        }

        console.log(JSON.stringify(partnerWhere))
        account = await Partner.findOne(partnerWhere).exec()
        if (!account) throw new AuthendicationError('NOT_FOUND|PARTNER')

        if ([Enum.VERIFICATION.FORGETPASSWORD, Enum.VERIFICATION.CHANGEPASSWORD].includes(body.verifyFrom))
          updateVerify = false
      }

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
      let partner
      if (account) {
        if (body.verifyBy == 'email') {
          account.emailVerified = true
        } else {
          account.phoneVerified = true
        }

        partner = await account.save()
      }

      return requestHandler.sendSuccess(
        req,
        res,
        'VERIFICATION'
      )({ message: 'OTP_VERIFED', partner: partner })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getValidation = async (partnerId) => {
    const validation = {
      documents: [],
      vehicles: []
    }
    try {
      const partnerData = await Partner.findOne({ _id: partnerId }).lean().exec()
      if (!partnerData) throw new NotFoundError('PARTNER_NOT_FOUND')

      const partnerDocs = partnerData.document.length > 0 ? partnerData.document : []
      const getPartnerDocument = await DocumentController.parseDocument(
        Enum.DOCUMENT.TYPE.PARTNER,
        partnerData.scId,
        partnerDocs,
        {
          addPath: partnerId
        }
      )
      validation.documents = getPartnerDocument

      const vehicles = await Vehicle.find({ partnerId: partnerId }).exec()
      if (vehicles) {
        for (const vehicle of vehicles) {
          const vehicleDocs = vehicle.document.length > 0 ? vehicle.document : []
          const getVehicleDocument = await DocumentController.parseDocument(
            Enum.DOCUMENT.TYPE.VEHICLE,
            partnerData.scId,
            vehicleDocs
          )
          validation.vehicles.push({
            vehicleId: vehicle._id,
            registrationnumber: vehicle.registrationnumber,
            documents: getVehicleDocument
          })
        }
      }
    } catch (error) {
      console.error('GET_VALIDATION_ERROR: ', error)
    }
    return validation
  }

  static getEmgContact = async (req, res) => {
    try {
      const getEmgContact = await Partner.findOne({ _id: req.auth.userId }).lean().exec()
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
      const addEmgData = await Partner.findOneAndUpdate(
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
      const body = req.body || {}

      const validation = await AuthValidator.validateData(body, 'updateEmgContact')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const updateEmgContact = await Partner.findById({ _id: req.auth.userId }).lean().exec()
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

      const EmgContact = await Partner.findOneAndUpdate(query, update, { new: true }).exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_EMERGENCY_CONTACT'
      )({ message: 'CONTACT_SUCCESS', contacts: EmgContact })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static delEmgContact = async (req, res) => {
    try {
      const body = req.query
      const delEmgContact = await Partner.findById(req.auth.userId).exec()
      if (!delEmgContact) throw new NotFoundError('NO_DATA_FOUND')

      await Partner.updateOne(
        { _id: mongoose.Types.ObjectId(req.auth.userId) },
        { $pull: { EmergencyContact: { _id: mongoose.Types.ObjectId(body.emgContactId) } } }
      )

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_EMERGENCY_CONTACT'
      )({ message: 'CONTACT_DELETED_SUCCESS' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static currentLocation = async (req, res) => {
    try {
      const body = req.body || {}
      const partnerLat = parseFloat(body.latitude)
      const partnerLng = parseFloat(body.longitude)
      if (partnerLat && partnerLng) {
        const updateData = {
          bearing: body.bearing || 0,
          'location.coordinates': [partnerLng, partnerLat]
        }
        const updateCondition = { _id: req.auth.userId }
        await Partner.findOneAndUpdate(updateCondition, updateData)
        return requestHandler.sendSuccess(
          req,
          res,
          'PARTNER_LOCATION'
        )({ message: 'LOCATION_UPDATED_SUCCESSFULLY' })
      } else {
        throw new ValidationError('LOCATION_NOT_VALID')
      }
    } catch (error) {
      console.log(error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static partnerTracking = async (req, res) => {
    try {
      const queryData = req.query || {}
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const validation = await AuthValidator.validateData(queryData, 'partnerTracking')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const partnerQuery = {}
      if (queryData.serviceArea) partnerQuery['scId'] = mongoose.Types.ObjectId(queryData.serviceArea)
      if (queryData.status) partnerQuery['online'] = queryData.status == '1'
      if (queryData.curStatus) partnerQuery['curStatus'] = queryData.curStatus
      if (queryData.curService) partnerQuery['curService'] = mongoose.Types.ObjectId(queryData.curService)
      if (queryData.search) {
        const orQuery = [{ phone: queryData.search }, { uniCode: queryData.search }]
        partnerQuery['$or'] = orQuery
      }

      const trackPipeline = [
        {
          $match: partnerQuery
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: Number(skip) || 0 },
              { $limit: Number(perPage) || 10 },
              {
                $project: {
                  fname: 1,
                  email: 1,
                  phone: 1,
                  phoneCode: 1,
                  uniCode: 1,
                  online: 1,
                  status: 1,
                  curService: 1,
                  activeVechicle: 1,
                  location: 1
                }
              }
            ]
          }
        }
      ]

      const findPartner = await Partner.aggregate(trackPipeline).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'PARTNER_TRACKING'
      )({
        message: 'PARTNER_TRACKING',
        partners: findPartner[0]?.data,
        total: findPartner[0]?.metadata[0]?.total
      })
    } catch (error) {
      return requestHandler.sendSuccess(req, res, error)
    }
  }

  static partnerOfflineCron = async (req, res) => {
    try {
      const nowDate = new Date()
      const nowTime = nowDate.getTime()
      const time30MAfter = new Date()
      time30MAfter.setTime(nowTime - 30 * 60 * 1000)
      // time30MAfter.setSeconds(59)
      console.log('PARTNER_OFFLINE_CRON', time30MAfter)

      const findQuery = {
        online: true,
        curStatus: 'free',
        $or: [{ updatedAt: { $lt: time30MAfter } }, { updatedAt: null }]
      }
      const partnerIds = await Partner.distinct('_id', findQuery)
      if (partnerIds.length <= 0) throw new Error('PARTNER_OFFLINE_CRON_NO_PARTNERS')
      Partner.updateMany({ _id: { $in: partnerIds } }, { online: false }, (err, data) => {
        if (err) console.log('PARTNER_OFFLINE_CRON_ERROR', err)
        else console.log('PARTNER_OFFLINE_CRON_STATUS', JSON.stringify(data))
      })
    } catch (error) {
      console.log('PARTNEROFFLINECRON_ERROR', error)
    }
  }
}

export { PartnerController }
