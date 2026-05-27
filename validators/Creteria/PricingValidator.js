/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class PricingValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    getPricing: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' }
      },
      additionalProperties: false
    },
    createPricing: {
      type: 'object',
      properties: {
        serviceId: { type: 'string' },
        serviceAreaId: { type: 'string' },
        currencyId: { type: 'string' },
        baseFare: { type: 'string' },
        bookingFare: { type: 'string' },
        fare: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            value: { type: 'string' }
          }
        },
        timeFare: { type: 'string' },
        commision: { type: 'string' },
        minimumFare: { type: 'string' },
        taxFare: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            fare: { type: 'string' }
          }
        },
        waitingFare: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            allowedMin: { type: 'string' },
            fare: { type: 'string' }
          }
        },
        cancelationFare: {
          type: 'object',
          properties: {
            partner: { type: 'string' },
            customer: { type: 'string' }
          }
        },
        additional: {
          type: 'object',
          properties: {
            peakFare: { type: 'array' },
            nightFare: { type: 'array' },
            distanceFare: { type: 'array' },
            pickupFare: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                value: { type: 'string' }
              }
            }
          }
        }
      }
      // required: ['serviceId'],
      // additionalProperties: false,
    },
    updatePricing: {
      type: 'object',
      properties: {
        serviceId: { type: 'string' },
        baseFare: { type: 'string' },
        bookingFare: { type: 'string' },
        fare: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            value: { type: 'string' }
          }
        },
        minimumFare: { type: 'string' },
        timeFare: { type: 'string' },
        commision: { type: 'string' },
        cancelationFare: {
          type: 'object',
          properties: {
            partner: { type: 'string' },
            customer: { type: 'string' }
          }
        },
        additional: { type: 'object' }
      }
      // required: ['serviceId'],
      // additionalProperties: false,
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

export { PricingValidator }
