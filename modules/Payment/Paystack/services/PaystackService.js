/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import axios from 'axios'
import PaystackLog from '../models/PaystackLog.js'
import { PaymentConfig } from '../../../../config/PaymentConfig.js'
import { BaseService } from '../../../../services/BaseService.js'
class PaystackService extends BaseService {
  // Utility: Get Secret Key from config
  static getSecretKey() {
    const gateway = PaymentConfig.gateway.find((g) => g.indexName === 'PAYSTACK')
    return gateway?.fields.find((f) => f.indexName === 'secretKey')?.value || ''
  }

  // Utility: Get Currency from config
  static getCurrency() {
    const gateway = PaymentConfig.gateway.find((g) => g.indexName === 'PAYSTACK')
    return gateway?.fields.find((f) => f.indexName === 'currency')?.value || 'NGN'
  }

  // Axios Instance
  static getAxiosInstance() {
    return axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.getSecretKey()}`,
        'Content-Type': 'application/json'
      }
    })
  }

  //  Initialize Payment
  static async initializeTransaction({ email, amount }) {
    const payload = { email, amount }
    try {
      const response = await this.getAxiosInstance().post('/transaction/initialize', payload)

      await PaystackLog.create({
        transactionReference: response.data.data.reference,
        requestPayload: payload,
        responsePayload: response.data,
        type: 'init',
        status: 'pending',
        message: 'Transaction initialized'
      })

      return response
    } catch (err) {
      await PaystackLog.create({
        transactionReference: null,
        requestPayload: payload,
        responsePayload: err.response?.data || err.message,
        type: 'init',
        status: 'failed',
        message: 'Initialization failed'
      })
      throw err
    }
  }

  //  Verify Payment
  static async verifyTransaction(reference) {
    try {
      const response = await this.getAxiosInstance().get(`/transaction/verify/${reference}`)

      await PaystackLog.findOneAndUpdate(
        { transactionReference: reference },
        {
          $set: {
            responsePayload: response.data,
            status: response.data.data.status === 'success' ? 'success' : 'failed',
            message: 'Verification completed'
          }
        }
      )

      return response
    } catch (err) {
      await PaystackLog.findOneAndUpdate(
        { transactionReference: reference },
        {
          $set: {
            responsePayload: err.response?.data || err.message,
            status: 'failed',
            message: 'Verification failed'
          }
        }
      )
      throw err
    }
  }

  //  Charge Authorization (Saved Card)

  static async chargeAuthorization(payload) {
    try {
      const response = await this.getAxiosInstance().post('/transaction/charge_authorization', payload)
      await PaystackLog.create({
        transactionReference: response.data.data?.reference || null,
        requestPayload: payload,
        responsePayload: response.data,
        type: 'charge',
        status: 'success',
        message: 'Charge via saved card successful'
      })

      return response
    } catch (err) {
      await PaystackLog.create({
        transactionReference: null,
        requestPayload: payload,
        responsePayload: err.response?.data || err.message,
        type: 'charge',
        status: 'failed',
        message: 'Charge via saved card failed'
      })
      throw err
    }
  }

  //  Create Transfer Recipient
  static async createTransferrecipient(name, accountNumber, bankCode) {
    const payload = {
      type: 'nuban',
      name: name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: this.getCurrency()
    }
    return await this.getAxiosInstance().post('/transferrecipient', payload)
  }

  // Remove Transfer Recipient

  static async removeTransferrecipient(recipientId) {
    return await this.getAxiosInstance().delete(`/transferrecipient/${recipientId}`)
  }

  // Get Transfer Recipient

  static async gettransferRecipient(recipientId) {
    return await this.getAxiosInstance().get(`/transferrecipient/${recipientId}`)
  }

  //  Initiate Transfer with Send Otp
  static async initiateTransfer(payoutObj) {
    const payload = {
      source: 'balance',
      amount: payoutObj.amount,
      recipient: payoutObj.recipientCode,
      reason: payoutObj.reason
    }
    try {
      const response = await this.getAxiosInstance().post('/transfer', payload)

      await PaystackLog.create({
        transactionReference: response.data.data.reference || null,
        requestPayload: payload,
        responsePayload: response.data,
        type: 'transfer',
        status: 'success',
        message: 'Transfer completed'
      })

      return response
    } catch (err) {
      await PaystackLog.create({
        transactionReference: null,
        requestPayload: payload,
        responsePayload: err.response?.data || err.message,
        type: 'transfer',
        status: 'failed',
        message: 'Transfer failed'
      })
      throw err
    }
  }

  // Transfer Amount with Verify Otp
  static async transferAmount(initiateId, OTP) {
    const payload = {
      transfer_code: initiateId,
      otp: OTP
    }
    const res = await this.getAxiosInstance().post('/transfer/finalize_transfer', payload)
    return res
  }
}

export { PaystackService }
