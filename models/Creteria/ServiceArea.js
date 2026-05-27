/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class ServiceArea extends BaseModel {
  constructor() {
    super()
  }
}
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    required: true
  },
  coordinates: {
    type: [[[Number]]], // Array of arrays of arrays of numbers
    required: true,
    index: '2dsphere'
  }
})
const ServiceAreaSchema = mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    centerPoint: { type: [Number], default: [0, 0] },
    polygon: { type: pointSchema, index: '2dsphere' },

    cityId: { type: mongoose.Types.ObjectId, required: true, default: null },
    stateId: { type: mongoose.Types.ObjectId, required: true, default: null },
    countryId: { type: mongoose.Types.ObjectId, required: true, default: null },

    customerPrefix: { type: String, default: '' },
    partnerPrefix: { type: String, default: '' },
    tripPrefix: { type: String, default: '' },

    status: {
      type: Boolean,
      default: true,
      options: {
        isSearch: true
      }
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

ServiceAreaSchema.loadClass(ServiceArea)

export default mongoose.model('ServiceArea', ServiceAreaSchema)
