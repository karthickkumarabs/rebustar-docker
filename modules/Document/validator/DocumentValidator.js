/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../../../validators/BaseValidator.js'

class DocumentValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    addDocument: {
      type: 'object',
      properties: {
        serviceAreaId: { type: 'string' },
        type: { type: 'string' },
        name: { type: 'string' },
        indexName: { type: 'string' },
        mandatory: { type: 'boolean' },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              indexName: { type: 'string' },
              type: { type: 'string' }
            },
            required: ['name', 'indexName', 'type']
          }
        }
      },
      required: ['serviceAreaId', 'type', 'name', 'indexName', 'fields', 'mandatory'],
      additionalProperties: true
    },

    updateDocument: {
      type: 'object',
      properties: {
        serviceAreaId: { type: 'string' },
        documentId: { type: 'string' },
        type: { type: 'string' },
        name: { type: 'string' },
        indexName: { type: 'string' },
        mandatory: { type: 'boolean' },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              indexName: { type: 'string' },
              type: { type: 'string' }
            },
            required: []
          }
        }
      },
      required: ['documentId'],
      additionalProperties: false
    }
  }

  static messages = {
    addDocument: {
      'required:serviceAreaId': 'serviceAreaId is required',
      'required:type': 'type is required',
      'required:name': 'name is required',
      'required:indexName': 'indexName is required',
      'required:mandatory': 'mandatory is required',
      'required:fields': 'fields is required'
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

export { DocumentValidator }
