/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
import { Enum } from '../../../utils/Enum.js'

class Package extends BaseModel {
  constructor() {
    super()
  }
}

const PackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      options: {
        isSearch: true
      }
    },
    description: {
      type: String,
      options: {
        isSearch: true
      }
    },
    image: { type: String, default: 'public/package/subscription.png' },
    type: {
      type: String,
      enum: [Enum.PACKAGE.TYPE.SUBSCRIPTION, Enum.PACKAGE.TYPE.TOPUP],
      default: Enum.PACKAGE.TYPE.SUBSCRIPTION,
      options: {
        isSearch: true
      }
    },
    amount: {
      type: Number,
      default: 0,
      options: {
        isSearch: true
      }
    },
    validity: {
      type: Number,
      default: 1,
      options: {
        isSearch: true
      }
    },
    credits: {
      type: Number,
      default: 0,
      options: {
        isSearch: true
      }
    },
    newPurchaseDiscount: { type: Number, default: 0 }, // in Rupees
    newPurchaseFreeTrips: { type: Number, default: 0 }, // trips count
    adminCommission: { type: Number, default: 0 }, // in percentage
    extendedValidityForNewPurchase: { type: Number, default: 0 },
    userlimit: { type: Number, default: 0 },
    serviceArea: { type: [mongoose.Types.ObjectId], default: [] },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

PackageSchema.loadClass(Package)

export default mongoose.model('package', PackageSchema)
