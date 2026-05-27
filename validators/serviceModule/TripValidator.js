/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'
import { Enum } from '../../utils/Enum.js'

class TripValidator extends BaseValidator {
  constructor() {
    super()
  }

  static schemas = {
    getMultiStopEstimation: {
      type: 'object',
      properties: {
        stops: {
          type: 'array',
          minItems: 3,
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              latitude: { type: 'string' },
              longitude: { type: 'string' }
            },
            required: ['latitude', 'longitude'],
            additionalProperties: false
          }
        },
        time: { type: 'string' }
      },
      required: ['stops'],
      additionalProperties: false
    },
    changeDestination: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        latitude: { type: 'string' },
        longitude: { type: 'string' }
      },
      required: ['requestId', 'latitude', 'longitude'],
      additionalProperties: false
    },
    multiStopTripRequest: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        requestFrom: { type: 'string' },
        paymentMethod: { type: 'string' },
        paymentMethodId: { type: 'string' },
        stops: {
          type: 'array',
          minItems: 2,
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              latitude: { type: 'string' },
              longitude: { type: 'string' }
            },
            required: ['latitude', 'longitude'],
            additionalProperties: false
          }
        },
        time: { type: 'string' }
      },
      required: ['stops', 'vehicleId'],
      additionalProperties: true
    },
    getNearbyPartners: {
      type: 'object',
      properties: {
        latitude: { type: 'string' },
        longitude: { type: 'string' }
      },
      required: ['latitude', 'longitude']
    },
    getEstimation: {
      type: 'object',
      properties: {
        pickupLat: { type: 'string' },
        pickupLng: { type: 'string' },
        dropLat: { type: 'string' },
        dropLng: { type: 'string' },
        promoCode: { type: 'string' },
        time: { type: 'string' }
      },
      required: ['pickupLat', 'pickupLng', 'dropLat', 'dropLng']
    },
    patchRequestStatus: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        status: { type: 'string' }
      },
      required: ['requestId', 'status']
    },
    updateRequest: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        status: { type: 'string' },
        latitude: { type: 'string' },
        longitude: { type: 'string' },
        requestTime: { type: 'string' }
      },
      required: ['requestId', 'status', 'latitude', 'longitude', 'requestTime']
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
        // time: { type: 'string' },
        requestFrom: { type: 'string' },
        paymentMethod: { type: 'string' },
        paymentMethodId: { type: 'string' }
      },
      required: ['vehicleId', 'pickupLat', 'pickupLng', 'dropLat', 'dropLng', /* 'time',*/ 'requestFrom']
    },
    feedBack: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        rating: { type: 'number' },
        comments: { type: 'string' }
      },
      required: ['requestId', 'rating', 'comments']
    },
    getReviewDetails: {
      type: 'object',
      properties: {
        userType: { type: 'string' },
        userId: {
          type: 'string',
          enum: [Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]
        },
        reportType: { type: 'string', enum: ['GIVEN', 'GET'] },
        limit: { type: 'string' },
        page: { type: 'string' }
      },
      required: ['userType', 'limit', 'page', 'reportType']
    }
  }

  static messages = {
    getNearbyPartners: {
      'required:latitude': 'latitude is required',
      'required:longitude': 'longitude is required'
    },
    getEstimation: {
      'required:pickupLat': 'pickupLat is required',
      'required:pickupLng': 'pickupLng is required',
      'required:dropLat': 'dropLat is required',
      'required:dropLng': 'dropLng is required',
      'required:time': 'time is required'
    },
    getEstimation: {
      'required:stops': 'stops data required'
    },
    patchRequestStatus: {
      'required:requestId': 'requestId is required',
      'required:status': 'status is required'
    },
    updateRequest: {
      'required:requestId': 'requestId is required',
      'required:status': 'status is required',
      'required:latitude': 'latitude is required',
      'required:longitude': 'longitude is required',
      'required:requestTime': 'requestTime is required'
    },
    createRequest: {
      'required:vehicleId': 'vehicleId is required',
      'required:pickupLat': 'pickupLat is required',
      'required:pickupLng': 'pickupLng is required',
      'required:dropLat': 'dropLat is required',
      'required:dropLng': 'dropLng is required',
      'required:time': 'time is required',
      'required:requestFrom': 'requestFrom is required'
    },
    feedBack: {
      'required:requestId': 'requestId is required',
      'required:rating': 'rating is required',
      'required:comments': 'comments is required'
    },
    getReviewDetails: {
      'required:userType': 'User Type is required',
      'required:limit': 'Limit is required',
      'required:page': 'Page is required',
      'required:reportType': 'Report Type is required'
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

export { TripValidator }
