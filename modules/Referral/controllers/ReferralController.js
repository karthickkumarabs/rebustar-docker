/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import mongoose from 'mongoose'

import fs from 'fs'
import path from 'path'
import { ReferalConfig } from '../config.js'
import Partner from '../../../models/Auth/Partner.js'
import referalTransactions from '../models/ReferralTansaction.js'
import referralReport from '../models/ReferralReport.js'
import Customer from '../../../models/Auth/Customer.js'
import { Enum } from '../../../utils/Enum.js'
import { PaymentServices } from '../../Payment/PaymentService.js'
import { permissions } from '../../../config/Permissions.js'
const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ReferralController extends BaseController {
  constructor() {
    super()
  }
  static updatereferralConfig = async (req, res) => {
    try {
      const refferalObj = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/Referral/config.js`
      const fileContent = `
      /* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
    const ReferalConfig = ${JSON.stringify(refferalObj, null, 2)} 
    export { ReferalConfig }`
      const permissionData = permissions
      if (refferalObj.AutoupdateinWallet == false) {
        permissionData.menusList.forEach((menu) => {
          if (menu.module === 'reports') {
            menu.subMenuList = menu.subMenuList.filter((sub) => sub.module !== 'referralReports')
          }
        })
      } else {
        permissions.menusList.forEach((menu) => {
          if (menu.module === 'reports') {
            const alreadyExists = menu.subMenuList.some((sub) => sub.module === 'referralReports')

            if (!alreadyExists) {
              menu.subMenuList.push({
                menu: 'Referral Reports',
                status: false,
                subMenu: false,
                module: 'referralReports',
                subMenuList: []
              })
            }
          }
        })
      }
      const permissionsPath = `${__dirname}/config/Permissions.js`
      const permissionsContent = `
      /* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
    const permissions = ${JSON.stringify(permissionData, null, 2)} 
    export { permissions }`
      await fs.writeFileSync(permissionsPath, permissionsContent)
      await fs.writeFileSync(filePath, fileContent)

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({ message: 'UPDATED', refferaldata: refferalObj })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getreferralConfig = async (req, res) => {
    try {
      const ReferalConfigobj = ReferalConfig
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_REFERRAL_CONFIG'
      )({ message: 'SUCCESS', referaldata: ReferalConfigobj })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static referralProcess = async (userreferalcode, refereeId, userType, creditType) => {
    const resObj = {
      success: true,
      message: 'Referal Reward Added'
    }
    try {
      if (userType == Enum.ROLES.PARTNER && ReferalConfig.PARTNER.isEnable) {
        let shareType = Enum.ROLES.PARTNER
        let userData = await Partner.findOne({ uniCode: userreferalcode }).exec()
        if (!userData) {
          userData = await Customer.findOne({ uniCode: userreferalcode }).exec()
          shareType = Enum.ROLES.CUSTOMER
        }
        const referalAmt = ReferalConfig.PARTNER.referalAmount
        const refererAmt = ReferalConfig.PARTNER.refererAmount
        const trxObj = {
          userType: userType,
          userId: userData._id,
          referralType: Enum.REFERRALTYPES.BYREFERRED,
          amt: Number(referalAmt),
          refereeId: refereeId,
          shareType: shareType,
          creditType: creditType
        }
        const reportObj = {
          userType: userType,
          userId: userData._id,
          amt: Number(referalAmt),
          referralType: Enum.REFERRALTYPES.BYREFERRED,
          shareType: shareType
        }
        if (referalAmt) {
          const reportId = await this.addReferralreport(reportObj)
          trxObj.reportId = reportId
          if (shareType == Enum.ROLES.PARTNER) trxObj.userType = Enum.ROLES.PARTNER
          else if (shareType == Enum.ROLES.CUSTOMER) trxObj.userType = Enum.ROLES.CUSTOMER
          await this.addWallettransactions(trxObj)
        }
        if (refererAmt) {
          reportObj.userId = refereeId
          reportObj.referralType = Enum.REFERRALTYPES.BYUSING
          reportObj.shareType = Enum.ROLES.PARTNER
          const reportId = await this.addReferralreport(reportObj)
          trxObj.userId = refereeId
          trxObj.reportId = reportId
          trxObj.referralType = Enum.REFERRALTYPES.BYUSING
          trxObj.refereeId = userData._id
          if (
            (shareType == Enum.ROLES.PARTNER && userType == Enum.ROLES.CUSTOMER) ||
            (shareType == Enum.ROLES.CUSTOMER && userType == Enum.ROLES.PARTNER) ||
            (userType == Enum.ROLES.PARTNER && shareType == Enum.ROLES.CUSTOMER) ||
            (userType == Enum.ROLES.CUSTOMER && shareType == Enum.ROLES.PARTNER)
          ) {
            if (shareType == Enum.ROLES.PARTNER) trxObj.userType = Enum.ROLES.CUSTOMER
            else if (shareType == Enum.ROLES.CUSTOMER) trxObj.userType = Enum.ROLES.PARTNER
          } else {
            trxObj.userType = userType
            trxObj.shareType = shareType
            trxObj.amt = Number(refererAmt)
          }
          await this.addWallettransactions(trxObj)
        }
      } else if (userType == Enum.ROLES.CUSTOMER && ReferalConfig.CUSTOMER.isEnable) {
        let shareType = Enum.ROLES.CUSTOMER
        let userData = await Customer.findOne({ uniCode: userreferalcode })
        if (!userData) {
          userData = await Partner.findOne({ uniCode: userreferalcode }).exec()
          shareType = Enum.ROLES.PARTNER
        }
        const referalAmt = ReferalConfig.CUSTOMER.referalAmount
        const refererAmt = ReferalConfig.CUSTOMER.refererAmount

        const trxObj = {
          userType: userType,
          userId: userData._id,
          referralType: Enum.REFERRALTYPES.BYREFERRED,
          amt: Number(referalAmt),
          refereeId: refereeId,
          shareType: shareType,
          creditType: creditType
        }
        const reportObj = {
          userType: userType,
          userId: userData._id,
          amt: Number(referalAmt),
          referralType: Enum.REFERRALTYPES.BYREFERRED,
          shareType: shareType
        }
        if (referalAmt) {
          const reportId = await this.addReferralreport(reportObj)
          trxObj.reportId = reportId
          if (shareType == Enum.ROLES.PARTNER) trxObj.userType = Enum.ROLES.PARTNER
          else if (shareType == Enum.ROLES.CUSTOMER) trxObj.userType = Enum.ROLES.CUSTOMER
          await this.addWallettransactions(trxObj)
        }
        if (refererAmt) {
          reportObj.userId = refereeId
          reportObj.referralType = Enum.REFERRALTYPES.BYUSING
          reportObj.shareType = Enum.ROLES.CUSTOMER
          const reportId = await this.addReferralreport(reportObj)
          trxObj.userId = refereeId
          trxObj.reportId = reportId
          trxObj.referralType = Enum.REFERRALTYPES.BYUSING
          trxObj.refereeId = userData._id
          if (
            (shareType == Enum.ROLES.PARTNER && userType == Enum.ROLES.CUSTOMER) ||
            (shareType == Enum.ROLES.CUSTOMER && userType == Enum.ROLES.PARTNER) ||
            (userType == Enum.ROLES.PARTNER && shareType == Enum.ROLES.CUSTOMER) ||
            (userType == Enum.ROLES.CUSTOMER && shareType == Enum.ROLES.PARTNER)
          ) {
            if (shareType == Enum.ROLES.PARTNER) trxObj.userType = Enum.ROLES.CUSTOMER
            else if (shareType == Enum.ROLES.CUSTOMER) trxObj.userType = Enum.ROLES.PARTNER
          } else {
            trxObj.userType = userType
            trxObj.shareType = shareType
            trxObj.amt = Number(refererAmt)
          }
          await this.addWallettransactions(trxObj)
        }
      }
      return resObj
    } catch (error) {
      console.log('err', error)
    }
  }

  static addReferralreport = (ObjData) => {
    return new Promise((resolve, reject) => {
      this.checkexistData(ObjData)
        .then(async (existData) => {
          if (existData) {
            const totaltamt = (Number(existData.balance) + Number(ObjData.amt)).toFixed()
            existData.balance = totaltamt

            if (ObjData.referralType === Enum.REFERRALTYPES.BYREFERRED) {
              existData.referralCount += 1
            } else {
              existData.referedCount += 1
            }

            await existData.save()
            resolve(existData._id)
          } else {
            let referedCount = 0
            let referralCount = 0

            if (ObjData.referralType === Enum.REFERRALTYPES.BYREFERRED) {
              referralCount = 1
            } else {
              referedCount = 1
            }

            const newData = new referralReport({
              userId: ObjData.userId,
              userType: ObjData.shareType,
              balance: Number(ObjData.amt),
              referralCount,
              referedCount
            })

            newData.save((err, docs) => {
              if (err) {
                console.log('err', err)
                reject(err)
              }
              resolve(docs._id)
            })
          }
        })
        .catch(reject) // Handle errors from checkexistData
    })
  }

  static addWallettransactions = async (trxData) => {
    const newObj = {
      reportId: trxData.reportId,
      reportType: trxData.referralType,
      referrerId: trxData.userId,
      referrerType: trxData.userType,
      refereeId: trxData.refereeId,
      refereeType: trxData.shareType,
      amount: trxData.amt,
      type: trxData.creditType
    }
    const newData = new referalTransactions(newObj)
    const newDoc = await newData.save()
    const updateData = {
      lastTransaction: newDoc._id
    }
    await referralReport.findOneAndUpdate({ userId: trxData.userId, userType: trxData.userType }, updateData)
    if (ReferalConfig.AutoupdateinWallet) {
      const transactionData = {
        referenceId: '',
        description: 'REFERRAL_PAYMENT',
        paymentMode: Enum.PAYMENT.MODE.CREDIT,
        userId: trxData.userId,
        userType: trxData.userType,
        serviceArea: null,
        amount: Number(trxData.amt),
        module: Enum.PAYMENT.MODULES.REFERRAL
      }
      const transferAmountToPartner = await PaymentServices.merchantTransaction(transactionData)
      if (!transferAmountToPartner.status) {
        throw new Error(transferAmountToPartner.message)
      }
    }
  }
  static getReferralreport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = Number(queryData.limit)
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0
      const queryObject = {
        ...(queryData['userType'] && { userType: queryData['userType'] }),
        ...(queryData['referralCount'] && { referralCount: { $eq: Number(queryData['referralCount']) } }),
        ...(queryData['referedCount'] && { referedCount: { $eq: Number(queryData['referedCount']) } }),
        ...(queryData['balance'] && { balance: { $eq: Number(queryData['balance']) } })
      }
      const pipeline = [
        {
          $match: queryObject
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'userId',
            foreignField: '_id',
            as: 'customerData'
          }
        },
        {
          $lookup: {
            from: 'partners',
            localField: 'userId',
            foreignField: '_id',
            as: 'partnerData'
          }
        },
        {
          $addFields: {
            userDetails: {
              $cond: {
                if: { $eq: ['$userType', 'CUSTOMER'] },
                then: { $arrayElemAt: ['$customerData', 0] },
                else: { $arrayElemAt: ['$partnerData', 0] }
              }
            }
          }
        }
      ]
      if (queryData['userDetails.uniCode'] || queryData['userDetails.fname']) {
        pipeline.push({
          $match: {
            $or: [
              {
                'userDetails.uniCode': queryData['userDetails.uniCode']
                  ? queryData['userDetails.uniCode']
                  : ''
              },
              { 'userDetails.fname': queryData['userDetails.fname'] ? queryData['userDetails.fname'] : '' }
            ]
          }
        })
      }
      pipeline.push({
        $project: {
          userId: 1,
          userType: 1,
          balance: 1,
          referralCount: 1,
          referedCount: 1,
          createdAt: 1,
          updatedAt: 1,
          'userDetails.uniCode': 1,
          'userDetails.fname': 1
        }
      })
      const getDataCount = await referralReport.aggregate(pipeline).count('totalCount').exec()
      const referralData = await referralReport.aggregate(pipeline).skip(skip).limit(perPage).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'REFERRAL_REPORT'
      )({ message: 'REFERRAL|REPORT', referralData, totalCount: getDataCount })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }
  static getReferraltrxReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = Number(queryData.limit)
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0
      const pipeline = [
        {
          $match: {
            $or: [
              { referrerId: mongoose.Types.ObjectId(queryData.userId) },
              { refereeId: mongoose.Types.ObjectId(queryData.userId) }
            ]
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'referrerId',
            foreignField: '_id',
            as: 'referrerCustomer'
          }
        },
        {
          $lookup: {
            from: 'partners',
            localField: 'referrerId',
            foreignField: '_id',
            as: 'referrerPartner'
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'refereeId',
            foreignField: '_id',
            as: 'refereeCustomer'
          }
        },
        {
          $lookup: {
            from: 'partners',
            localField: 'refereeId',
            foreignField: '_id',
            as: 'refereePartner'
          }
        },
        {
          $addFields: {
            referrerDetails: {
              $cond: {
                if: { $eq: ['$referrerType', 'CUSTOMER'] },
                then: { $arrayElemAt: ['$referrerCustomer', 0] },
                else: { $arrayElemAt: ['$referrerPartner', 0] }
              }
            },
            refereeDetails: {
              $cond: {
                if: { $eq: ['$refereeType', 'CUSTOMER'] },
                then: { $arrayElemAt: ['$refereeCustomer', 0] },
                else: { $arrayElemAt: ['$refereePartner', 0] }
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            referrerId: 1,
            referrerType: 1,
            refereeId: 1,
            refereeType: 1,
            amount: 1,
            type: 1,
            reportId: 1,
            referrerDetails: {
              fname: '$referrerDetails.fname',
              uniCode: '$referrerDetails.uniCode'
            },
            refereeDetails: {
              fname: '$referrerDetails.fname',
              uniCode: '$refereeDetails.uniCode'
            }
          }
        }
      ]
      const getDataCount = await referalTransactions
        .find({
          $or: [
            { referrerId: mongoose.Types.ObjectId(queryData.userId) },
            { refereeId: mongoose.Types.ObjectId(queryData.userId) }
          ]
        })
        .count()
      const referralTrxData = await referalTransactions.aggregate(pipeline).skip(skip).limit(perPage).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'REFERRAL_TRX_REPORT'
      )({ message: 'REFERRAL|TRX_REPORT', referralTrxData, totalCount: getDataCount })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static checkexistData = async (ObjData) => {
    let existData
    const userDatawithuserType = await referralReport.findOne({
      userId: mongoose.Types.ObjectId(ObjData.userId),
      userType: ObjData.userType
    })
    existData = userDatawithuserType
    if (!existData) {
      const userDatawithshareType = await referralReport.findOne({
        userId: mongoose.Types.ObjectId(ObjData.userId),
        userType: ObjData.shareType
      })
      existData = userDatawithshareType
    }
    if (!existData) {
      const refereeDatawithuserType = await referralReport.findOne({
        userId: mongoose.Types.ObjectId(ObjData.refereeId),
        userType: ObjData.userType
      })
      existData = refereeDatawithuserType
    }
    if (!existData) {
      const refereeDatawithshareType = await referralReport.findOne({
        userId: mongoose.Types.ObjectId(ObjData.refereeId),
        userType: ObjData.userType
      })
      existData = refereeDatawithshareType
    }
    console.log('existData----', existData)
    return existData
  }
}

export { ReferralController }
