/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class SocketValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    getMessages: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' },
        tripId: { type: 'string', ObjectId: true }
      },
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

export { SocketValidator }
