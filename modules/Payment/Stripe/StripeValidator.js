/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../../../validators/BaseValidator.js'

class StripeValidator extends BaseValidator {
  constructor() {
    super()
  }
  static schemas = {
    addCard: {
      type: 'object',
      properties: {
        cardNumber: { type: 'string' },
        token: { type: 'string' }
      },
      required: ['cardNumber', 'token']
    },
    removeCard: {
      type: 'object',
      properties: {
        paymentMethodId: { type: 'string', ObjectId: true }
      },
      required: ['paymentMethodId']
    },
    chargeCard: {
      type: 'object',
      properties: {
        customerId: { type: 'string' },
        currency: { type: 'string' },
        amount: { type: 'number' },
        description: { type: 'string' }
      },
      required: ['customerId', 'currency', 'amount']
    },
    connectAccount: {
      type: 'object',
      properties: {
        accountHolderName: { type: 'string', isNotEmpty: true },
        accountHolderType: { type: 'string' /* , isNotEmpty: true*/ },
        accountReference: { type: 'string', isNotEmpty: true },
        accountNumber: { type: 'string', isNotEmpty: true }
      }
      // required: ['accountNumber', 'accountReference', 'accountHolderName']
    },
    createTransfer: {
      type: 'object',
      properties: {
        amount: { type: 'string' }
      },
      required: []
    }
  }

  static messages = {
    addCard: {
      'required:cardNumber': 'Card Number is required',
      'required:token': 'Token is required'
    },
    removeCard: {
      'required:paymentMethodId': 'Payment Method Id is required'
    },
    chargeCard: {
      'required:paymentMethodId': 'Payment Method Id is required'
    },
    connectAccount: {
      'required:accountNumber': 'Account Number is required',
      'required:accountReference': 'Account Reference is required',
      'required:accountHolderName': 'Account Holder name Id is required'
    }
  }

  static getSchema(schemaName) {
    return () => {
      if (!this.schemas[schemaName]) {
        throw new Error('Schema not found')
      }
      return this.schemas[schemaName]
    }
  }
}

export { StripeValidator }
