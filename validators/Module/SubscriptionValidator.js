/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class SubscriptionValidator extends BaseValidator {
  constructor() {
    super()
  }
  static schemas = {
    addPackage: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        amount: { type: 'string' },
        credits: { type: 'string' },
        validity: { type: 'string' },
        userlimit: { type: 'string' },
        image: { type: 'string' }
      },

      anyOf: [{ required: ['credits'] }, { required: ['validity'] }],
      required: ['name', 'description', 'type', 'amount', 'userlimit'],
      additionalProperties: true
    },
    getPackage: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' }
      },
      additionalProperties: true
    },
    updatePackage: {
      type: 'object',
      properties: {
        packageId: { type: 'string' },

        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        amount: { type: 'string' },
        credits: { type: 'string' },
        validity: { type: 'string' },
        userlimit: { type: 'string' }
      },
      required: ['packageId'],
      additionalProperties: true
    },
    deletePackage: {
      type: 'object',
      properties: {
        packageId: { type: 'string' }
      },
      required: ['packageId']
    },
    addPurchasePackage: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        packageId: { type: 'string' },
        transactionId: { type: 'string' },
        paymentMethod: { type: 'string' },
        paymentMethodId: { type: 'string' }
      },
      required: ['userId', 'packageId'],
      additionalProperties: true
    },
    getPurchasePackage: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' }
      }
      // additionalProperties: true,
    },
    updatePurchasePackage: {
      type: 'object',
      properties: {
        purchasePackageId: { type: 'string' },

        startDate: { type: 'string' },
        endDate: { type: 'string' },
        status: { type: 'string' }
      },
      required: ['purchasePackageId'],
      additionalProperties: true
    },
    deletePurchasePackage: {
      type: 'object',
      properties: {
        purchasePackageId: { type: 'string' }
      },
      required: ['purchasePackageId']
    }
  }
  static messages = {
    addPackage: {
      'required:oneOf:credits': 'Credits is required',
      'required:oneOf:validity': 'Validity is required'
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

export { SubscriptionValidator }
