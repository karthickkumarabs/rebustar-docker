/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../../../validators/BaseValidator.js'

class ShareRideValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    createShareRideRequest: {
      type: 'object',
      properties: {
        serviceTypeId: { type: 'string' },
        pickupAddress: { type: 'string' },
        pickupLat: { type: 'string' },
        pickupLng: { type: 'string' },
        dropAddress: { type: 'string' },
        dropLat: { type: 'string' },
        dropLng: { type: 'string' },
        requestFrom: { type: 'string' },
        scheduleOn: { type: 'string' },
        id: { type: 'string' },
        perSeatRate: { type: 'string' }
      },
      required: [
        'serviceTypeId',
        'pickupLat',
        'pickupLng',
        'dropLat',
        'dropLng',
        /* 'time',*/ 'requestFrom',
        'scheduleOn',
        'id',
        'perSeatRate'
      ]
    },
    updateShareRideRequest: {
      type: 'object',
      properties: {
        serviceTypeId: { type: 'string' },
        pickupAddress: { type: 'string' },
        pickupLat: { type: 'string' },
        pickupLng: { type: 'string' },
        dropAddress: { type: 'string' },
        dropLat: { type: 'string' },
        dropLng: { type: 'string' },
        // time: { type: 'string' },
        requestFrom: { type: 'string' },
        paymentMethod: { type: 'string' },
        paymentMethodId: { type: 'string' },
        scheduleOn: { type: 'string' },
        id: { type: 'string' },
        perSeatRate: { type: 'string' }
      }
    },
    matchForShareRide: {
      type: 'object',
      properties: {
        pickupAddress: { type: 'string' },
        pickupLat: { type: 'string' },
        pickupLng: { type: 'string' },
        dropAddress: { type: 'string' },
        dropLat: { type: 'string' },
        dropLng: { type: 'string' },
        // time: { type: 'string' },
        requestFrom: { type: 'string' },
        scheduleOn: { type: 'string' }
      }
    }
  }

  static messages = {
    createShareRideRequest: {
      'required:serviceTypeId': 'serviceType Id is required',
      'required:pickupLat': 'pickupLat is required',
      'required:pickupLng': 'pickupLng is required',
      'required:dropLat': 'dropLat is required',
      'required:dropLng': 'dropLng is required',
      'required:requestFrom': 'requestFrom is required',
      'required:scheduleOn': 'scheduleOn is required',
      'required:id': 'Partner Id is required',
      'required:perSeatRate': 'perSeatRate is required'
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

export { ShareRideValidator }
