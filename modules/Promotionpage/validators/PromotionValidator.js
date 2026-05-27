/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../../../validators/BaseValidator.js'

class PromotionValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    createPromotion: {
      type: 'object',
      properties: {
        serviceTypeId: { type: 'string', ObjectId: true },
        description: { type: 'string' },
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' }
            },
            required: ['title', 'description', 'icon'],
            additionalProperties: false
          }
        }
      }
    },
    updatePromotion: {
      type: 'object',
      properties: {
        serviceTypeId: { type: 'string', ObjectId: true },
        description: { type: 'string' },
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' }
            },
            required: ['title', 'description', 'icon'],
            additionalProperties: false
          }
        }
      }
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

export { PromotionValidator }
