/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../../../validators/BaseValidator.js'

class OutstationValidator extends BaseValidator {
  constructor() {
    super()
  }

  static commonServiceTypeSchema = {
    type: 'object',
    properties: {
      serviceType: { type: 'string', ObjectId: true },
      currencyId: { type: 'string', ObjectId: true },
      bookingFare: { type: 'number' },
      commision: { type: 'number' },
      taxFare: {
        type: 'object',
        properties: {
          status: { type: 'boolean' },
          fare: { type: 'number' }
        },
        required: ['status', 'fare']
      },
      tripType: { type: 'string', enum: ['oneway', 'round'] },
      baseFare: { type: 'number' },
      extraDistanceFare: { type: 'number' },
      extraHoursFare: { type: 'number' }
    },
    required: ['serviceType', 'baseFare', 'extraDistanceFare', 'extraHoursFare'],
    additionalProperties: false
  }

  static schemas = {
    getOutstationPackage: {
      type: 'object',
      properties: {
        packageName: { type: 'string' },
        serviceArea: {
          type: 'array',
          items: { type: 'string', ObjectId: true }
        },
        hours: { type: 'string' },
        distance: { type: 'string' },
        limit: { type: 'string' },
        page: { type: 'string' }
      },
      additionalProperties: false
    },

    createOutstationPackage: {
      type: 'object',
      properties: {
        packageName: { type: 'string' },
        hours: { type: 'number' },
        distance: { type: 'number' },
        serviceType: {
          type: 'array',
          items: OutstationValidator.commonServiceTypeSchema
        },
        serviceArea: {
          type: 'array',
          items: { type: 'string', ObjectId: true }
        }
      },
      required: ['packageName', 'hours', 'distance'],
      additionalProperties: false
    },

    updateOutstationPackage: {
      type: 'object',
      properties: {
        packageName: { type: 'string' },
        hours: { type: 'number' },
        distance: { type: 'number' },
        serviceType: {
          type: 'array',
          items: OutstationValidator.commonServiceTypeSchema
        },
        serviceArea: {
          type: 'array',
          items: { type: 'string', ObjectId: true }
        }
      },
      required: ['packageName', 'hours', 'distance'],
      additionalProperties: false
    },

    validateServiceType: {
      type: 'object',
      properties: OutstationValidator.commonServiceTypeSchema.properties,
      required: ['serviceType', 'baseFare', 'extraDistanceFare', 'extraHoursFare'],
      additionalProperties: false
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

export { OutstationValidator }
