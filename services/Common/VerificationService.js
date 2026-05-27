/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import Verification from '../../models/Auth/Verification.js'
import { BaseService } from '../BaseService.js'

import Admin from '../../models/Auth/Admin.js'
import { Enum } from '../../utils/Enum.js'
import { Config } from '../../config/AppConfig.js'

class VerificationService extends BaseService {
  static GenerateRandomNumber = async () => {
    // const Number = Math.floor(1000 + Math.random() * 9000)
    let randomNumber = 1111
    if (Config.mode != 'development') randomNumber = Math.floor(1000 + Math.random() * 9000)
    return randomNumber
  }

  static GetUsers = async (dataObj, userType) => {
    const response = { status: false, message: 'NOT_FOUND|ADMIN', data: {} }
    try {
      const findQuery = []
      if (dataObj.verifyBy == 'email') {
        findQuery.push({ email: dataObj.email })
      } else {
        findQuery.push({ phoneCode: dataObj.phoneCode })
        findQuery.push({ phoneNumber: dataObj.phoneNumber })
      }
      const user = {
        type: userType
      }
      if (userType == Enum.ROLES.ADMIN) {
        const admin = await Admin.findOne({ $and: findQuery }).lean().exec()
        if (!admin) throw new Error('NOT_FOUND|ADMIN')
        user['_id'] = admin._id
      }
      response.data.user = user
      response.status = true
    } catch (error) {
      response.message = error.message
    }
    return response
  }

  static create = async (dataObj) => {
    let response = { status: false, message: 'UNPROCESSABLE_ENTITY', data: {} }
    try {
      const {
        email = '',
        phoneNumber = '',
        phoneCode = '',
        userType = Enum.ROLES.ADMIN,

        verifyBy = '',
        verifyFrom = Enum.VERIFICATION.LOGIN
      } = dataObj

      if (
        (verifyBy == 'email' && email == '') ||
        (verifyBy != 'email' && (phoneNumber == '' || phoneCode == ''))
      )
        throw new Error('UNPROCESSABLE_ENTITY')

      // const userData = {}
      // if (verifyFrom == 'login') {
      //   userData = await this.GetUsers(dataObj, userType)
      //   if (!userData) throw new Error(userData.message)
      // } else {
      //   throw new Error('Unknown Verification Type')
      // }

      const andCondition = [{ userType: userType }, { verified: false }]
      if (verifyBy == 'email') {
        andCondition.push({ email: email })
      } else {
        andCondition.push({ phoneCode: phoneCode })
        andCondition.push({ phoneNumber: phoneNumber })
      }

      const randomSMS = await this.GenerateRandomNumber()
      const setData = {
        otp: randomSMS,
        verifyBy: verifyBy,
        verifyFrom: verifyFrom,
        userType: userType,
        phoneCode: phoneCode,
        phoneNumber: phoneNumber,
        email: email,
        verified: false
      }

      const addVerify = await Verification.findOneAndUpdate(
        { $and: andCondition },
        { $set: setData },
        { upsert: true, new: true }
      )
        .lean()
        .exec()
      response.data.verification = addVerify
      response.data.randomSMS = randomSMS
      response.status = true
      response.message = 'VERIFICATION_ADDED'
    } catch (error) {
      console.log('errorr', error)
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static validate = async (dataObj) => {
    let response = { status: false, message: 'UNPROCESSABLE_ENTITY', data: {} }
    try {
      const {
        email = '',
        phoneNumber = '',
        phoneCode = '',
        userType = Enum.ROLES.ADMIN,

        verifyBy = '',
        verifyFrom = Enum.VERIFICATION.LOGIN,
        code = '',
        updateVerify = true
      } = dataObj

      const andCondition = [{ userType: userType }, { verified: false }, { verifyFrom: verifyFrom }]
      if (verifyBy == 'email') {
        andCondition.push({ email: email })
      } else {
        andCondition.push({ phoneCode: phoneCode })
        andCondition.push({ phoneNumber: phoneNumber })
      }

      const getVerify = await Verification.findOne({ $and: andCondition }).exec()
      if (!getVerify) throw new Error('PLEASE_RESEND')
      else if (getVerify.otp != code) throw new Error('CODE_INVALID')
      else if (!updateVerify) {
        response.data.verification = getVerify
      } else {
        getVerify.verified = updateVerify
        const updateData = await getVerify.save()
        response.data.verification = updateData
      }
      response.status = true
      response.message = 'VERIFICATION_SUCCESS'
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

  static addVerify = async (req, res) => {
    try {
      const record = await this.create(req.body)
      // let random = await this.GenerateRandomNumber();
      return res.send(record)
    } catch (error) {
      console.log(error)
    }
  }

  static checkVerify = async (req, res) => {
    try {
      const record = await this.validate(req.body)
      // let random = await this.GenerateRandomNumber();
      return res.send(record)
    } catch (error) {
      console.log(error)
    }
  }
}

export { VerificationService }
