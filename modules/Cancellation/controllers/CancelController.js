/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import { Helpers } from '../../../helpers/Function.js'

import fs from 'fs'
import path from 'path'
import { CancelConfig } from '../config.js'
import { Config } from '../../../config/AppConfig.js'
import moment from 'moment'
import { Enum } from '../../../utils/Enum.js'
import Cancelreport from '../models/CancelReport.js'
import { PaymentServices } from '../../Payment/PaymentService.js'
import Pricing from '../../../models/Creteria/Pricing.js'
import Customer from '../../../models/Auth/Customer.js'
import Partner from '../../../models/Auth/Partner.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class CancelController extends BaseController {
  constructor() {
    super()
  }
  static updateCancelconfig = async (req, res) => {
    try {
      const cancelObj = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/Cancellation/config.js`
      const fileContent = `
      /* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
    const CancelConfig = ${JSON.stringify(cancelObj, null, 2)} 
    export { CancelConfig }`

      await fs.writeFileSync(filePath, fileContent)
      return requestHandler.sendSuccess(req, res, 'CREATE_CANCEL_CONFIG')({ message: 'UPDATED', cancelObj })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getCancelconfig = async (req, res) => {
    try {
      return requestHandler.sendSuccess(req, res, 'GET_CANCEL_CONFIG')({ message: 'SUCCESS', CancelConfig })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static addCancelcharge = async (userId, userType, TripData) => {
    try {
      if (!CancelConfig.isEnable) return
      const now = moment().utcOffset(Config.app.utcOffset)
      const startOfDay = now.clone().startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS')
      const endOfDay = now.clone().endOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS')
      await this.cancelSteps(TripData, userId, userType, startOfDay, endOfDay)
    } catch (error) {
      console.error('Error in addCancelcharge:', error)
    }
  }

  static cancelSteps = async (TripData, userId, userType, startdate, enddate) => {
    const resObj = {
      status: false,
      message: 'No cancellation charge applied',
      error: null
    }
    const existData = await Cancelreport.findOne({
      userId: userId,
      userType: userType,
      updatedAt: { $gte: startdate, $lte: enddate }
    }).exec()
    if (existData) {
      existData.nooftripsCancelled += 1
      await existData.save()
      const checkData = await this.checklimit(existData, TripData, userId, userType)
      if (checkData.status) {
        Object.assign(resObj, checkData)
      }
    } else {
      await new Cancelreport({
        userId: userId,
        userType: userType,
        nooftripsCancelled: 1
      }).save()
    }
    return resObj
  }
  static checklimit = async (existData, TripData, userId, userType) => {
    const resObj = {
      status: false,
      message: 'No cancellation charge applied',
      error: null
    }

    const pricingData = await Pricing.findById(TripData.servicePricing, { cancelationFare: 1 })

    let charge = 0
    if (
      userType === Enum.ROLES.CUSTOMER &&
      existData.nooftripsCancelled > CancelConfig.noofCancelallowedBycustomer
    ) {
      charge = pricingData?.cancelationFare?.customer || 0
    } else if (
      userType === Enum.ROLES.PARTNER &&
      existData.nooftripsCancelled > CancelConfig.noofCancelallowedBypartner
    ) {
      charge = pricingData?.cancelationFare?.partner || 0
    }

    if (charge > 0) {
      const transactionData = {
        referenceId: '',
        description: 'CANCELLATION_CHARGE',
        paymentMode: Enum.PAYMENT.MODE.DEBIT,
        userId,
        userType,
        serviceArea: null,
        amount: charge,
        module: Enum.PAYMENT.MODULES.CANCEL
      }

      const result = await PaymentServices.merchantTransaction(transactionData)
      if (!result.status) {
        resObj.status = true
        resObj.message = 'Cancellation charge applied but failed to transfer'
        resObj.error = result.error
      }
    }

    await this.checkifuserBlocked(existData, userId, userType)
    return resObj
  }

  static checkIfUserBlocked = async (existData, userId, userType) => {
    if (!CancelConfig.idBlock?.isEnable) return

    const { CUSTOMER, PARTNER } = Enum.ROLES
    const { noofCancelallowedBycustomer, noofCancelallowedBypartner } = CancelConfig.idBlock

    const exceededLimit =
      (userType === CUSTOMER && existData.nooftripsCancelled > noofCancelallowedBycustomer) ||
      (userType === PARTNER && existData.nooftripsCancelled > noofCancelallowedBypartner)

    if (!exceededLimit) return

    const Model = userType === CUSTOMER ? Customer : Partner
    await Model.updateOne({ _id: userId }, { $set: { status: 'Blocked' } })

    existData.isBlocked = true
    existData.isblockedDate = new Date(Helpers.getISODate())
    await existData.save()
  }

  static userUnblocked = async () => {
    const blockedUsers = await Cancelreport.find({
      isBlocked: true,
      isblockedDate: { $ne: null }
    })

    if (!blockedUsers.length) return

    const allowedHours = CancelConfig.idBlock.noOfdays / (1000 * 60 * 60)

    for (const user of blockedUsers) {
      const hoursDiff = this.diffHours(new Date(user.isblockedDate), new Date(Helpers.getISODate()))
      if (hoursDiff >= allowedHours) {
        const Model = user.userType === Enum.ROLES.CUSTOMER ? Customer : Partner
        await Model.updateOne({ _id: user.userId }, { $set: { status: 'Active' } })
        await Cancelreport.updateOne({ _id: user._id }, { $set: { isBlocked: false, isblockedDate: null } })
      }
    }
  }

  static diffHours = (startDate, endDate) => {
    const diffMs = endDate - startDate
    return Math.abs(Math.round(diffMs / (1000 * 60 * 60)))
  }
}

export { CancelController }
