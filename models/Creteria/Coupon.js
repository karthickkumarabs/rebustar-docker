/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../BaseModel.js'
import { Enum } from '../../utils/Enum.js'

class Coupon extends BaseModel {
  constructor() {
    super()
  }
}

const claims = mongoose.Schema({
  referenceId: { type: String, default: null },
  module: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, default: null },
  userRole: {
    type: String,
    default: Enum.ROLES.CUSTOMER,
    enum: [Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER, Enum.ROLES.COMPANY]
  }
})

const couponSchema = mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
      options: {
        isSearch: true
      }
    },
    start: {
      type: String,
      options: {
        isSearch: true
      }
    },
    startTime: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    end: {
      type: String,
      options: {
        isSearch: true
      }
    },
    endTime: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    limit: { type: Number, default: 100 }, // Only this much timeto use
    userLimit: { type: Number, default: 0 },
    fare: {
      type: { type: String, default: 'Flatrate', enum: ['Percentage', 'Flatrate'] },
      value: { type: Number, default: 0 }
    },
    offerValue: { type: Number, default: 0 },
    offerLimit: { type: Number, default: 0 },
    status: { type: Boolean, default: true },
    tripType: [String], // daily/rental/outstation
    applyType: { type: String, enum: ['Auto', 'Manual'], default: 'Manual' },
    scIds: { type: [mongoose.Types.ObjectId], default: [] },
    claims: { type: [claims], default: [] },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

couponSchema.loadClass(Coupon)

export default mongoose.model('Coupons', couponSchema)
