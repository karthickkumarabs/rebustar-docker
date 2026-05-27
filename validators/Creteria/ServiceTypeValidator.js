/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class ServiceTypeValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    getServicesType: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' }
      }
      // additionalProperties: false,
    },
    createServicesType: {
      type: 'object',
      properties: {},
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

export { ServiceTypeValidator }
