/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class Pricing extends BaseModel {
  constructor() {
    super()
  }
}

const timeFareSchema = new mongoose.Schema({
  status: { type: Boolean, default: true },
  from: { type: String, default: '00:00:00' },
  to: { type: String, default: '00:00:00' },
  fare: {
    type: { type: String, default: 'amount', enum: ['amount', 'percentage'] },
    value: { type: Number, default: 0 }
  }
})

const distanceFareSchema = new mongoose.Schema({
  from: { type: Number, default: 0 },
  to: { type: Number, default: 0 },
  fare: {
    type: { type: String, default: 'unitRate', enum: ['unitRate', 'flatRate'] },
    value: { type: Number, default: 0 }
  },
  timeFare: { type: Number, default: 0 }
})

const PricingSchema = mongoose.Schema(
  {
    serviceId: { type: mongoose.Types.ObjectId, ref: 'ServiceType', default: null },
    serviceAreaId: { type: [mongoose.Types.ObjectId], ref: 'ServiceArea', default: null },
    currencyId: { type: mongoose.Types.ObjectId, ref: 'Currency', default: null },

    baseFare: { type: Number, default: 0 },
    bookingFare: { type: Number, default: 0 },

    fare: {
      type: { type: String, default: 'unitRate', enum: ['unitRate', 'flatRate'] },
      value: { type: Number, default: 0 }
    },
    timeFare: { type: Number, default: 0 },
    minimumFare: { type: Number, default: 0 },
    commision: { type: Number, default: 0 },

    cancelationFare: {
      partner: { type: Number, default: 0 },
      customer: { type: Number, default: 0 }
    },

    waitingFare: {
      status: { type: Boolean, default: false },
      allowedMin: { type: Number, default: 0 },
      fare: { type: Number, default: 0 }
    },

    taxFare: {
      status: { type: Boolean, default: false },
      fare: { type: Number, default: 0 }
    },

    additional: {
      peakFare: { type: [timeFareSchema], default: [] },
      nightFare: { type: [timeFareSchema], default: [] },
      distanceFare: { type: [distanceFareSchema] },
      pickupFare: {
        status: { type: Boolean, default: false },
        value: { type: Number, default: 0 }
      },
      bidding: {
        status: { type: Boolean, default: false },
        minimumAmountinpercentage: { type: Number, default: 0 },
        maximumAmountinpercentage: { type: Number, default: 0 }
      }
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

PricingSchema.loadClass(Pricing)

export default mongoose.model('Pricing', PricingSchema)
