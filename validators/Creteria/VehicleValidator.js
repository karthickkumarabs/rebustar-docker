/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class VehicleValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    getVehicles: {
      type: 'object',
      properties: {
        model: { type: 'string' },
        registrationnumber: { type: 'string' },
        chaisis: { type: 'string' }
      },
      additionalProperties: false
    },
    createVehicle: {
      type: 'object',
      properties: {
        registrationnumber: { type: 'string' },
        partnerId: { type: 'string' },
        makeid: { type: 'string' },
        model: { type: 'string' },
        year: { type: 'string' },
        color: { type: 'string' },
        servicetype: { type: 'string' },
        ownerId: { type: 'string' },
        ownerType: { type: 'string' }
      },
      additionalProperties: false
    },
    updateVehicle: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        registrationnumber: { type: 'string' },
        partnerId: { type: 'string' },
        makeid: { type: 'string' },
        model: { type: 'string' },
        year: { type: 'string' },
        color: { type: 'string' },
        servicetype: { type: 'string' },
        status: { type: 'string' },
        ownerId: { type: 'string' },
        ownerType: { type: 'string' }
      },
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

export { VehicleValidator }
