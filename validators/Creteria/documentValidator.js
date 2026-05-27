/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class DocumentValidator extends BaseValidator {
  constructor() {
    super()
  }

  static async validateDocumentData(data, config) {
    const response = {
      status: false,
      message: 'VALIDATION_FAILED',
      data: {}
    }

    try {
      const schema = {
        type: 'object',
        properties: {
          fieldName: { type: 'string' }
        },
        additionalProperties: true
      }

      // const documentData = { ...config }
      const documentData = config.toObject?.() || config._doc || config

      for (const document of documentData?.fields) {
        schema.properties[document.indexName] = { type: 'string' } // Assuming all types map to 'string'
      }
      const messages = {}
      const validate = await this.ajvCompiler({ schema, data, messages })
      if (validate && validate.length > 0) throw new Error('VALIDATION_FAILED', { cause: validate })
      response.status = true
      response.message = 'VALIDATION_SUCCESS'
      response.data = {}
    } catch (error) {
      response.status = false
      response.message = error.message || 'VALIDATION_FAILED'
      response.data = {
        validate: error.cause
      }
    }

    return response
  }
  static async documentValidate(data, config) {
    return this.validateDocumentData(data, config)
  }

  static async vehicleDocumentValidate(data, config) {
    return this.validateDocumentData(data, config)
  }
}

export { DocumentValidator }
