/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { Worker } from 'worker_threads'
import { BaseController } from '../../controllers/BaseController.js'

import Partner from './../../models/Auth/Partner.js'
import Customer from './../../models/Auth/Customer.js'

import Transaction from './models/Transaction.js'
import Merchant from './models/Merchant.js'

import { PaymentServices } from './PaymentService.js'
import { PaymentValidator } from '../../validators/Module/PaymentValidator.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { Enum } from '../../utils/Enum.js'

import { QueryBuilder } from '../../helpers/QueryBuilder.js'
import { PaymentConfig } from '../../config/PaymentConfig.js'
import { ConfigService } from '../../services/ConfigService.js'
import { PayoutConfig } from './PayoutConfig.js'
import { permissions } from '../../config/Permissions.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class PaymentController extends BaseController {
  constructor() {
    super()
  }

  static getConfig = async (req, res) => {
    try {
      const gateway = PaymentConfig.gateway
      const enabledGateway = gateway.filter(function (e) {
        return e.status === true
      })
      return requestHandler.sendSuccess(req, res, 'GET_PAYMENTCONFIG')({ enabledGateway: enabledGateway })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateConfig = async (req, res) => {
    try {
      const gateway = [...PaymentConfig.gateway]
      const givenGateway = req.body.paymentGateway

      console.log(gateway, 'gateway')
      const givenGatewayIndex = gateway.findIndex((data) => data.indexName == givenGateway)
      if (givenGatewayIndex == -1) throw new Error('GATEWAY|NOT_FOUND')
      const gatewayFields = gateway[givenGatewayIndex].fields
      for (const field of gatewayFields) {
        if (req.body.hasOwnProperty(field.indexName)) {
          field.value = req.body[field.indexName]
        }
      }
      gateway[givenGatewayIndex].fields = gatewayFields

      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/PaymentConfig.js`
      const fileContent = `
    /* ************************
    * Copyright 2023
    * ABSERVETECH
    ************************ */
   const PaymentConfig = ${JSON.stringify(
     {
       gateway: gateway
     },
     null,
     2
   )};\nexport { PaymentConfig };`

      fs.writeFileSync(filePath, fileContent)
      const installation = ConfigService.getInstallationFields()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({ message: 'CREATED', gateway: gateway, installation })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static activegateway = async (req, res) => {
    try {
      const gateway = [...PaymentConfig.gateway]
      const givenGateway = req.body.paymentGateway
      const gatewayStatus = req.body.status

      gateway.findIndex((data) => {
        if (data.indexName == givenGateway) {
          data.isActive = gatewayStatus
          return true // Indicate that the condition is met
        } else {
          data.isActive = false
          return false // Indicate that the condition is not met
        }
      })

      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/PaymentConfig.js`
      const fileContent = `/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const PaymentConfig = ${JSON.stringify(
        {
          gateway: gateway
        },
        null,
        2
      )};
export { PaymentConfig }`
      await fs.writeFileSync(filePath, fileContent)

      return requestHandler.sendSuccess(
        req,
        res,
        'GATEWAY_ACTIVE'
      )({ message: 'ACTIVATED', gateway: gateway })
    } catch (error) {
      console.log(error, 'error')
      return requestHandler.sendError(
        req,
        res,
        'GATEWAY_ERROR'
      )({ message: 'Error activating gateway', error: error.message })
    }
  }

  static updatePayoutconfig = async (req, res) => {
    try {
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/Payment/PayoutConfig.js`
      const fileContent = `
    /* ************************
    * Copyright 2023
    * ABSERVETECH
    ************************ */
   const PayoutConfig = ${JSON.stringify(req.body)};\n
   export { PayoutConfig };`
      const permissionData = permissions
      if (req.body.isEnable == false) {
        permissionData.menusList.forEach((menu) => {
          if (menu.module === 'partnerPayment') {
            menu.subMenuList = menu.subMenuList.filter((sub) => sub.module !== 'payoutTransaction')
          }
        })
      } else {
        permissions.menusList.forEach((menu) => {
          if (menu.module === 'partnerPayment') {
            const alreadyExists = menu.subMenuList.some((sub) => sub.module === 'payoutTransaction')

            if (!alreadyExists) {
              menu.subMenuList.push({
                menu: 'Payout Transaction',
                status: false,
                subMenu: false,
                module: 'payoutTransaction',
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
      )({ message: 'CREATED', PayoutConfig: req.body })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPayoutconfig = async (req, res) => {
    try {
      return requestHandler.sendSuccess(req, res, 'GET_PAYOUTCONFIG')({ PayoutConfig })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getTransaction = async (req, res) => {
    try {
      const queryData = req.query
      const validation = await PaymentValidator.validateData(queryData, 'getMyTransaction')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const paramData = req.params
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObj = {
        deletedAt: null
      }
      const merchantQuery = {
        $or: [
          { _id: mongoose.Types.ObjectId(paramData.merchantId) },
          { userId: mongoose.Types.ObjectId(paramData.merchantId) }
        ]
      }
      const merchantData = await Merchant.findOne(merchantQuery)
      if (merchantData) queryObj['userId'] = merchantData.userId

      const queryBuilder = await QueryBuilder.getSearchable(Transaction, queryData)
      queryObj = { ...queryObj, ...queryBuilder.queryObject }

      if (queryData.amount) {
        const amountStr = queryData.amount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        queryObj.$expr = {
          $regexMatch: {
            input: { $toString: '$amount' },
            regex: `^${amountStr}`, // starts with partial amount
            options: 'i'
          }
        }
      }

      if (queryData.balance) {
        const balanceStr = queryData.balance.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        queryObj.$expr = {
          $regexMatch: {
            input: { $toString: '$balance' },
            regex: `^${balanceStr}`, // starts with partial amount
            options: 'i'
          }
        }
      }

      if (paramData.transactionId) {
        queryObj._id = mongoose.Types.ObjectId(paramData.transactionId)
      }
      const transactionCount = await Transaction.find(queryObj, {}).count().exec()

      const transactionList = await Transaction.find(queryObj, {}).skip(skip).limit(perPage).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_TRANSACTION'
      )({ message: 'LISTED|TRANSACTION', transaction: transactionList, total: transactionCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getMerchant = async (req, res) => {
    try {
      const queryData = req.query
      // const authData = req.auth || {}
      const validation = await PaymentValidator.validateData(queryData, 'getMerchant')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0
      if (!queryData.userType) queryData.userType = Enum.ROLES.PARTNER
      let queryObject = { deletedAt: null }

      const queryBuilder = await QueryBuilder.getSearchable(Merchant, queryData)
      queryObject = { ...queryObject, ...queryBuilder.queryObject }

      if (queryData.balance) {
        const Balance = queryData.balance.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        queryObject.$expr = {
          $regexMatch: {
            input: { $toString: '$balance' },
            regex: Balance,
            options: 'i'
          }
        }
      }
      if (queryData.userId) {
        queryObject.userId = mongoose.Types.ObjectId(queryData.userId)
      }

      let userPipeline = []
      if (queryData.userType == Enum.ROLES.PARTNER) {
        const partnerMatchExpr = [{ $eq: ['$_id', '$$userId'] }]
        userPipeline = [
          {
            $lookup: {
              from: 'partners',
              let: { userId: '$userId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: partnerMatchExpr
                    }
                  }
                },
                {
                  $project: {
                    uniCode: 1,
                    fname: 1,
                    lname: 1
                  }
                }
              ],
              as: 'userData'
            }
          },
          {
            $unwind: '$userData'
          }
        ]
      } else if (queryData.userType == Enum.ROLES.CUSTOMER) {
        userPipeline = [
          {
            $lookup: {
              from: 'customers',
              let: { userId: '$userId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$_id', '$$userId']
                    }
                  }
                },
                {
                  $project: {
                    uniCode: 1,
                    fname: 1,
                    lname: 1
                  }
                }
              ],
              as: 'userData'
            }
          },
          {
            $unwind: '$userData'
          }
        ]
      }

      const userQuery = {}
      if (queryData['userData.uniCode']) {
        userQuery['userData.uniCode'] = { $regex: queryData['userData.uniCode'], $options: 'i' }
      }
      const merchantPipeline = [
        {
          $match: queryObject
        },
        ...userPipeline,
        { $match: userQuery },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $sort: { _id: -1 } },
              { $skip: Number(skip) || 0 },
              { $limit: Number(perPage) || 10 },
              {
                $project: {
                  transactions: 0,
                  payoutMethods: 0,
                  paymentMethods: 0
                }
              }
            ]
          }
        }
      ]
      const findMerchants = await Merchant.aggregate(merchantPipeline).exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_MERCHANT'
      )({
        message: 'LISTED|MEMBER ACCOUNT',
        transaction: findMerchants[0]?.data,
        total: findMerchants[0]?.metadata[0]?.total
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addMerchant = async (req, res) => {
    try {
      const bodyData = req.body
      const validation = await PaymentValidator.validateData(bodyData, 'addMerchant')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const merchantData = await PaymentServices.addMerchant(bodyData)
      return requestHandler.sendSuccess(
        req,
        res,
        'ADD_MERCHANT'
      )({
        message: 'ADDED|MEMBER ACCOUNT',
        merchant: merchantData
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getMyAccount = async (req, res) => {
    try {
      const userId = req.auth.userId
      const queryObj = { deletedAt: null }
      queryObj.userId = mongoose.Types.ObjectId(userId)
      const merchantList = await Merchant.findOne(queryObj, { transactions: 0 }).lean().exec()
      if (!merchantList) throw new Error('ACCOUNT_NOT_EXISTS')
      const balance = Number(merchantList.balance.toFixed(2))
      merchantList.balance = balance
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_MY_ACCOUNT'
      )({
        message: 'LISTED|MY ACCOUNT',
        account: merchantList
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addMerchantTransaction = async (req, res) => {
    try {
      const bodyData = req.body
      bodyData.mode = bodyData.mode.toUpperCase()
      const validation = await PaymentValidator.validateData(bodyData, 'addMerchant')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      let userData = null
      const userId = mongoose.Types.ObjectId(bodyData.userId)
      if (bodyData.userType == Enum.ROLES.PARTNER)
        userData = await Partner.findOne({ _id: userId }).lean().exec()
      else if (bodyData.userType == Enum.ROLES.CUSTOMER)
        userData = await Customer.findOne({ _id: userId }).lean().exec()

      if (!userData) throw new Error('NOT_FOUND|USER')

      const merchant = await Merchant.findOne({ userId: userId }, { transactions: 0 }).exec()

      let balance = merchant.balance || 0
      if (bodyData.mode == Enum.PAYMENT.MODE.CREDIT) balance = balance + Number(bodyData.amount)
      else balance = balance - Number(bodyData.amount)

      const memberTransaction = {
        userId: userId,
        userType: bodyData.userType,
        module: bodyData.module,
        referenceId: bodyData.referenceId,
        description: bodyData.description,
        paymentMode: bodyData.mode,
        amount: bodyData.amount,
        balance: balance
      }

      const updateTrnasaction = await PaymentServices.merchantTransaction(memberTransaction)
      // const updateTrnasaction = await Merchant.updateOne(
      //   { userId: userId },
      //   { $push: { transactions: memberTransaction } }
      // )
      if (!updateTrnasaction) throw new Error('TRANSACTION_NOT_ADDED')

      await Merchant.updateOne({ userId: userId }, { balance: balance })

      return requestHandler.sendSuccess(
        req,
        res,
        'ADD_MERCHANT'
      )({
        message: 'ADDED|MEMBER TRANSACTION'
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getMyTransaction = async (req, res) => {
    try {
      const userId = req.auth.userId
      const queryData = req.query
      console.log('queryData', queryData)

      const validation = await PaymentValidator.validateData(queryData, 'getMyTransaction')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = { deletedAt: null }

      let dayStart = null
      let dayEnd = null
      if (queryData.onYear && !queryData.onMonth) {
        dayStart = new Date(queryData.onYear, 0, 1)
        dayEnd = new Date(queryData.onYear, 11, 31, 23, 59, 59, 999)
      } else if (queryData.onMonth && queryData.onYear) {
        // dayStart = new Date(queryData.onYear, queryData.onMonth, 1)
        // dayEnd = new Date(queryData.onYear, queryData.onMonth, 31, 23, 59, 59, 999)
        dayStart = new Date(queryData.onYear, queryData.onMonth - 1, 1)
        const nextMonth = new Date(queryData.onYear, queryData.onMonth, 1)
        dayEnd = new Date(nextMonth - 1)
        dayEnd.setHours(23, 59, 59, 999)
      } else if (queryData.onMonth && !queryData.onYear) {
        throw new Error('YEAR_IS_REQUIRED')
      }
      if (dayStart && dayEnd) {
        queryObject['createdAt'] = {
          $gte: dayStart, // Start of day
          $lt: dayEnd // End of day
        }
      }
      const queryBuilder = await QueryBuilder.getSearchable(Transaction, queryData)
      queryObject = { ...queryObject, ...queryBuilder.queryObject }

      queryObject.userId = mongoose.Types.ObjectId(userId)
      const transactions = await Transaction.aggregate([
        {
          $match: queryObject
        },
        {
          $project: {
            _id: 1,
            module: 1,
            referenceId: 1,
            description: 1,
            amount: 1,
            mode: 1,
            balance: 1,
            tax: 1,
            createdAt: 1
          }
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $sort: { _id: -1 } }, { $skip: Number(skip) || 0 }, { $limit: Number(perPage) || 10 }]
          }
        }
      ]).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_MY_TRANSACTION'
      )({
        message: 'LISTED|MY TRANSACTION',
        transactions: transactions[0]?.data,
        total: transactions[0]?.metadata[0]?.total
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPaymentMethods = async (req, res) => {
    try {
      let { userId, role } = req.auth
      if (role == Enum.ROLES.ADMIN) {
        userId = req.params.id
      }
      const gateway = JSON.parse(JSON.stringify(PaymentConfig.gateway))
      const enabledGateway = gateway.filter((e) => e.status === true && e.isActive)
      const merchant = await Merchant.findOne({ userId: userId, userType: role }).lean().exec()
      const availableGateway = []
      for (const gateway of enabledGateway) {
        let filterMethods = []
        let isAvailable = false
        if (gateway.indexName != Enum.TRIP.PAYMENT_MODE.CASH || role !== Enum.ROLES.PARTNER) {
          const iconFile = gateway.fields.find((e) => e.indexName == 'icon')

          if (gateway.indexName == Enum.TRIP.PAYMENT_MODE.CASH) {
            isAvailable = true
          } else if (gateway.indexName == Enum.TRIP.PAYMENT_MODE.WALLET) {
            isAvailable = true
          }

          if (gateway.indexName !== Enum.TRIP.PAYMENT_MODE.CASH && merchant?.paymentMethods?.length > 0) {
            filterMethods = merchant.paymentMethods.filter((m) => m.module === gateway.indexName)
            if (filterMethods.length > 0) {
              isAvailable = true
            }
          }
          if (req.query.type != Enum.TRIP.PAYMENT_MODE.WALLET) {
            availableGateway.push({
              name: gateway.name,
              description: gateway.description,
              indexName: gateway.indexName,
              isAvailable: isAvailable,
              details: filterMethods,
              icon: iconFile?.value || 'public/payments/default.png'
            })
          } else {
            if (
              gateway.indexName != Enum.TRIP.PAYMENT_MODE.CASH &&
              gateway.indexName != Enum.TRIP.PAYMENT_MODE.WALLET
            ) {
              availableGateway.push({
                name: gateway.name,
                description: gateway.description,
                indexName: gateway.indexName,
                isAvailable: isAvailable,
                details: filterMethods,
                icon: iconFile?.value || 'public/payments/default.png'
              })
            }
          }
        }
      }

      return requestHandler.sendSuccess(req, res, 'GET_PAYMENTCONFIG')({ availableGateway, merchant })
    } catch (error) {
      console.error('GETPAYMENTMETHODS_ERROR', error)
      return requestHandler.sendError(req, res, error)
    }
  }
  static autopayout = async () => {
    try {
      const merchants = await Merchant.find({ userType: 'PARTNER' })
      const worker = new Worker('./modules/Payment/PayoutWorker.js', {
        workerData: {
          data: JSON.parse(JSON.stringify(merchants))
        }
      })
      worker.on('message', (stream) => {
        if (stream?.error) {
          console.log(stream.error)
        }
      })
    } catch (error) {
      console.error('error', error)
    }
  }
  static GetBalance = async (req, res) => {
    try {
      const { userId, role: userType } = req.auth
      let merchant = await Merchant.findOne({ userId: userId, userType: userType }).lean().exec()
      if (!merchant) merchant = await PaymentServices.addMerchant({ userId: userId.toString(), userType })
      else
        return requestHandler.sendSuccess(
          req,
          res,
          'BALANCE'
        )({
          message: 'BALANCE',
          balance: merchant.balance
          // minimumBalance: minimumBalance
          // transfer
        })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { PaymentController }
