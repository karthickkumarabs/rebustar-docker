/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class CouponValidator extends BaseValidator {
  constructor() {
    super()
  }

  static fareStructure = {
    type: 'object',
    properties: {
      type: { type: 'string' },
      value: { type: 'number' }
    }
  }

  static commonCouponProperties = {
    start: { type: 'string' },
    end: { type: 'string' },
    limit: { type: 'number' },
    userLimit: { type: 'number' },
    offerValue: { type: 'number' },
    offerLimit: { type: 'number' },
    startTime: { type: 'string' },
    endTime: { type: 'string' },
    tripType: { type: 'array' },
    applyType: { type: 'string', enum: ['Manual', 'Auto'] }
  }

  static schemas = {
    addCoupon: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        fare: CouponValidator.fareStructure, // Reusing common fare structure
        ...CouponValidator.commonCouponProperties // Reusing common properties
      }
    },
    getCoupon: {
      type: 'object',
      properties: {
        _sort: { type: 'string' },
        _order: { type: 'string' }
      }
    },
    updateCoupon: {
      type: 'object',
      properties: {
        fare: CouponValidator.fareStructure, // Reusing common fare structure
        ...CouponValidator.commonCouponProperties // Reusing common properties
      }
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

export { CouponValidator }
