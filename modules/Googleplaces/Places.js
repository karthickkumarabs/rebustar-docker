/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../models/BaseModel.js'
import mongoose from 'mongoose'

class googleAutoCompletePlaces extends BaseModel {
  constructor() {
    super()
  }
}

const places = mongoose.Schema(
  {
    title: { type: String, default: '' },
    address: { type: String, default: '' },
    latitude: { type: Number, default: 0.0 },
    longitude: { type: Number, default: 0.0 },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

places.loadClass(googleAutoCompletePlaces)

export default mongoose.model('googlePlaces', places)
