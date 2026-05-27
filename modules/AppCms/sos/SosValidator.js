/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../../../validators/BaseValidator.js'

class SosValidator extends BaseValidator {
  constructor() {
    super()
  }
  static schemas = {
    addData: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subTitle: { type: 'string' },
        displayOrder: { type: 'string' },
        status: { type: 'string' }
      },
      required: ['title', 'subTitle'],
      additionalProperties: false
    },
    updateData: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subTitle: { type: 'string' },
        displayOrder: { type: 'string' },
        status: { type: 'string' },
        _id: { type: 'string' }
      },
      required: [],
      additionalProperties: false
    }
  }

  static messages = {
    addData: {
      'required:title': 'title is required',
      'required:subTitle': 'subTitle is required'
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

export { SosValidator }
