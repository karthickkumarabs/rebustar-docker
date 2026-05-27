/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseService } from '../../services/BaseService.js'

import Customer from '../../models/Auth/Customer.js'
import Partner from '../../models/Auth/Partner.js'
import Merchant from './models/Merchant.js'

import { Enum } from '../../utils/Enum.js'
import { PaymentConfig } from '../../config/PaymentConfig.js'
import { PaymentValidator } from '../../validators/Module/PaymentValidator.js'
import { ChargeCard } from './Stripe/index.js'
import Transaction from './models/Transaction.js'
import { PaystackService } from '../Payment/Paystack/services/PaystackService.js'
import { RazorpayService } from './Razorpay/services/RazorpayService.js'

class PaymentServices extends BaseService {
  static getActive = async (gateway = null) => {
    const response = {
      status: false,
      message: 'UNPROCESSABLE',
      data: {}
    }
    try {
      const paymentConfigData = JSON.parse(JSON.stringify(PaymentConfig.gateway)) || null
      if (!paymentConfigData) throw new Error('CONTACT_ADMIN')
      const activeGatewayIndex = paymentConfigData.findIndex((m) =>
        gateway ? gateway == m.indexName : m.isActive
      )
      if (activeGatewayIndex == -1) throw new Error('PAYMENT_GATEWAY_NOT_ACTIVATED')

      const activeGateway =
        paymentConfigData[activeGatewayIndex].fields.reduce((acc, { indexName, value }) => {
          return { ...acc, [indexName]: value }
        }, {}) || null
      if (!activeGateway) throw new Error('GATEWAY_NOT_CONFIGURED')
      activeGateway['gateway'] = paymentConfigData[activeGatewayIndex].indexName
      response.status = true
      response.message = 'ACTIVE_GATEWAY'
      response.data = activeGateway
    } catch (error) {
      console.error('GET_ACTIVE_PAYMENT', error)
      response.status = false
      response.message = error.message
      response.data = {}
    }
    return response
  }

  static addMerchant = async (data) => {
    try {
      console.log('addMerchant', data)
      const validation = await PaymentValidator.validateData(data, 'addMerchant')
      console.log('ADD_MERCHANT_ERROR', JSON.stringify(validation))
      if (!validation.status) throw new Error('VALIDATION_ERROR')

      let userData = null
      const userId = mongoose.Types.ObjectId(data.userId)
      if (data.userType == Enum.ROLES.PARTNER) userData = await Partner.findOne({ _id: userId }).lean().exec()
      else if (data.userType == Enum.ROLES.CUSTOMER)
        userData = await Customer.findOne({ _id: userId }).lean().exec()

      if (!userData) throw new Error('NOT_FOUND|USER')

      const merchant = new Merchant()
      merchant.userId = data.userId
      merchant.userType = data.userType
      merchant.serviceAreaId = data.serviceAreaId || null
      const merchantData = await merchant.save()
      return merchantData
    } catch (error) {
      console.log('iam catch', error)
      throw error
    }
  }

  static updateMerchantPaymentMethods = async (data) => {
    const { merchantId, updateDetails } = data
    const merchant = await Merchant.findOne({ _id: merchantId }).lean().exec()
    if (!merchant) throw new Error('NOT_FOUND|MERCHANT')

    const findQuery = {
      _id: merchantId
    }
    let updateQuery = {}
    const findMethod = merchant?.paymentMethods?.findIndex((i) => i.module == updateDetails.module)
    if (findMethod == -1) {
      updateQuery = {
        $push: {
          paymentMethods: updateDetails
        }
      }
    } else {
      updateQuery = {
        $set: {
          'paymentMethods.$.referenceId': updateDetails.referenceId,
          'paymentMethods.$.module': updateDetails.module,
          'paymentMethods.$.description': updateDetails.description,
          'paymentMethods.$.details': updateDetails.details
        }
      }
      findQuery['paymentMethods.module'] = updateDetails.module
    }
    const updateData = await Merchant.findOneAndUpdate(findQuery, updateQuery, { new: true })

    // const updateQuery = {
    //   $setOnInsert: {
    //     'paymentMethods.$': updateDetails
    //   },
    //   $set: {
    //     // 'paymentMethods.$[elem]': updateDetails // Update existing element if it matches
    //     'paymentMethods.$[elem].referenceId': updateDetails.referenceId,
    //     'paymentMethods.$[elem].module': updateDetails.module,
    //     'paymentMethods.$[elem].description': updateDetails.description,
    //     'paymentMethods.$[elem].details': updateDetails.details
    //   }
    // }
    // const updateData = await Merchant.findOneAndUpdate(findQuery, updateQuery, {
    //   arrayFilters: [{ 'elem.module': updateDetails.module, 'elem.deletedAt': null }]
    // })

    return updateData
  }

  static deleteMerchantPaymentMethods = async (data) => {
    const { merchantId, paymentMethodId } = data
    const merchant = await Merchant.findOne({ _id: merchantId }).exec()
    if (!merchant) throw new Error('NOT_FOUND|MERCHANT')

    const findQuery = {
      _id: merchantId
    }
    const updateQuery = {
      $set: {
        'paymentMethods.$[elem].deletedAt': new Date()
      }
    }
    const updateData = await Merchant.findOneAndUpdate(findQuery, updateQuery, {
      arrayFilters: [{ 'elem._id': paymentMethodId, 'elem.deletedAt': null }]
    })

    return updateData
  }

  static updateMerchantPayoutMethods = async (data) => {
    const { merchantId, updateDetails } = data
    const merchant = await Merchant.findOne({ _id: merchantId }).lean().exec()
    if (!merchant) throw new Error('NOT_FOUND|MERCHANT')

    const findQuery = {
      _id: merchantId
    }
    let updateQuery = {}
    const findMethod = merchant?.payoutMethods?.findIndex((i) => i.module == updateDetails.module)
    if (findMethod == -1) {
      updateQuery = {
        $push: {
          payoutMethods: updateDetails
        }
      }
    } else {
      if (updateDetails.status) {
        updateQuery = {
          $set: {
            'payoutMethods.$.status': updateDetails.status
          }
        }
      } else {
        updateQuery = {
          $set: {
            'payoutMethods.$.referenceId': updateDetails.referenceId,
            'payoutMethods.$.contactRefId': updateDetails.contactRefId,
            'payoutMethods.$.module': updateDetails.module,
            'payoutMethods.$.description': updateDetails.description,
            'payoutMethods.$.status': updateDetails.status,
            'payoutMethods.$.details': updateDetails.details
          }
        }
      }
      findQuery['payoutMethods.module'] = updateDetails.module
    }
    const updateData = await Merchant.findOneAndUpdate(findQuery, updateQuery, { new: true })
    return updateData
  }

  static deleteMerchantPayoutMethods = async (data) => {
    const { merchantId, paymentMethodId } = data
    const merchant = await Merchant.findOne({ _id: merchantId }).exec()
    if (!merchant) throw new Error('NOT_FOUND|MERCHANT')

    const findQuery = {
      _id: merchantId
    }
    const updateQuery = {
      $set: {
        'payoutMethods.$[elem].deletedAt': new Date()
      }
    }
    const updateData = await Merchant.findOneAndUpdate(findQuery, updateQuery, {
      arrayFilters: [{ 'elem._id': paymentMethodId, 'elem.deletedAt': null }]
    })

    return updateData
  }

  static merchantPayment = async (data) => {
    console.log('merchantPayment', data)
    const response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_PAYMENT'
    }
    try {
      let {
        userId,
        userType,
        referenceId,
        paymentMethod,
        paymentMethodId,
        amount,
        currency,
        description = ''
      } = data
      paymentMethod = paymentMethod.toUpperCase()
      let merchant = await Merchant.findOne({ userId: userId, userType: userType }).lean().exec()
      if (!merchant) merchant = await this.addMerchant({ userId: userId.toString(), userType: userType })
      if (paymentMethod == 'STRIPE') {
        if (!merchant) throw new Error('NOT_FOUND|MERCHANT')
        const stripeIndex = merchant?.paymentMethods?.findIndex((i) => i._id.equals(paymentMethodId))
        if (stripeIndex == -1) throw new Error('ENABLE_PAYMENT_METHOD')
        const stripeInfo = merchant.paymentMethods[stripeIndex]
        const chargeCard = await ChargeCard({
          amount: amount,
          currency: currency,
          customerId: stripeInfo.referenceId,
          description: description || referenceId
        })
        if (!chargeCard.status) throw new Error(chargeCard.message)

        response.status = true
        response.data = {
          referenceId: chargeCard.data.referenceId,
          amount: chargeCard.data.amount,
          paymentStatus: true
        }
        response.message = 'PAYMENT_SUCCESS'
      } else if (paymentMethod === 'PAYSTACK') {
        if (!merchant) throw new Error('NOT_FOUND|MERCHANT')

        const paystackIndex = merchant?.paymentMethods?.findIndex((i) => i._id.equals(paymentMethodId))
        if (paystackIndex === -1) throw new Error('ENABLE_PAYMENT_METHOD')

        const paystackInfo = merchant.paymentMethods[paystackIndex]
        if (!paystackInfo.referenceId || !paystackInfo.details.email) {
          throw new Error('MISSING_PAYSTACK_DETAILS')
        }
        const payloadObj = {
          email: paystackInfo.details.email,
          authorization_code: paystackInfo.referenceId,
          amount: amount
        }
        const charge = await PaystackService.chargeAuthorization(payloadObj)

        if (!charge.data.status) {
          throw new Error('PAYSTACK_CHARGE_FAILED')
        }

        response.status = true
        response.data = {
          referenceId: charge.data.reference,
          amount: charge.data.amount / 100,
          paymentStatus: true
        }
        response.message = 'PAYMENT_SUCCESS'
      } else if (paymentMethod === 'RAZORPAY') {
        if (!merchant) throw new Error('NOT_FOUND|MERCHANT')
        // const razorpayIndex = merchant?.paymentMethods?.findIndex((i) => i._id.equals(paymentMethodId))
        // if (razorpayIndex === -1) throw new Error('ENABLE_PAYMENT_METHOD')
        // const razorpayInfo = merchant.paymentMethods[razorpayIndex]
        // if (!razorpayInfo.referenceId || !razorpayInfo.details.email) {
        // throw new Error('MISSING_RAZORPAY_DETAILS')
        // }
        const verifyPayment = await RazorpayService.capturePayment(paymentMethodId, amount)
        console.log('verifyPayment', verifyPayment)
        if (!verifyPayment.status) {
          throw new Error(verifyPayment.message)
        }
        response.status = true
        response.data = {
          referenceId: verifyPayment.id || '',
          amount: (verifyPayment.amount || 100) / 100,
          paymentStatus: verifyPayment.status
        }
        response.message = 'PAYMENT_SUCCESS'
      } else {
        console.log()
        throw new Error('PAYMENT_METHOD_NOT_AVAILABLE')
      }
    } catch (error) {
      console.error('MERCHANT_PAYMENT_ERROR', error)
      response.status = false
      response.message = error.message || response.message
    }
    return response
  }

  static merchantTransaction = async (transactionData) => {
    const response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_PAYMENT'
    }
    try {
      console.log('merchantTransaction', transactionData)
      const {
        referenceId,
        description = '',
        paymentMode = Enum.PAYMENT.MODE.CREDIT,
        userId,
        userType = Enum.ROLES.CUSTOMER,
        serviceArea = null,
        amount,
        module = Enum.PAYMENT.MODULES.TRIP,
        tax = 0,
        status = 'approved'
      } = transactionData

      let merchantData = await Merchant.findOne({ userId, userType }).exec()
      if (!merchantData) merchantData = await this.addMerchant({ userId: userId.toString(), userType })

      // Check for negative cases
      let balance
      if (paymentMode == Enum.PAYMENT.MODE.CREDIT) balance = Number(merchantData.balance) + Number(amount)
      else balance = Number(merchantData.balance) - Number(amount)

      const addTransaction = await Transaction.create({
        referenceId,
        description,
        serviceAreaId: serviceArea,
        userId,
        userType,
        mode: paymentMode,
        amount,
        balance,
        module,
        tax,
        status
      })

      merchantData.lastTransaction = addTransaction._id
      merchantData.balance = balance
      await merchantData.save()

      // Update partner profile wallet
      if (userType == Enum.ROLES.PARTNER) {
        await Partner.findByIdAndUpdate(userId, { 'payment.wallet': balance })
      }

      response.status = true
      response.message = 'TRANSACTION_SUCCESSFUL'
      response.data = merchantData
    } catch (error) {
      console.error('PARTNER_ACCOUNT_LEDGER', error)
      response.status = false
      response.data = {}
      response.message = error.message || response.message
    }
    return response
  }
}

export { PaymentServices }
