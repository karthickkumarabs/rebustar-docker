/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { PaystackService } from '../services/PaystackService.js'
import { RequestHandler } from '../../../../utils/RequestHandler.js'
import { BaseController } from '../../../../controllers/BaseController.js'

import { Logger } from '../../../../utils/Logger.js'
import Merchant from '../../models/Merchant.js'
import { PaymentServices } from '../../PaymentService.js'
import { Enum } from '../../../../utils/Enum.js'
import { PayoutConfig } from '../../PayoutConfig.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class PaystackController extends BaseController {
  constructor() {
    super()
  }

  // Start Payment
  static startPayment = async (req, res) => {
    try {
      const { userId, role } = req.auth
      const { email, amount } = req.body
      const Obj = {
        userId: userId,
        role: role,
        type: 'add'
      }
      await this.checkAndaddMerchant(Obj)
      await PaymentServices.getActive('PAYSTACK')
      const response = await PaystackService.initializeTransaction({ email, amount })
      return requestHandler.sendSuccess(
        req,
        res,
        'PAYMENT_INITIALIZED'
      )({
        message: 'Payment Initialized',
        data: response.data.data
      })
    } catch (err) {
      return requestHandler.sendError(req, res, err.response?.data || err.message)
    }
  }

  //  Verify Payment
  static verifyPayment = async (req, res) => {
    try {
      const { reference } = req.params
      const { userId, role, email } = req.auth
      const Obj = {
        userId: userId,
        role: role,
        type: 'add'
      }
      const merchant = await this.checkAndaddMerchant(Obj)
      const description = 'Merchant ' + merchant._id
      const response = await PaystackService.verifyTransaction(reference)
      const updateDetails = {
        referenceId: response.data.data.authorization.authorization_code,
        module: 'PAYSTACK',
        description: description,
        details: {
          card: req.params.cardNumber || 'XXXX',
          email: email
        }
      }
      const Data = await PaymentServices.updateMerchantPaymentMethods({
        merchantId: merchant._id,
        updateDetails
      })
      return requestHandler.sendSuccess(
        req,
        res,
        'PAYMENT_VERIFIED'
      )({
        message: 'Payment Verified',
        paymentmethodid: Data.paymentMethods._id
      })
    } catch (err) {
      return requestHandler.sendError(req, res, err.response?.data || err.message)
    }
  }

  // Add Bank Account (Transfer Recipient)
  static addBankaccount = async (req, res) => {
    try {
      const { name, accountNumber, bankCode } = req.body
      let { userId, role: userType } = req.auth
      const bodyData = req.body
      if (userType == Enum.ROLES.ADMIN) {
        userId = bodyData.userId
        userType = Enum.ROLES.PARTNER
      }
      const Obj = {
        userId: userId,
        role: userType,
        type: 'add'
      }
      const merchant = await this.checkAndaddMerchant(Obj)
      const existIndex = merchant.payoutMethods?.findIndex(
        (e) => e.module == 'PAYSTACK' && e.deletedAt == null
      )
      let connectId = null
      if (existIndex == -1) {
        const connectAccount = await PaystackService.createTransferrecipient(name, accountNumber, bankCode)
        console.log('connectAccount.data.data.recipient_code', connectAccount.data.data.recipient_code)

        const updateDetails = {
          referenceId: connectAccount.data.data.recipient_code,
          module: 'PAYSTACK',
          description: '',
          details: {}
        }
        await PaymentServices.updateMerchantPayoutMethods({
          merchantId: merchant._id,
          updateDetails
        })
        connectId = connectAccount.data.data.recipient_code
      } else {
        connectId = merchant.payoutMethods[existIndex].referenceId
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'BANK_ACCOUNT_ADDED'
      )({
        message: 'Bank Account Added',
        data: connectId
      })
    } catch (err) {
      return requestHandler.sendError(req, res, err.response?.data || err.message)
    }
  }

  // Fetch Bank Account
  static getBankAccount = async (req, res) => {
    try {
      const response = await PaystackService.gettransferRecipient(req.params.referenceId)
      return requestHandler.sendSuccess(
        req,
        res,
        'BANK_DETAILS'
      )({
        message: 'Bank Details Showing successfully',
        data: response.data.data
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error.response?.data || error.message)
    }
  }

  // Update Bank Account

  static updateBankaccount = async (req, res) => {
    try {
      const { recipientcode, name, accountNumber, bankCode } = req.body
      let { userId, role: userType } = req.auth
      const bodyData = req.body
      if (userType == Enum.ROLES.ADMIN) {
        userId = bodyData.userId
        userType = Enum.ROLES.PARTNER
      }
      const Obj = {
        userId: userId,
        role: userType,
        type: 'check'
      }
      const merchant = await this.checkAndaddMerchant(Obj)
      const deleteResponse = await PaystackService.removeTransferrecipient(recipientcode)
      if (deleteResponse.data.status) {
        const connectAccount = await PaystackService.createTransferrecipient(name, accountNumber, bankCode)
        let connectId = null
        const updateDetails = {
          referenceId: connectAccount.data.data.recipient_code,
          module: 'PAYSTACK',
          description: '',
          details: {}
        }
        await PaymentServices.updateMerchantPayoutMethods({
          merchantId: merchant._id,
          updateDetails
        })
        connectId = connectAccount.data.data.recipient_code
        return requestHandler.sendSuccess(
          req,
          res,
          'BANK_ACCOUNT_UPDATED'
        )({
          message: 'Bank Account Updated',
          data: connectId
        })
      } else {
        throw new Error('ACCOUNT NOT UPDATED')
      }
    } catch (err) {
      return requestHandler.sendError(req, res, err.response?.data || err.message)
    }
  }

  //  Make a Payout with Send OTP  (Transfer Money)
  static initiatePayout = async (req, res) => {
    try {
      const { amount, recipientCode, reason } = req.body

      let { userId, role: userType } = req.auth
      const bodyData = req.body
      if (userType == Enum.ROLES.ADMIN) {
        userId = bodyData.userId
        userType = Enum.ROLES.PARTNER
      }
      const Obj = {
        userId: userId,
        role: userType,
        type: 'check'
      }
      const merchant = await this.checkAndaddMerchant(Obj)
      if (PayoutConfig.isEnable == false) throw new Error('PAYOUT_NOT_ENABLE')
      const existIndex = merchant.payoutMethods?.findIndex(
        (e) => e.module == 'PAYSTACK' && e.deletedAt == null
      )
      if (existIndex == -1) throw new Error('PLEASE_CONNECT_YOUR_ACCOUNT')
      const payoutObj = {
        amount: Number(amount) * 100,
        recipientCode: recipientCode,
        reason: reason
      }
      const transfer = await PaystackService.initiateTransfer(payoutObj)
      return requestHandler.sendSuccess(
        req,
        res,
        'INITIATE_SUCCESSFUL'
      )({
        message: 'Initate Successful',
        data: transfer.data
      })
    } catch (err) {
      return requestHandler.sendError(req, res, err.response?.data || err.message)
    }
  }

  //  Make a Payout with verify OTP  (Transfer Money)
  static transferPayoutAmout = async (req, res) => {
    try {
      const { initiateId, OTP, amount, recipientCode, reason } = req.body

      let { userId, role: userType } = req.auth
      const bodyData = req.body
      if (userType == Enum.ROLES.ADMIN) {
        userId = bodyData.userId
        userType = Enum.ROLES.PARTNER
      }
      const Obj = {
        userId: userId,
        role: userType,
        type: 'check'
      }
      const merchant = await this.checkAndaddMerchant(Obj)
      if (PayoutConfig.isEnable == false) throw new Error('PAYOUT_NOT_ENABLE')
      const existIndex = merchant.payoutMethods?.findIndex(
        (e) => e.module == 'PAYSTACK' && e.deletedAt == null
      )
      if (existIndex == -1) throw new Error('PLEASE_CONNECT_YOUR_ACCOUNT')
      const payoutObj = {
        amount: Number(amount) * 100,
        recipientCode: recipientCode,
        reason: reason
      }
      const response = await PaystackService.transferAmount(initiateId, OTP)
      const newBalance = Number(merchant.balance) - Number(amount) * 100
      const transaction = await PaymentServices.merchantTransaction({
        referenceId: response.data.data.id,
        userId: merchant.userId,
        userType: merchant.userType,
        mode: Enum.PAYMENT.MODE.DEBIT, // enum
        amount: payoutObj.amount,
        balance: newBalance
      })
      merchant.transactions = transaction._id
      merchant.balance = newBalance
      await merchant.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'TRANSFER_SUCCESSFUL'
      )({
        message: 'Transfer Successful',
        data: response.data
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error.response?.data || error.message)
    }
  }

  static checkAndaddMerchant = async (Obj) => {
    let merchant = await Merchant.findOne({ userId: Obj.userId, userType: Obj.role }).lean().exec()
    if (!merchant) {
      if (Obj.type == 'add') {
        merchant = await PaymentServices.addMerchant({ userId: Obj.userId.toString(), userType: Obj.role })
      } else {
        throw new Error('MERCHANT NOT FOUND')
      }
    }
    return merchant
  }
}

export { PaystackController }
