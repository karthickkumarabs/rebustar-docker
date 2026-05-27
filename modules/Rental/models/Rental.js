/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'

class RentalPackage extends BaseModel {
  constructor() {
    super()
  }
}

const ServiceTypesSchema = new mongoose.Schema({
  serviceType: { type: mongoose.Types.ObjectId, ref: 'ServiceType' },
  currencyId: {
    type: mongoose.Types.ObjectId,
    ref: 'Currency',
    default: null
  },
  baseFare: { type: Number, required: true },
  cancellationFarePartner: { type: Number, default: 0, required: true },
  cancellationFareRider: { type: Number, default: 0, required: true },
  distanceFare: { type: Number, default: 0, required: true },
  timeFare: { type: Number, default: 0, required: true },
  bookingFare: { type: Number, default: 0, required: true },
  commision: { type: Number, default: 0, required: true },
  taxFare: {
    status: { type: Boolean, default: false },
    fare: { type: Number, default: 0 }
  },
  waitingFare: {
    status: { type: Boolean, default: false },
    fare: { type: Number, default: 0 },
    allowedTime: { type: Number, default: 0 } // in minutes
  }
})

const RentalPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    serviceAreaIds: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'ServiceArea'
      }
    ],
    serviceTypes: [ServiceTypesSchema],
    distance: { type: Number, required: true }, // Try to keep in KiloMeters for better calc
    time: { type: Number, required: true }, // Try to keep in minutes for a better calc
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)
RentalPackageSchema.pre('find', function () {
  this.where({ deletedAt: null })
  this.populate({
    path: 'serviceTypes.serviceType',
    match: { status: 'Available' },
    select: 'name status'
  })
})

RentalPackageSchema.loadClass(RentalPackage)

export default mongoose.model('RentalPackages', RentalPackageSchema)
