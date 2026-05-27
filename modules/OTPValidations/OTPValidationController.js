/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import moment from 'moment'
import path from 'path'
import fs from 'fs'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { Helpers } from '../../helpers/Function.js'
import { BaseController } from '../../controllers/BaseController.js'
import { Enum } from '../../utils/Enum.js'
import Verification from '../../models/Auth/Verification.js'
import Partner from '../../models/Auth/Partner.js'
import Customer from '../../models/Auth/Customer.js'
import { OTPConfig } from './config.js'
const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class OTPValidationController extends BaseController {
  constructor() {
    super()
  }

  static updateOTPconfig = async (req, res) => {
    try {
      const otpObj = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/OTPValidations/config.js`
      const fileContent = `
        /* ************************
        * Copyright 2023
        * ABSERVETECH
        ************************ */
        const OTPConfig = ${JSON.stringify(otpObj, null, 2)} 
        export { OTPConfig }`

      await fs.writeFileSync(filePath, fileContent)
      return requestHandler.sendSuccess(req, res, 'CREATE_OTP_CONFIG')({ message: 'UPDATED', otpObj })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getOTPconfig = async (req, res) => {
    try {
      return requestHandler.sendSuccess(req, res, 'GET_OTP_CONFIG')({ message: 'SUCCESS', OTPConfig })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static validateOTPLimit = async (dataObj) => {
    let response = { status: false, message: 'UNPROCESSABLE_ENTITY' }
    try {
      const {
        phoneNumber = '',
        phoneCode = '',
        userType = Enum.ROLES.ADMIN,
        verifyBy = '',
        verifyFrom = ''
      } = dataObj
      console.log(
        'phoneNumber',
        phoneNumber,
        'phoneCode',
        phoneCode,
        'userType',
        userType,
        'verifyBy',
        verifyBy,
        'verifyFrom',
        verifyFrom
      )
      const startOfDay = moment().startOf('day').format()
      console.log('startOfDay', startOfDay)
      const endOfDay = moment().endOf('day').format()
      console.log('endOfDay', endOfDay)

      const andCondition = [
        { userType: userType },
        { verifyFrom: verifyFrom },
        { phoneCode: phoneCode },
        { phoneNumber: phoneNumber },
        { verifyBy: verifyBy },
        { OTPLimitUpdatedDate: { $gte: startOfDay, $lte: endOfDay } }
      ]

      const getVerify = await Verification.find({ $and: andCondition })
      console.log('getVerify', getVerify)
      if (getVerify.length >= OTPConfig.maxOTPRequest) {
        dataObj.blockedFor = 'OTP Limit Exceeded'
        if (OTPConfig.isBlock?.isEnable) await this.blockForExceededLimit(dataObj)
        response.status = false
        response.message = 'OTP_REQUEST_LIMIT_EXCEEDED'
      } else if (getVerify.length == 1) {
        if (getVerify[0].verified == false && getVerify[0].OTPLimit >= OTPConfig.maxOTPRequest) {
          dataObj.blockedFor = 'OTP Limit Exceeded'
          // const blockForExceededLimit = await this.blockForExceededLimit(dataObj)
          if (OTPConfig.isBlock?.isEnable) await this.blockForExceededLimit(dataObj)
          // if (blockForExceededLimit.status) {
          response.status = false
          response.message = 'OTP_REQUEST_LIMIT_EXCEEDED'
          // }
        } else {
          response.status = true
          response.message = 'OTP_REQUEST_LIMIT_NOT_EXCEEDED'
        }
      } else {
        response.status = true
        response.message = 'OTP_REQUEST_LIMIT_NOT_EXCEEDED'
      }
    } catch (error) {
      console.log(error)
      response = {
        status: false,
        message: error.message || response.message
      }
    }
    console.log('response', response)
    return response
  }

  static validateWrongOTPLimit = async (dataObj) => {
    let response = { status: false, message: 'UNPROCESSABLE_ENTITY' }
    try {
      const {
        phoneNumber = '',
        phoneCode = '',
        userType = Enum.ROLES.ADMIN,
        verifyBy = '',
        verifyFrom = Enum.VERIFICATION.LOGIN
      } = dataObj
      console.log(
        'phoneNumber',
        phoneNumber,
        'phoneCode',
        phoneCode,
        'userType',
        userType,
        'verifyBy',
        verifyBy,
        'verifyFrom',
        verifyFrom
      )
      const startOfDay = moment().startOf('day').format()
      console.log('startOfDay', startOfDay)
      const endOfDay = moment().endOf('day').format()
      console.log('endOfDay', endOfDay)

      const andCondition = [
        { userType: userType },
        { verifyFrom: verifyFrom },
        { phoneCode: phoneCode },
        { phoneNumber: phoneNumber },
        { verifyBy: verifyBy },
        { verified: false },
        { wrongOTPLimitUpdatedDate: { $gte: startOfDay, $lte: endOfDay } }
      ]

      const getVerify = await Verification.findOne({ $and: andCondition })
      console.log('getVerify', getVerify)
      if (getVerify && getVerify.wrongOTPLimit >= OTPConfig.failAttemptLimit) {
        dataObj.blockedFor = 'Wrong OTP Limit Exceeded'
        dataObj.wrongOTPLimitExceeded = true
        // const blockForExceededLimit = await this.blockForExceededLimit(dataObj)
        if (OTPConfig.isBlock?.isEnable) await this.blockForExceededLimit(dataObj)
        // if (blockForExceededLimit.status) {
        response.status = false
        response.message = 'OTP_REQUEST_LIMIT_EXCEEDED'
        // }
      } else {
        response.status = true
        response.message = 'OTP_REQUEST_LIMIT_NOT_EXCEEDED'
      }
    } catch (error) {
      console.log(error)
      response = {
        status: false,
        message: error.message || response.message
      }
    }
    console.log('response', response)
    return response
  }

  static blockForExceededLimit = async (dataObj) => {
    const response = { status: false, message: 'UNPROCESSABLE_ENTITY' }
    const { phoneNumber = '', phoneCode = '', userType = Enum.ROLES.ADMIN, blockedFor } = dataObj
    const updateQuery = {
      $and: [
        { phoneCode: phoneCode },
        { phone: phoneNumber },
        { status: { $in: ['Pending', 'Active', 'Inactive'] } }
      ]
    }
    const updateData = {
      // OTPLimitations: {
      //   isblocked: true,
      //   blockedFor: blockedFor
      // },
      'OTPLimitations.isblocked': true,
      'OTPLimitations.blockedFor': blockedFor,
      status: 'Blocked'
    }
    if (dataObj.wrongOTPLimitExceeded) updateData['OTPLimitations.wrongOTPblockedTime'] = moment().format()
    else updateData['OTPLimitations.blockedTime'] = Date.now()
    if (userType == Enum.ROLES.CUSTOMER) {
      console.log('updateData', updateData)
      const blockCustomer = await Customer.findOneAndUpdate(updateQuery, { $set: updateData })
      console.log('blockCustomer', blockCustomer)
      if (blockCustomer) {
        response.status = true
        response.message = 'CUSTOMER_BLOCKED_SUCCESSFULLY'
      }
    } else if (userType == Enum.ROLES.PARTNER) {
      const blockPartner = await Partner.findOneAndUpdate(updateQuery, { $set: updateData })
      console.log('blockPartner', blockPartner)
      if (blockPartner) {
        response.status = true
        response.message = 'PARTNER_BLOCKED_SUCCESSFULLY'
      }
    }
    return response
  }

  static unBlockOTPLimitExceededPartner = async () => {
    const blockforExceedOTPRequest = moment().subtract(OTPConfig.blockforExceedOTPRequest, 'hours').format()
    const blockForFailedAttempt = moment().subtract(OTPConfig.blockForFailedAttempt, 'hours').format()
    console.log('currentTime', currentTime)
    const unblockPartner = await Partner.updateMany(
      {
        'OTPLimitations.isblocked': true,
        $or: [
          { 'OTPLimitations.blockedTime': { $eq: blockforExceedOTPRequest } },
          { 'OTPLimitations.blockedTime': { $eq: blockForFailedAttempt } }
        ]
      },
      {
        $set: {
          OTPLimitations: {
            isblocked: false,
            blockedFor: '',
            blockedTime: null
          },
          status: 'Active'
        }
      }
    )
    console.log('unblockPartner', unblockPartner)
  }

  static unBlockOTPLimitExceededCustomer = async () => {
    const blockforExceedOTPRequest = moment().subtract(OTPConfig.blockforExceedOTPRequest, 'hours').format()
    const blockForFailedAttempt = moment().subtract(OTPConfig.blockForFailedAttempt, 'hours').format()
    console.log('currentTime', currentTime)
    await Customer.updateMany(
      {
        'OTPLimitations.isblocked': true,
        $or: [
          { 'OTPLimitations.blockedTime': { $eq: blockforExceedOTPRequest } },
          { 'OTPLimitations.blockedTime': { $eq: blockForFailedAttempt } }
        ],
        status: 'Blocked'
      },
      {
        $set: {
          OTPLimitations: {
            isblocked: false,
            blockedFor: '',
            blockedTime: null
          },
          status: 'Active'
        }
      }
    )
  }

  static updateWrongOTPLimit = async (dataObj) => {
    let response = { status: false, message: 'UNPROCESSABLE_ENTITY', data: {} }
    try {
      const {
        phoneNumber = '',
        phoneCode = '',
        userType = Enum.ROLES.ADMIN,
        verifyBy = '',
        verifyFrom = Enum.VERIFICATION.LOGIN,
        code = ''
      } = dataObj
      console.log(
        'phoneNumber',
        phoneNumber,
        'phoneCode',
        phoneCode,
        'userType',
        userType,
        'verifyBy',
        verifyBy
      )
      const andCondition = [{ userType: userType }, { verified: false }, { verifyFrom: verifyFrom }]
      if (verifyBy == 'email') {
        andCondition.push({ email: email })
      } else {
        andCondition.push({ phoneCode: phoneCode })
        andCondition.push({ phoneNumber: phoneNumber })
      }

      const getVerify = await Verification.findOne({ $and: andCondition }).exec()
      if (getVerify.otp != code) {
        const currentDate = new Date(Helpers.getISODate())
        if (
          getVerify.wrongOTPLimitUpdatedDate &&
          getVerify.wrongOTPLimitUpdatedDate.toDateString() === currentDate.toDateString() &&
          getVerify.wrongOTPLimit >= OTPConfig.failAttemptLimit
        ) {
          response.status = true
          response.LimitExceeded = true
          response.message = 'WRONG_OTP_LIMIT_EXCEEDED'
        } else {
          if (
            getVerify.wrongOTPLimitUpdatedDate &&
            getVerify.wrongOTPLimitUpdatedDate.toDateString() === currentDate.toDateString()
          ) {
            getVerify.wrongOTPLimit = Number(getVerify.wrongOTPLimit) + 1
            getVerify.wrongOTPLimitUpdatedDate = moment().format()
          } else {
            getVerify.wrongOTPLimit = 1
            getVerify.wrongOTPLimitUpdatedDate = moment().format()
          }
          const updateData = await getVerify.save()
          console.log('updateData', updateData)
          response.LimitExceeded = false
          response.data.verification = updateData
          response.status = true
          response.message = 'WRONG_OTP_LIMIT_UPDATED'
        }
      }
    } catch (error) {
      console.log(error)
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }
}

export { OTPValidationController }
