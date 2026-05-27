/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class OfferValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    createOffer: {
      type: 'object',
      properties: {
        start: { type: 'string' },
        end: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        offerImg: { type: 'string' },
        isPromotion: { type: 'string' }
      },
      required: ['start', 'end', 'title']
    },
    updateOffer: {
      type: 'object',
      properties: {
        start: { type: 'string' },
        end: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        offerImg: { type: 'string' },
        isPromotion: { type: 'string' }
      },
      required: ['start', 'end', 'title']
    },
    getOffer: {
      type: 'object',
      properties: {
        _sort: { type: 'string' },
        _order: { type: 'string' }
      }
    },
    deleteOffer: {
      type: 'object',
      properties: {
        _id: { type: 'string' }
      },
      required: ['_id']
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

export { OfferValidator }
