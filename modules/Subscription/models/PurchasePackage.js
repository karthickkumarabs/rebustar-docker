/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
import { Enum } from '../../../utils/Enum.js'

class PurchasePackage extends BaseModel {
  constructor() {
    super()
  }
}

const PurchasePackageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, default: null },
    packageId: { type: mongoose.Types.ObjectId, ref: 'packages' },
    packageName: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    type: {
      type: String,
      enum: [Enum.PACKAGE.TYPE.SUBSCRIPTION, Enum.PACKAGE.TYPE.TOPUP],
      default: Enum.PACKAGE.TYPE.SUBSCRIPTION,
      options: {
        isSearch: true
      }
    },
    transactionId: { type: String },
    transactionType: { type: String },
    paymentMethod: { type: String },
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
    credits: { type: Number, default: 0 },
    userlimit: {
      type: Number,
      default: 0,
      options: {
        isSearch: true
      }
    },
    adminCommission: { type: Number, default: 0 },
    newPurchaseDiscount: { type: Number, default: 0 }, // in Rupees
    newPurchaseFreeTrips: { type: Number, default: 0 }, // trips count
    purchaseDate: {
      type: Date,
      default: null,
      options: {
        isSearch: true
      }
    },
    startDate: {
      type: Date,
      default: null,
      options: {
        isSearch: true
      }
    },
    endDate: {
      type: Date,
      default: null,
      options: {
        isSearch: true
      }
    },
    status: {
      type: String,
      default: Enum.PACKAGE.STATUS.PENDING,
      enum: [Enum.PACKAGE.STATUS.PENDING, Enum.PACKAGE.STATUS.ACTIVE, Enum.PACKAGE.STATUS.INACTIVE],
      options: {
        isSearch: true
      }
    },
    serviceArea: { type: [mongoose.Types.ObjectId], default: [] },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

PurchasePackageSchema.loadClass(PurchasePackage)

export default mongoose.model('purchasepackage', PurchasePackageSchema)
