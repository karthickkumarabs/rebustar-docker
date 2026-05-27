/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import axios from 'axios'
// import RazorpayLog from '../models/RazorpayLog.js'
import { PaymentConfig } from '../../../../config/PaymentConfig.js'
import { BaseService } from '../../../../services/BaseService.js'
import { PaymentServices } from '../../PaymentService.js'
import { Enum } from '../../../../utils/Enum.js'

class RazorpayService extends BaseService {
  static getAccountNumber() {
    const gateway = PaymentConfig.gateway.find((g) => g.indexName === 'razorpay')
    return gateway?.fields.find((f) => f.indexName === 'accountNumber')?.value || ''
  }

  static getSecretKey() {
    const gateway = PaymentConfig.gateway.find((g) => g.indexName === 'razorpay')
    return gateway?.fields.find((f) => f.indexName === 'secretKey')?.value || ''
  }

  static getPublicKey() {
    const gateway = PaymentConfig.gateway.find((g) => g.indexName === 'razorpay')
    return gateway?.fields.find((f) => f.indexName === 'publicKey')?.value || ''
  }

  // Utility: Get Currency from config
  static getCurrency() {
    const gateway = PaymentConfig.gateway.find((g) => g.indexName === 'razorpay')
    return gateway?.fields.find((f) => f.indexName === 'currency')?.value || 'NGN'
  }

  // Axios Instance
  static getAxiosInstance() {
    const publicKey = this.getPublicKey()
    const secretKey = this.getSecretKey()

    console.log('publicKey', publicKey)
    console.log('secretKey', secretKey)
    return axios.create({
      baseURL: 'https://api.razorpay.com/v1', // Razorpay's correct base URL
      auth: {
        username: publicKey,
        password: secretKey
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  static createContact = async (payload) => {
    const responseData = {
      id: '',
      active: false,
      err: ''
    }
    try {
      console.log('payload', payload)
      const response = await this.getAxiosInstance().post('/contacts', payload)
      if (response && response.data) {
        responseData.id = response.data.id
        responseData.active = response.data.active
        return responseData
      } else return responseData
    } catch (err) {
      console.log(err)
      responseData.err = err
      return responseData
    }
  }

  static addFundAccounts = async (getContact, reqData) => {
    const responseData = {
      id: '',
      active: false,
      err: ''
    }
    try {
      const payload = {
        contact_id: getContact.id,
        account_type: 'bank_account',
        bank_account: {
          name: reqData.name,
          ifsc: reqData.ifscCode,
          account_number: reqData.acctNo
        }
      }
      const response = await this.getAxiosInstance().post('/fund_accounts', payload)
      if (response && response.data) {
        responseData.id = response.data.id
        responseData.active = response.data.active
        return responseData
      } else return responseData
    } catch (err) {
      console.log(err)
      responseData.err = err
      return responseData
    }
  }

  static getFundAccount = async (fundAccountId) => {
    try {
      const response = await this.getAxiosInstance().get(`/fund_accounts/${fundAccountId}`)
      if (response && response.data) return response.data
      else return response
    } catch (err) {
      console.log(err)
      return err
    }
  }

  static updateContact = async (contactId, payload) => {
    try {
      console.log('payload', payload)
      const response = await this.getAxiosInstance().put(`/contacts/${contactId}`, payload)
      if (response && response.data) return response.data
      else return response
    } catch (err) {
      console.log(err)
      return err
    }
  }

  static deactivateContact = async (contactId, payload) => {
    try {
      console.log('payload', payload)
      const response = await this.getAxiosInstance().patch(`/contacts/${contactId}`, payload)
      if (response && response.data) return response.data
      else return response
    } catch (err) {
      console.log(err)
      return err
    }
  }

  static deactivateFundAccount = async (fundAccountId, payload) => {
    try {
      console.log('payload', payload)
      const response = await this.getAxiosInstance().patch(`/fund_accounts/${fundAccountId}`, payload)
      if (response && response.data) return response.data
      else return response
    } catch (err) {
      console.log(err)
      return err
    }
  }

  static getBalance = async () => {
    try {
      const response = await this.getAxiosInstance().get(`/balance`)
      if (response && response.data) return response.data
      else return response
    } catch (err) {
      console.log(err)
      return err
    }
  }

  static initiateTransfer = async (payoutObj, merchantData) => {
    const responseData = {
      id: '',
      status: false,
      err: ''
    }
    try {
      const transfer = await this.getAxiosInstance().post(`/payouts`, payoutObj)
      if (transfer) {
        const newBalance = Number(merchantData.balance) - Number(payoutObj.amount) * 100
        const transaction = await PaymentServices.merchantTransaction({
          referenceId: transfer.id,
          description: 'Payout',
          paymentMode: Enum.PAYMENT.MODE.DEBIT, // enum
          userId: merchantData.userId,
          userType: merchantData.userType,
          amount: payoutObj.amount,
          module: Enum.PAYMENT.MODULES.PAYOUT,
          balance: newBalance
        })
        console.log('transaction', transaction)
        responseData.id = transfer.data.id
        responseData.status = transfer.data.status
        return responseData
      } else {
        return responseData
      }
    } catch (err) {
      console.log(err)
      responseData.err = err
      return responseData
    }
  }

  static createOrder = async (reqData) => {
    const responseData = {
      id: '',
      status: false,
      err: ''
    }
    try {
      const payload = {
        amount: reqData.amount,
        currency: reqData.currency,
        payment_capture: reqData.payment_capture
      }
      const response = await this.getAxiosInstance().post('/orders', payload)
      if (response && response.data) {
        responseData.id = response.data.id
        responseData.status = response.data.status
        return responseData
      } else return responseData
    } catch (err) {
      console.log(err)
      responseData.err = err
      return responseData
    }
  }

  static verifyTransaction = async (transactionId) => {
    const responseData = {
      id: '',
      status: 'failed',
      err: ''
    }
    try {
      const response = await this.getAxiosInstance().get(`/transactions/${transactionId}`)
      if (response && response.data) {
        responseData.id = response.data.id
        responseData.status = response.data.status
        return responseData
      } else return responseData
    } catch (err) {
      console.log(err)
      responseData.err = err
      return responseData
    }
  }

  static verifyPayments = async (transactionId) => {
    const responseData = {
      status: false,
      data: {},
      message: 'VERIFICATION_FAILED'
    }
    try {
      const response = await this.getAxiosInstance().get(`/payments/${transactionId}`)
      // console.log('Razorpay payment response', response.data)
      if (
        response &&
        response.status == 200 &&
        (response.data?.status == 'captured' || response.data?.status == 'authorized')
      ) {
        responseData.data = {
          id: response.data.id
        }
        responseData.status = true
        responseData.message = 'VERIFICATION_SUCCESS'
        return responseData
      } else return responseData
    } catch (err) {
      console.log(err)
      responseData.message = responseData.message
      return responseData
    }
  }

  static capturePayment = async (paymentId, amount) => {
    const responseData = {
      id: '',
      status: false,
      err: ''
    }

    try {
      // Razorpay requires amount in paise (for INR)
      // Ensure `amount` is an integer value
      console.log('Capturing payment:', { paymentId, amount })

      const response = await this.getAxiosInstance().post(`/payments/${paymentId}/capture`, {
        amount: amount * 100, // amount in paise
        currency: this.getCurrency() // e.g., 'INR' or 'NGN'
      })

      if (response && response.data) {
        responseData.id = response.data.id
        responseData.status = response.data.captured
        responseData.amount = response.data.amount
        return responseData
      } else {
        return responseData
      }
    } catch (err) {
      console.error('Error capturing payment:', err.response?.data || err.message)
      responseData.err = err.response?.data || err.message
      return responseData
    }
  }
}

export { RazorpayService }
