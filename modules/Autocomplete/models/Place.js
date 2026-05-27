/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../../models/BaseModel.js'
import mongoose from 'mongoose'

class Place extends BaseModel {
  constructor() {
    super()
  }
}

const PlaceSchema = new mongoose.Schema(
  {
    placeId: { type: String, required: true, unique: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now, expires: '180d' } // Expire after 180 days
  },
  { timestamps: true, usePushEach: true }
)

PlaceSchema.loadClass(Place)
export default mongoose.model('Place', PlaceSchema)
