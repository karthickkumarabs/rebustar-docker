/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'

class PresetValidator extends BaseValidator {
  constructor() {
    super()
  }
  static schemas = {
    getLanguageExists: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: { type: 'string' }
      },
      oneOf: [{ required: ['code'] }, { required: ['name'] }],
      additionalProperties: false
    },
    createLanguage: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: { type: 'string' }
      },
      required: ['code', 'name']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    updateLanguage: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: { type: 'string' }
      },
      required: ['code', 'name']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    getCountryExists: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        code: { type: 'string' },
        phonecode: { type: 'string' }
      },
      oneOf: [{ required: ['name'] }, { required: ['code'] }, { required: ['phonecode'] }],
      additionalProperties: false
    },
    createCountry: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        code: { type: 'string' },
        phonecode: { type: 'string' }
      },
      required: ['name', 'code', 'phonecode']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    updateCountry: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        code: { type: 'string' },
        phonecode: { type: 'string' }
      },
      required: ['name', 'code', 'phonecode']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    getStateExists: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        code: { type: 'string' }
      },
      oneOf: [{ required: ['name'] }, { required: ['code'] }],
      additionalProperties: false
    },
    createState: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        code: { type: 'string' }
      },
      required: ['name', 'code']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    updateState: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        code: { type: 'string' }
      },
      required: ['name', 'code']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    getCityExists: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: { type: 'string' },
        state_id: { type: 'string' }
      },
      oneOf: [{ required: ['code'] }, { required: ['name'] }, { required: ['state_id'] }],
      additionalProperties: false
    },
    createCity: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: { type: 'string' },
        state_id: { type: 'string' }
      },
      required: ['code', 'name', 'state_id']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    updateCity: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: { type: 'string' },
        state_id: { type: 'string' }
      },
      required: ['code', 'name', 'state_id']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    getMakeExists: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      oneOf: [{ required: ['name'] }],
      additionalProperties: false
    },
    createMake: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    updateMake: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    getModelExists: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        year: { type: 'string' },
        make_id: { type: 'string' }
      },
      oneOf: [{ required: ['name'] }, { required: ['year'] }, { required: ['make_id'] }],
      additionalProperties: false
    },
    createModel: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        year: { type: 'string' },
        make_id: { type: 'string' }
      },
      required: ['name', 'year', 'make_id']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    updateModel: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        year: { type: 'string' },
        make_id: { type: 'string' }
      },
      required: ['name', 'year', 'make_id']
      // anyOf: [
      //     {
      //         "required": ["phone", "phoneCode"]
      //     },
      //     {
      //         "required": ["email"],
      //         "propertyNames": {"not": {"enum": ["phone", "phoneCode"] } }
      //     }
      // ]
      // additionalProperties: false
    },
    createCurrency: {
      type: 'object',
      properties: {
        country: { type: 'string', ObjectId: true },
        name: { type: 'string' },
        code: { type: 'string' },
        symbol: { type: 'string' }
      },
      required: ['country', 'name', 'code', 'symbol']
    },
    updateCurrency: {
      type: 'object',
      properties: {
        country: { type: 'string', ObjectId: true },
        name: { type: 'string' },
        code: { type: 'string' },
        symbol: { type: 'string' }
      },
      required: ['country', 'name', 'code', 'symbol']
    },
    createYear: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name']
    },
    updateYear: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name']
    }
  }
  static messages = {
    getLanguageExists: {
      'required:oneOf:code': 'code is required',
      'required:oneOf:name': 'name is required'
    },
    createLanguage: {
      'required:code': 'code is required',
      'required:name': 'name is required'
    },
    updateLanguage: {
      'required:code': 'code is required',
      'required:name': 'name is required'
    },
    // Country
    getCountryExists: {
      'required:oneOf:name': 'name is required',
      'required:oneOf:code': 'code is required',
      'required:oneOf:phonecode': 'PhoneCode is required'
    },
    createCountry: {
      'required:name': 'name is required',
      'required:code': 'code is required',
      'required:phonecode': 'Phonecode is required'
    },
    updateCountry: {
      'required:name': 'name is required',
      'required:code': 'code is required',
      'required:phonecode': 'Phonecode is required'
    },
    // state
    getStateExists: {
      'required:oneOf:name': 'name is required',
      'required:oneOf:code': 'code is required'
    },
    createState: {
      'required:name': 'name is required',
      'required:code': 'code is required'
    },
    updateState: {
      'required:name': 'name is required',
      'required:code': 'code is required'
    },
    // city
    getCityExists: {
      'required:oneOf:code': 'code is required',
      'required:oneOf:name': 'name is required',
      'required:oneOf:state_id': 'StateID is required'
    },
    createCity: {
      'required:code': 'code is required',
      'required:name': 'name is required',
      'required:state_id': 'StateID is required'
    },
    updateCity: {
      'required:code': 'code is required',
      'required:name': 'name is required',
      'required:state_id': 'StateID is required'
    },
    // make
    getMakeExists: {
      'required:oneOf:name': 'name is required'
    },
    createMake: {
      'required:makeename': 'name is required'
    },
    updateMake: {
      'required:name': 'name is required'
    },
    // model
    getModelExists: {
      'required:oneOf:name': 'name is required',
      'required:oneOf:year': 'Year is required',
      'required:oneOf:make_id': 'MakeID is required'
    },
    createModel: {
      'required:name': 'name is required',
      'required:year': 'Year is required',
      'required:make_id': 'MakeID is required'
    },
    updateModel: {
      'required:name': 'name is required',
      'required:year': 'Year is required',
      'required:make_id': 'MakeID is required'
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

export { PresetValidator }
