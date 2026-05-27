/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../../models/BaseModel.js'
import mongoose from 'mongoose'
import { Enum } from '../../../utils/Enum.js'
const Schema = mongoose.Schema

class OutstationPackage extends BaseModel {
  constructor() {
    super()
  }
}

const ServiceTypeSchema = new Schema({
  serviceType: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceType',
    required: true
  },
  currencyId: {
    type: mongoose.Types.ObjectId,
    ref: 'Currency',
    default: null
  },
  bookingFare: { type: Number, default: 0 },
  commision: { type: Number, default: 0 },
  taxFare: {
    status: { type: Boolean, default: false },
    fare: { type: Number, default: 0 }
  },
  tripType: {
    type: String,
    default: Enum.OUTSTATION.TRIP_TYPE.ONEWAY,
    enum: [Enum.OUTSTATION.TRIP_TYPE.ONEWAY, Enum.OUTSTATION.TRIP_TYPE.ROUND],
    required: true
  },
  baseFare: { type: Number, default: 0, required: true },
  extraDistanceFare: {
    type: Number,
    required: true
  },
  extraHoursFare: {
    type: Number,
    required: true
  }
})

const outstationPackageSchema = mongoose.Schema(
  {
    packageName: {
      type: String,
      required: true
    },
    hours: {
      type: Number,
      required: true
    },
    distance: {
      type: Number,
      required: true
    },
    serviceType: {
      type: [ServiceTypeSchema],
      default: []
    },
    serviceArea: {
      type: [mongoose.Types.ObjectId],
      ref: 'ServiceArea',
      required: true
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

outstationPackageSchema.pre('find', function (next) {
  // remove is a one of the hook here we replace the any particular hook
  this.model().softDeleteMiddleware.bind(this)(next, this._mongooseOptions.queryOptions)
})

outstationPackageSchema.pre('countDocuments', function (next) {
  // Apply the soft delete middleware before counting documents
  this.model().softDeleteMiddleware.bind(this)(next, this._mongooseOptions.queryOptions)
})

outstationPackageSchema.loadClass(OutstationPackage)

export default mongoose.model('OutstationPackage', outstationPackageSchema)
