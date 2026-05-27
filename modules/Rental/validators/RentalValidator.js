/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../../../validators/BaseValidator.js'

class RentalValidator extends BaseValidator {
  constructor() {
    super()
  }

  static serviceTypeProperties = {
    serviceType: { type: 'string', ObjectId: true },
    currencyId: { type: 'string', ObjectId: true },
    fixedCharge: { type: 'number' },
    cancellationFarePartner: { type: 'number' },
    cancellationFareRider: { type: 'number' },
    extraDistanceFare: { type: 'number' },
    extraTimeFare: { type: 'number' },
    taxFare: {
      type: 'object',
      properties: {
        status: { type: 'boolean' },
        fare: { type: 'number' }
      },
      required: ['status', 'fare']
    }
  }

  static waitingFareStructure = {
    type: 'object',
    properties: {
      status: { type: 'boolean' },
      fare: { type: 'number' },
      allowedTime: { type: 'number' }
    }
  }

  static serviceTypesArrayItem = {
    type: 'object',
    properties: {
      ...RentalValidator.serviceTypeProperties
    },
    required: ['serviceType', 'fixedCharge', 'extraDistanceFare', 'extraTimeFare']
  }

  static commonServiceFields = {
    baseFare: { type: 'number' },
    distanceFare: { type: 'number' },
    timeFare: { type: 'number' },
    bookingFare: { type: 'number' },
    commision: { type: 'number' },
    waitingFare: RentalValidator.waitingFareStructure
  }

  static schemas = {
    createRentalPackage: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        distance: { type: 'number' },
        time: { type: 'number' },
        serviceTypes: {
          type: 'array',
          items: RentalValidator.serviceTypesArrayItem
        },
        serviceArea: { type: 'string' }
      },
      required: ['name', 'distance']
      // additionalProperties: false,
    },
    createServiceType: {
      type: 'object',
      properties: {
        serviceType: { type: 'string', ObjectId: true },
        ...RentalValidator.commonServiceFields
      },
      required: ['serviceType', 'baseFare', 'distanceFare', 'timeFare', 'currencyId']
      // additionalProperties: false
    },
    updateRentalPackage: {
      type: 'object',
      properties: {
        packageId: { type: 'string', ObjectId: true },
        name: { type: 'string' },
        description: { type: 'string' },
        distance: { type: 'number' },
        time: { type: 'number' },
        serviceTypes: {
          type: 'array',
          items: RentalValidator.serviceTypesArrayItem
        },
        serviceArea: { type: 'string' }
      },
      required: ['name', 'distance', 'time']
      // additionalProperties: false
    },
    updateServiceType: {
      type: 'object',
      properties: {
        serviceType: { type: 'string', ObjectId: true },
        ...RentalValidator.commonServiceFields
      },
      required: ['serviceType', 'baseFare', 'distanceFare', 'timeFare', 'currencyId']
      // additionalProperties: false
    },
    getRentalPackage: {
      type: 'object',
      properties: {
        pickupLat: { type: 'string' },
        pickupLng: { type: 'string' },
        limit: { type: 'string', minimum: 1 },
        page: { type: 'string', minimum: 1 },
        name: { type: 'string' },
        distance: { type: 'string' },
        time: { type: 'string' },
        serviceArea: { type: 'string' }
      }
      // additionalProperties: false
    },
    getService: {
      type: 'object',
      properties: {
        packageId: { type: 'string', ObjectId: true },
        serviceTypeId: { type: 'string', ObjectId: true }
      },
      required: ['packageId', 'serviceTypeId']
      // additionalProperties: false
    },
    createRequest: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        pickupAddress: { type: 'string' },
        pickupLat: { type: 'string' },
        pickupLng: { type: 'string' },
        dropAddress: { type: 'string' },
        dropLat: { type: 'string' },
        dropLng: { type: 'string' },
        requestFrom: { type: 'string' },
        paymentMethod: { type: 'string' },
        paymentMethodId: { type: 'string' }
      },
      required: ['vehicleId', 'pickupLat', 'pickupLng', 'requestFrom']
    }
  }

  static messages = {
    createRequest: {
      'required:vehicleId': 'vehicleId is required',
      'required:pickupLat': 'pickupLat is required',
      'required:pickupLng': 'pickupLng is required',
      'required:requestFrom': 'requestFrom is required'
    }
  }

  static getSchema(schemaName) {
    return () => {
      if (!this.schemas[schemaName]) {
        console.log(this.schemas[schemaName], '============this.schemas[schemaName]')
        throw new Error('Schema not found')
      }
      return this.schemas[schemaName]
    }
  }
}

export { RentalValidator }
