/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class TranslationValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    getTranscribe: {
      type: 'object',
      properties: {
        translationId: { type: 'string', ObjectId: true }
      },
      additionalProperties: true
    },
    updateTranscribe: {
      type: 'object',
      properties: {
        // translationId: { type: 'string', ObjectId: true }
      },
      additionalProperties: true
    },
    getLanguage: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        page: { type: 'string' }
      },
      additionalProperties: true
    },
    updateLanguage: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        indexName: { type: 'string' },
        status: { type: 'string' }
      },
      additionalProperties: true
    },
    deleteTransaltion: {
      type: 'object',
      properties: {
        translationId: { type: 'string', ObjectId: true }
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

export { TranslationValidator }
