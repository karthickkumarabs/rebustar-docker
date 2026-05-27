/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Enum } from '../../utils/Enum.js'
import { BaseValidator } from '../BaseValidator.js'

class PaymentValidator extends BaseValidator {
  constructor() {
    super()
  }
  static schemas = {
    getMerchant: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' }
      },
      additionalProperties: true
    },
    getTransaction: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' }
      },
      additionalProperties: true
    },
    getMyTransaction: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' }
      },
      additionalProperties: true
    },
    addMerchant: {
      type: 'object',
      properties: {
        // serviceAreaId: { type: 'string', ObjectId: true },

        userId: { type: 'string', ObjectId: true },
        userType: { type: 'string' }
      },
      additionalProperties: true
    },
    addMerchantTransaction: {
      type: 'object',
      properties: {
        // serviceAreaId: { type: 'string', ObjectId: true },

        userId: { type: 'string', ObjectId: true },
        userType: { type: 'string' },
        referenceId: { type: 'string' },
        amount: { type: 'string' },
        module: {
          type: 'string',
          enum: [
            Enum.PAYMENT.MODULES.TRIP,
            Enum.PAYMENT.MODULES.SUBSCRIPTION,
            Enum.PAYMENT.MODULES.REFUND,
            Enum.PAYMENT.MODULES.PAYOUT,
            Enum.PAYMENT.MODULES.ADJUSTMENT
          ]
        },
        mode: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['userId', 'userType', 'referenceId', 'amount', 'mode', 'module'],
      additionalProperties: true
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

export { PaymentValidator }
