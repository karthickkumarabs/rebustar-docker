/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../../../validators/BaseValidator.js'
import { MultistopConfig as Config } from '../config.js'

class MultistopValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    getEstimation: {
      type: 'object',
      properties: {
        stops: {
          type: 'array',
          ...(Config.isModuleEnabled && { minItems: Config.minStop }),
          ...(Config.isModuleEnabled && { maxItems: Config.maxStop }),
          items: {
            type: 'object',
            properties: {
              latitude: { type: 'string' },
              longitude: { type: 'string' }
            },
            required: ['latitude', 'longitude'],
            additionalProperties: false
          }
        },
        time: { type: 'string' }
      },
      required: ['stops'],
      additionalProperties: false
    },
    addStops: {
      type: 'object',
      properties: {
        stops: {
          type: 'array',
          minItems: Config.minStop,
          maxItems: Config.maxStop,
          items: {
            type: 'object',
            properties: {
              latitude: { type: 'string' },
              longitude: { type: 'string' }
            },
            required: ['latitude', 'longitude'],
            additionalProperties: false
          }
        },
        requestId: { type: 'string' },
        vehicleId: { type: 'string' },
        time: { type: 'string' }
      },
      required: ['stops', 'requestId', 'vehicleId'],
      additionalProperties: true
    },

    tripRequest: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        requestFrom: { type: 'string' },
        paymentMethod: { type: 'string' },
        paymentMethodId: { type: 'string' },
        stops: {
          type: 'array',
          minItems: 2,
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              latitude: { type: 'string' },
              longitude: { type: 'string' }
            },
            required: ['latitude', 'longitude'],
            additionalProperties: false
          }
        },
        time: { type: 'string' }
      },
      required: ['stops', 'vehicleId'],
      additionalProperties: true
    }
  }

  static messages = {
    getEstimation: {
      'required:stops': 'stops required'
    },
    addStops: {
      'required:requestId': 'requestId is required',
      'required:vehicleId': 'vehicleId is required',
      'required:stops': 'stops are required'
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

export { MultistopValidator }
