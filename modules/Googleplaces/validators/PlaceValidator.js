/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../../../validators/BaseValidator.js'

class PlaceValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    addPlaces: {
      type: 'object',
      properties: {
        latitude: { type: 'string' },
        longitude: { type: 'string' },
        title: { type: 'string' },
        address: { type: 'string' }
      },
      required: ['latitude', 'longitude', 'title', 'address']
    }
  }

  static messages = {
    addPlaces: {
      'required:latitude': 'latitude is required',
      'required:longitude': 'longitude is required',
      'required:title': 'title is required',
      'required:address': 'address is required'
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

export { PlaceValidator }
