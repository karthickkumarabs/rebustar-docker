/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class ServiceAreaValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    getServiceArea: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' }
      }
      // additionalProperties: false,
    },
    createServiceArea: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        polygon: {
          type: 'array',
          items: {
            type: 'array',
            items: {
              type: 'number'
            }
          }
        },

        cityId: { type: 'string' },
        stateId: { type: 'string' },
        countryId: { type: 'string' },

        customerPrefix: { type: 'string' },
        partnerPrefix: { type: 'string' },
        tripPrefix: { type: 'string' },

        status: { type: 'boolean' }
      },
      required: [
        'name',
        'latitude',
        'longitude',
        'polygon',
        'cityId',
        'stateId',
        'countryId',
        'customerPrefix',
        'partnerPrefix',
        'tripPrefix',
        'status'
      ],
      additionalProperties: true
    },
    updateServiceArea: {
      type: 'object',
      properties: {
        serviceAreaId: { type: 'string' },

        name: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        polygon: { type: 'array' },

        cityId: { type: 'string' },
        stateId: { type: 'string' },
        countryId: { type: 'string' },

        customerPrefix: { type: 'string' },
        partnerPrefix: { type: 'string' },
        tripPrefix: { type: 'string' },

        status: { type: 'boolean' }
      },
      required: ['serviceAreaId'],
      additionalProperties: true
    },
    deleteServiceArea: {
      type: 'object',
      properties: {
        serviceAreaId: { type: 'string' }
      },
      required: ['serviceAreaId']
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

export { ServiceAreaValidator }
