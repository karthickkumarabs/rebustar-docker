/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class ServiceTracker extends BaseModel {
  constructor() {
    super()
  }
}

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['LineString'],
    required: true,
    default: 'LineString'
  },
  coordinates: {
    type: [[Number]], // Array of arrays with number
    required: true,
    default: []
  }
})

const ServiceTrackerSchema = mongoose.Schema(
  {
    requestId: { type: mongoose.Types.ObjectId, ref: 'trips', default: null },
    bearing: { type: Number, default: 0 },
    startcoords: { type: [Number], default: [0, 0] },
    endcoords: { type: [Number], default: [0, 0] },
    lastcoords: { type: [Number], default: [0, 0] },
    pickupPolyline: { type: pointSchema, default: { type: 'LineString', coordinates: [] } },
    dropPolyline: { type: pointSchema, default: { type: 'LineString', coordinates: [] } },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

ServiceTrackerSchema.loadClass(ServiceTracker)

export default mongoose.model('ServiceTracker', ServiceTrackerSchema)
