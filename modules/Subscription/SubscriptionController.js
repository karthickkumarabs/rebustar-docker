/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import i18n from 'i18n'
import moment from 'moment'

import { Logger } from '../../utils/Logger.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'
import { Helpers } from '../../helpers/Function.js'

import { BaseController } from '../../controllers/BaseController.js'

import Partner from '../../models/Auth/Partner.js'
import Package from './models/Package.js'
import PurchasePackage from './models/PurchasePackage.js'

import { PaymentServices } from '../Payment/PaymentService.js'

import { SubscriptionValidator } from '../../validators/Module/SubscriptionValidator.js'
import { Enum } from '../../utils/Enum.js'
import { Config } from '../../config/AppConfig.js'
import { SubscriptionConfig } from './config.js'
import { SettingsConfig } from '../../config/SettingsConfig.js'
import { permissions } from '../../config/Permissions.js'
import path from 'path'
import fs from 'fs'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class SubscriptionController extends BaseController {
  constructor() {
    super()
  }
  static addPackage = async (req, res) => {
    try {
      const body = req.body
      console.log(body, 'body response')
      const validation = await SubscriptionValidator.validateData(body, 'addPackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const newPackage = new Package({
        name: body.name,
        description: body.description,
        type: body.type,
        amount: parseInt(body.amount),
        validity: parseInt(body.validity) || '0',
        credits: parseInt(body.credits) || '0',
        userlimit: parseInt(body.userlimit),
        serviceArea: body.serviceArea && body.serviceArea != '' ? body.serviceArea.split(',') : [],
        newPurchaseDiscount: body.newPurchaseDiscount || 0,
        newPurchaseFreeTrips: body.newPurchaseFreeTrips || 0,
        adminCommission: body.adminCommission || 0,
        extendedValidityForNewPurchase: body.extendedValidityForNewPurchase || 0
      })
      if (req.file) newPackage.image = req.file.path
      const addPackage = await newPackage.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'ADD_PACKAGE'
      )({ message: 'CREATED|PACKAGE', package: addPackage })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPackage = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const validation = await SubscriptionValidator.validateData(queryData, 'getPackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      let queryObject = {}
      const auth = req.auth
      let userId = null
      if (auth.role == Enum.ROLES.PARTNER) userId = auth.userId
      const queryBuilder = await QueryBuilder.getSearchable(Package, queryData)
      queryObject = queryBuilder.queryObject
      queryObject.deletedAt = null

      if (paramData.packageId) queryObject['_id'] = mongoose.Types.ObjectId(paramData.packageId)
      if (queryData.userlimit && Number(queryData.userlimit))
        queryObject['userlimit'] = Number(queryData.userlimit)
      // if (queryData.type) {
      //   queryObject.type = queryData.type
      // }
      const packCount = await Package.find(queryObject, {}).count().exec()
      let packList = await Package.find(queryObject, {}).skip(skip).limit(perPage).lean()

      if (userId) {
        const partnerData = await Partner.findOne({ _id: userId })
        if (!partnerData) throw new Error('PARTNER_NOT_FOUND')
        packList = packList.map((item) => {
          if (item?.newPurchaseDiscount && !partnerData.isAnySubscriptionPurchased) {
            return { ...item, isDiscountApplicable: true }
          }
          return { ...item, isDiscountApplicable: false }
        })
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PACKAGE'
      )({ message: 'LISTED|PACKAGE', package: packList, count: packCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updatePackage = async (req, res) => {
    try {
      console.log(req.file, 'req')
      const body = req.body
      const packageId = req.params.packageId || req.query.packageId
      body.packageId = packageId

      const validation = await SubscriptionValidator.validateData(body, 'updatePackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const packages = await Package.findById(packageId).exec()

      packages.name = body.name || packages.name
      packages.description = body.description || packages.description
      packages.type = body.type || packages.type

      // if (packages.type != Enum.PACKAGE.TYPE.SUBSCRIPTION)
      //   packages.amount = parseInt(body.amount) || packages.amount
      // else packages.amount = 0

      packages.newPurchaseDiscount = parseInt(body.newPurchaseDiscount) || packages.newPurchaseDiscount
      packages.newPurchaseFreeTrips = parseInt(body.newPurchaseFreeTrips) || packages.newPurchaseFreeTrips
      packages.adminCommission = parseInt(body.adminCommission) || packages.adminCommission
      packages.extendedValidityForNewPurchase =
        parseInt(body.extendedValidityForNewPurchase) || packages.extendedValidityForNewPurchase
      packages.validity = parseInt(body.validity) || packages.validity
      packages.credits = parseInt(body.credits) || packages.credits
      packages.userlimit = parseInt(body.userlimit) || packages.userlimit
      packages.serviceArea =
        body.serviceArea && body.serviceArea != '' ? body.serviceArea.split(',') : packages.serviceArea

      if (req.file) packages.image = req.file.path

      const updatedPackage = await packages.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_PACKAGE'
      )({ message: i18n.__('UPDATED', 'Package'), package: updatedPackage })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deletePackage = async (req, res) => {
    try {
      const body = req.body
      const packageId = req.params.packageId || req.query.packageId
      body.packageId = packageId

      const validation = await SubscriptionValidator.validateData(body, 'deletePackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const packageData = await Package.findOne({ _id: [packageId] }).exec()
      if (!packageData) throw new Error('PACKAGE_NOT_FOUND')

      const deletePackage = await Package.findByIdAndUpdate(
        { _id: mongoose.Types.ObjectId(packageId) },
        { deletedAt: new Date() }
      )

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_PACKAGE'
      )({ message: 'DELETED|PACKAGE', package: deletePackage })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addPurchasePackage = async (req, res) => {
    try {
      const body = req.body
      const auth = req.auth

      let userId = null
      if (auth.role == Enum.ROLES.ADMIN) userId = body.userId
      else {
        userId = auth.userId
        body.userId = userId.toString()
      }
      if (!userId) throw new Error('UNPROCESSABLE_ENTRY')

      const validation = await SubscriptionValidator.validateData(body, 'addPurchasePackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const userData = await Partner.findOne({ _id: userId }).lean().exec()
      if (!userData) throw new Error('NO_USER_FOUND')

      const packageData = await Package.findOne({ _id: body.packageId }).lean().exec()
      if (!packageData) throw new Error('NO_PACKAGE_FOUND')

      let merchantPayment = null
      let validity = packageData.validity

      if (auth.role != Enum.ROLES.ADMIN) {
        // Check subscription options.
        if (!userData.isAnySubscriptionPurchased) {
          validity += Number(packageData.extendedValidityForNewPurchase)
        }
        merchantPayment = await PaymentServices.merchantPayment({
          userId: userId,
          userType: Enum.ROLES.PARTNER,
          referenceId: packageData._id,
          paymentMethod: body.paymentMethod,
          paymentMethodId: body.paymentMethodId, // Actual transaction id for "Razorpay" & other payment gateway used for partner payment method id
          amount: body.amount,
          currency: body.currency || Config.app.currencyCode,
          description: 'SUBSCRIPTION_' + packageData._id
        })
        if (!merchantPayment || !merchantPayment.status || !merchantPayment.data.paymentStatus)
          throw new Error(merchantPayment.message)
      }

      const newPurchasePackage = new PurchasePackage({
        userId: userId,
        packageId: packageData._id,
        packageName: packageData.name,
        type: packageData.type,
        transactionId: body.transactionId || merchantPayment?.data?.referenceId,
        transactionType: Enum.PAYMENT.MODE.CREDIT,
        paymentMethod: body.paymentMethod,
        amount: body.amount,
        validity,
        adminCommission: packageData.adminCommission,
        newPurchaseDiscount: packageData.newPurchaseDiscount, // in Rupees
        newPurchaseFreeTrips: packageData.newPurchaseFreeTrips, // trips count
        credits: packageData.credits,
        userlimit: packageData.userlimit,
        purchaseDate: body.purchaseDate || Helpers.getISODate(),
        serviceArea: userData.scId || null
      })
      const addPurchasePackage = await newPurchasePackage.save()

      // Check for package activation
      const checkActivation = await this.updatePackageStatus({
        purchasePackageId: addPurchasePackage._id,
        status: Enum.PACKAGE.STATUS.ACTIVE
      })

      // Need to call service to enable package
      // if (!userData.payment.subscriptionStatus)
      if (!checkActivation.status) throw new Error(checkActivation.message)

      return requestHandler.sendSuccess(
        req,
        res,
        'ADD_PURCHASE_PACKAGE'
      )({ message: 'CREATED|PURCHASE_PACKAGE', package: addPurchasePackage })
    } catch (error) {
      console.log('errr', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPurchasePackage = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const validation = await SubscriptionValidator.validateData(queryData, 'getPurchasePackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      let queryObject = {
        deletedAt: null
      }
      const queryBuilder = await QueryBuilder.getSearchable(PurchasePackage, queryData)
      if (queryBuilder?.queryObject?.userlimit || queryBuilder?.queryObject?.limit == 0)
        delete queryBuilder.queryObject.userlimit
      queryObject = { ...queryObject, ...queryBuilder.queryObject }

      if (req.auth.role == Enum.ROLES.ADMIN) {
        queryObject.userId = mongoose.Types.ObjectId(queryData.userId)
      } else if (req.auth.role == Enum.ROLES.PARTNER) {
        queryObject.userId = mongoose.Types.ObjectId(req.auth.userId)
        queryObject.status = Enum.PACKAGE.STATUS.ACTIVE
      }

      if (paramData.purchasePackageId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.purchasePackageId)
      }

      const packCount = await PurchasePackage.find(queryObject).count().exec()
      const packList = await PurchasePackage.find(queryObject).skip(skip).limit(perPage).exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PURCHASE_PACKAGE'
      )({ message: 'LISTED|PURCHASE PACKAGE', package: packList, count: packCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deletePurchasePackage = async (req, res) => {
    try {
      const body = req.body
      const purchasePackageId = req.params.purchasePackageId || req.query.purchasePackageId
      body.purchasePackageId = purchasePackageId

      const validation = await SubscriptionValidator.validateData(body, 'deletePurchasePackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const deletePurchasePackage = await PurchasePackage.findByIdAndUpdate(
        { _id: mongoose.Types.ObjectId(purchasePackageId) },
        { deletedAt: new Date() }
      )

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_PURCHASE_PACKAGE'
      )({ message: 'DELETED|PURCHASE PACKAGE', package: deletePurchasePackage })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updatePackageStatus = async (data) => {
    const response = {
      status: false,
      message: 'UNPROCESSABLE',
      data: {}
    }
    try {
      const { purchasePackageId, /* userId = null,*/ status } = data

      const purchasePackages = await PurchasePackage.findById(purchasePackageId).exec()
      if (!purchasePackages) throw new Error('PURCHASE_NOT_FOUND')
      else if (purchasePackages.status == status) throw new Error('PACKAGE_ALREADY_IN_STATE')

      const partnerData = await Partner.findOne({ _id: purchasePackages.userId }).exec()
      if (!partnerData) throw new Error('USER_NOT_FOUND')

      if (status == Enum.PACKAGE.STATUS.ACTIVE) {
        const activePackages = await PurchasePackage.findOne({
          userId: purchasePackages.userId,
          status: Enum.PACKAGE.STATUS.ACTIVE
        }).exec()
        if (activePackages) throw new Error('ALREADY_YOU_HAVE_A_SUBSCRIPTION')
        else if (purchasePackages.status !== Enum.PACKAGE.STATUS.PENDING)
          throw new Error('PACKAGE_ALREADY_PROCESSED')
      }

      if (purchasePackages.type !== Enum.PACKAGE.TYPE.SUBSCRIPTION) throw new Error('UNSUPPORTED_PACKAGE')

      if (status == Enum.PACKAGE.STATUS.ACTIVE) {
        const startDate = new Date(Helpers.getISODate())
        const endDate = moment()
          .add(purchasePackages.validity, 'days')
          .utcOffset(Config.app.utcOffset)
          .format('YYYY-MM-DDT00:00:00.000[Z]')
        // if (purchasePackages.status == true && purchasePackages.endDate >= startDate)
        //   throw new Error('YOU_ARE_NOT_ALLOWED_TO_ACTIVATE_YOUR_PACKAGE')
        console.log('JSON', JSON.stringify(partnerData))
        purchasePackages.startDate = startDate
        purchasePackages.endDate = endDate
        purchasePackages.status = status

        // partnerData['payment']['subscriptionPackage'] = purchasePackages.packageName
        // partnerData['payment']['subscriptionEndDate'] = endDate
        // partnerData['payment']['subscriptionStatus'] = true
        await Partner.updateOne(
          { _id: partnerData._id },
          {
            $set: {
              payment: {
                subscriptionPackage: purchasePackages.packageName,
                subscriptionEndDate: endDate,
                subscriptionStatus: true,
                packageId: purchasePackages._id // Active package id
              },
              isAnySubscriptionPurchased: true // Monitor purpose
            }
          }
        )
      } else {
        // purchasePackages.endDate = null
        purchasePackages.status = status

        // partnerData.payment.subscriptionPackage = ''
        // partnerData.payment.subscriptionEndDate = null
        // partnerData.payment.subscriptionStatus = false

        await Partner.updateOne(
          { _id: partnerData._id },
          {
            $set: {
              payment: {
                subscriptionPackage: '',
                subscriptionEndDate: null,
                subscriptionStatus: false
              }
            }
          }
        )
      }

      // await partnerData.save()
      const updatePurchase = await purchasePackages.save()
      response.status = true
      response.message = 'PACKAGE_UPDATED'
      response.data = {
        package: updatePurchase
      }
    } catch (error) {
      console.error('UPDATE_PACKAGE_STATUS_ERROR', error)
      response.status = false
      response.message = error.message
      response.data = {}
    }
    return response
  }

  static updatePurchasePackage = async (req, res) => {
    try {
      const body = req.body
      const response = { message: 'UPDATED|PURCHASE PACKAGE' }
      const purchasePackageId = req.params.purchasePackageId || req.query.purchasePackageId
      body.purchasePackageId = purchasePackageId

      const validation = await SubscriptionValidator.validateData(body, 'updatePurchasePackage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const updatePackage = await this.updatePackageStatus({
        purchasePackageId,
        status: body.status
      })
      if (!updatePackage.status) throw new Error(updatePackage.message)
      response['package'] = updatePackage.data.package
      return requestHandler.sendSuccess(req, res, 'UPDATE PURCHASE PACKAGE')(response)
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateConfigData = async (req, res) => {
    try {
      const body = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/Subscription/config.js`
      const fileContent = `
          /* ************************
     * Copyright 2023
     * ABSERVETECH
     ************************ */
    const SubscriptionConfig = ${JSON.stringify(body, null, 2)} 
        export { SubscriptionConfig }`
      fs.writeFileSync(filePath, fileContent)

      const subscriptionMenu = {
        menu: 'Subscription',
        status: false,
        subMenu: false,
        module: 'subscription',
        subMenuList: []
      }
      const subMenus = permissions.menusList.find((item) => item.module == 'partnerPayment')
      if (!body.isEnabled)
        subMenus.subMenuList = subMenus.subMenuList.filter((item) => item.module != 'subscription')
      else subMenus.subMenuList.push(subscriptionMenu)

      const permissionsPath = `${__dirname}/config/Permissions.js`
      const permissionsContent = `
            /* ************************
       * Copyright 2023
       * ABSERVETECH
       ************************ */
          const permissions = ${JSON.stringify(permissions, null, 2)} 
          export { permissions }`
      fs.writeFileSync(permissionsPath, permissionsContent)

      return requestHandler.sendSuccess(req, res, 'UPDATE_CONFIG')({ message: 'UPDATED', data: body })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static configData = async (req, res) => {
    try {
      const config = SubscriptionConfig
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_SUBSCRIPTION_CONFIG'
      )({ message: 'SUCCESS', data: config })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static checkAndExpiredSubscriptionStatus = async () => {
    try {
      const currentDate = new Date(Helpers.getISODate())
      const activeSubscriptionPackage = await PurchasePackage.find({
        type: Enum.PACKAGE.TYPE.SUBSCRIPTION,
        status: Enum.PACKAGE.STATUS.ACTIVE,
        endDate: { $lt: currentDate }
      })

      if (activeSubscriptionPackage.length > 0) {
        const userIds = activeSubscriptionPackage.map((item) => item.userId)
        const packageIds = activeSubscriptionPackage.map((item) => item._id)
        console.log('userIds', userIds)
        await Partner.updateMany(
          { _id: { $in: userIds } },
          {
            $set: {
              'payment.package': '',
              'payment.subscriptionStatus': false,
              'payment.subscriptionEndDate': null,
              'payment.packageId': null
            }
          },
          { new: true }
        )
        await PurchasePackage.updateMany(
          { _id: { $in: packageIds } },
          { status: Enum.PACKAGE.STATUS.INACTIVE },
          { new: true }
        )
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  static packageTypes = async (req, res) => {
    try {
      const data = [Enum.PACKAGE.TYPE.TOPUP]
      const subscriptionModule = SettingsConfig.menulist.find(
        (item) => item.value == Enum.SETTINGS.SUBSCRIPTIONSETTING
      )
      if (subscriptionModule.enabled && SubscriptionConfig.isEnabled) {
        data.push(Enum.PACKAGE.TYPE.SUBSCRIPTION)
      }
      return requestHandler.sendSuccess(req, res, 'PACKAGE_TYPES')({ message: 'SUCCESS', data: data })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }
}
export { SubscriptionController }
