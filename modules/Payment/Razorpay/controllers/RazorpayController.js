/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
// import razorpay from 'razorpay'
import { RazorpayService } from '../services/RazorpayService.js'
import { RequestHandler } from '../../../../utils/RequestHandler.js'
import { BaseController } from '../../../../controllers/BaseController.js'

import { Logger } from '../../../../utils/Logger.js'
import Merchant from '../../models/Merchant.js'
import Trip from '../../../../models/ServiceModule/Trip.js'
import { PaymentServices } from '../../PaymentService.js'
import { Enum } from '../../../../utils/Enum.js'
import { PayoutConfig } from '../../PayoutConfig.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

// const razorPayInstance = new razorpay({
//   key_id: RazorpayService.getPublicKey(),
//   key_secret: RazorpayService.getSecretKey()
// })

class RazorpayController extends BaseController {
  constructor() {
    super()
  }

  static createFundAccounts = async (req, res) => {
    try {
      console.log('-------req.body.-', req.body)
      const auth = req.auth
      const body = req.body
      const { errors, isValid } = await this.validateFundInput(body)
      console.log('isValid', isValid)
      body.name = auth.name
      if (!isValid) throw new Error(errors)
      if (body.addDataFrom == 'admin') {
        auth.name = body.holdername
        auth.userId = body._id
        auth.email = body.email
      }
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
        (e) => e.module == 'RAZORPAY' && e.deletedAt == null
      )
      console.log('existIndex', existIndex)
      let connectId = null
      if (existIndex == -1) {
        const payload = {
          name: auth.name,
          email: auth.email,
          type: 'employee'
        }
        const razorpayContact = await RazorpayService.createContact(payload)
        if (!razorpayContact || !razorpayContact.id) throw new Error('CONTACTS_NOT_FOUND')
        const connectAccount = await RazorpayService.addFundAccounts(razorpayContact, body)
        const response = connectAccount.data
        console.log('-------connectAccount.body)', response)
        const updateDetails = {
          referenceId: connectAccount.id,
          contactRefId: razorpayContact.id,
          module: 'RAZORPAY',
          description: '',
          details: {}
        }
        await PaymentServices.updateMerchantPayoutMethods({
          merchantId: merchant._id,
          updateDetails
        })
        connectId = connectAccount.id
      } else {
        connectId = merchant.payoutMethods[existIndex].referenceId
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'FUNDACCOUNT_CREATED'
      )({
        message: 'Fund Account Created',
        data: connectId
      })
    } catch (err) {
      console.log('err', err)
      return requestHandler.sendError(req, res, err.response?.data || err.message)
    }
  }

  static validateFundInput = async (data) => {
    const errors = {}
    const ifscCode = data.ifscCode ? data.ifscCode : data.ifscCode
    const regex = new RegExp(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    const datas = regex.test(ifscCode)
    if (!ifscCode || ifscCode == '' || ifscCode == undefined) {
      errors.ifsc = 'ifsc field is empty'
    }
    if (datas != true) {
      errors.ifsc = 'Invalid ifsc'
    }
    if (!data.acctNo) {
      errors.accNumber = 'accNumber field is empty'
    }
    return {
      errors,
      isValid: Object.keys(errors).length === 0
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

  static getFundAccount = async (req, res) => {
    try {
      console.log('-------req.body.-', req.body)
      const body = req.body
      const getFundAccount = await RazorpayService.getFundAccount(body.fundAccountId)
      console.log('------getFundAccount', getFundAccount)
      if (!getFundAccount || !getFundAccount.id) throw new Error('FUND_ACCOUNT_NOT_FOUND')
      return requestHandler.sendSuccess(
        req,
        res,
        'FUND_ACCOUNT_LISTED'
      )({
        message: 'Fund Account Listed Successfully',
        data: getFundAccount
      })
    } catch (err) {
      console.log('err', err)
      return requestHandler.sendError(req, res, err)
    }
  }

  static createOrder = async (req, res) => {
    try {
      console.log('-------req.body.-', req.body)
      const reqObj = {
        amount: req.body.amount * 100,
        currency: RazorpayService.getCurrency()
        // payment_capture: 1
      }
      const orderData = await RazorpayService.createOrder(reqObj)
      console.log('------orderData', orderData)
      if (!orderData || !orderData.id) throw new Error('ORDER_NOT_CREATED')
      return requestHandler.sendSuccess(
        req,
        res,
        'ORDER_CREATED_SUCCESSFULLY'
      )({
        message: 'Order Created Successfully',
        data: orderData
      })
    } catch (err) {
      console.log('err', err)
      return requestHandler.sendError(req, res, err)
    }
    // try {
    //   const params = {
    //     amount: req.body.amount * 100,
    //     currency: RazorpayService.getCurrency()
    //   }
    //   razorPayInstance.orders
    //     .create(params)
    //     .then((data) => {
    //       return requestHandler.sendSuccess(
    //         req,
    //         res,
    //         'ORDER_CREATED'
    //       )({
    //         message: 'Order Created',
    //         data: data
    //       })
    //     })
    //     .catch((error) => {
    //       return requestHandler.sendError(req, res, error)
    //     })
    // } catch (err) {
    //   console.log(err)
    //   return requestHandler.sendError(req, res, err)
    // }
  }

  //  Verify Payment
  static verifyPayment = async (req, res) => {
    try {
      const response = {
        type: 'success',
        message: 'Payment Verified',
        err: {}
      }
      const { tripId } = req.params
      const tripData = await Trip.findOne({ _id: tripId })
      if (!tripData) throw new Error('Trip Not Found')
      // const response = await RazorpayService.verifyTransaction(transactionId)
      if (
        (tripData.paymentMethod == 'RAZORPAY' || tripData.paymentMethod == 'Razorpay') &&
        tripData.paymentMethodId == ''
      )
        throw new Error('Payment Under Progress')
      if (tripData.paymentMethodChange) {
        response.message = 'Online Payment Failed, please collect cash from rider'
        response.type = 'error'
      }
      return requestHandler.sendSuccess(req, res, response.message)(response)
    } catch (err) {
      return requestHandler.sendError(req, res, err)
    }
  }

  static updateContacts = async (req, res) => {
    try {
      console.log('-------req.body.-', req.body)
      const auth = req.auth
      const body = req.body
      body.name = auth.name
      if (body.addDataFrom == 'admin') {
        auth.name = body.holdername
        auth.userId = body._id
        auth.email = body.email
      }
      const payload = {
        name: auth.name,
        email: auth.email,
        type: 'employee'
      }
      const updateContact = await RazorpayService.updateContact(body.contactId, payload)
      console.log('------updateContact', updateContact)
      if (!updateContact || !updateContact.id) throw new Error('CONTACTS_NOT_FOUND')
      return requestHandler.sendSuccess(
        req,
        res,
        'CONTACT_UPDATED'
      )({
        message: 'Contact Updated Successfully',
        data: updateContact
      })
    } catch (err) {
      console.log('err', err)
      return requestHandler.sendError(req, res, err)
    }
  }

  static deactivateContacts = async (req, res) => {
    try {
      console.log('-------req.body.-', req.body)
      const body = req.body
      const payload = {
        active: body.active
      }
      const deactivateContact = await RazorpayService.deactivateContact(body.contactId, payload)
      console.log('------deactivateContact', deactivateContact)
      if (!deactivateContact || !deactivateContact.id) throw new Error('CONTACTS_NOT_FOUND')
      return requestHandler.sendSuccess(
        req,
        res,
        'CONTACT_UPDATED'
      )({
        message: 'Contact Updated Successfully',
        data: deactivateContact
      })
    } catch (err) {
      console.log('err', err)
      return requestHandler.sendError(req, res, err)
    }
  }

  static deactivateFundAccount = async (req, res) => {
    try {
      console.log('-------req.body.-', req.body)
      const body = req.body
      const payload = {
        active: body.active
      }
      const deactivateFundAccount = await RazorpayService.deactivateFundAccount(body.fundAccountId, payload)
      console.log('------deactivateFundAccount', deactivateFundAccount)
      if (!deactivateFundAccount || !deactivateFundAccount.id) throw new Error('CONTACTS_NOT_FOUND')
      return requestHandler.sendSuccess(
        req,
        res,
        'CONTACT_UPDATED'
      )({
        message: 'Contact Updated Successfully',
        data: deactivateFundAccount
      })
    } catch (err) {
      console.log('err', err)
      return requestHandler.sendError(req, res, err.response?.data || err.message)
    }
  }

  static initiatePayout = async (req, res) => {
    try {
      const { amount } = req.body

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
        (e) => e.module == 'RAZORPAY' && e.deletedAt == null
      )
      if (existIndex == -1) throw new Error('PLEASE_CONNECT_YOUR_ACCOUNT')
      if (bodyData.amount < PayoutConfig.PayoutAmountLimitMin)
        throw new Error('TRYING_TO_PAYOUT_LESS_THAN_LIMIT')
      if (bodyData.amount > PayoutConfig.PayoutAmountLimitMax)
        throw new Error('TRYING_TO_PAYOUT_MORE_THAN_LIMIT')
      if (bodyData.amount > merchant.balance)
        throw new Error('YOU_DONT_HAVE_SUFFICENT_CREDITS_IN_YOUR_WALLET')
      const payoutObj = {
        account_number: RazorpayService.getAccountNumber(),
        amount: Number(amount) * 100,
        fund_account_id: merchant.payoutMethods[0]?.referenceId,
        currency: RazorpayService.getCurrency(),
        purpose: 'payout',
        mode: 'IMPS',
        queue_if_low_balance: true
      }
      const transfer = await RazorpayService.initiateTransfer(payoutObj, merchant)
      return requestHandler.sendSuccess(
        req,
        res,
        'INITIATE_SUCCESSFUL'
      )({
        message: 'Initate Successful',
        data: transfer
      })
    } catch (err) {
      return requestHandler.sendError(req, res, err.response?.data || err.message)
    }
  }

  static transferPayoutAmout = async (req, res) => {}
}

export { RazorpayController }
