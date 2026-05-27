/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId

class ShareRide extends BaseModel {
  constructor() {
    super()
  }
}

const reqCustomerSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, default: '' },
    pickupLocation: { type: String, default: '' },
    dropLocation: { type: String, default: '' },
    startCoords: { type: [Number], default: [0, 0] },
    endCoords: { type: [Number], default: [0, 0] },
    seats: { type: Number, default: 1 },
    status: { type: String, default: 'requested' }, // requested,accepted,declined,completed
    notes: { type: String, default: '' },
    tripNo: { type: String, default: '' },
    tripStatus: { type: String, default: 'accepted' },
    tripDist: { type: String, default: '' }
  },
  { timestamps: false }
)

const ShareRideSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, default: Date.now },
    tripId: { type: ObjectId, ref: 'Trip', default: null },
    sharePostId: { type: ObjectId, ref: 'SharePost', default: null },
    partnerId: { type: ObjectId, ref: 'Partner', default: null },
    triptype: { type: String, default: 'daily' }, // daily/outstation
    reqCustomers: [reqCustomerSchema]
  },
  { timestamps: true }
)

ShareRideSchema.loadClass(ShareRide)

export default mongoose.model('ShareRide', ShareRideSchema)
