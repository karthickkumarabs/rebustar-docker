/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../../models/BaseModel.js'
import mongoose, { ObjectId } from 'mongoose'

import { Enum } from '../../../utils/Enum.js'

class Merchant extends BaseModel {
  constructor() {
    super()
  }
}

const PaymentMethod = mongoose.Schema(
  {
    module: { type: String, default: null },
    referenceId: { type: String, default: null },
    contactRefId: { type: String, default: null },
    description: { type: String, default: null },
    details: { type: Object, default: {} },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

const PayoutMethod = mongoose.Schema(
  {
    module: { type: String, default: null },
    referenceId: { type: String, default: null },
    description: { type: String, default: null },
    details: { type: Object, default: {} },
    status: {
      type: String,
      enum: [Enum.PAYMENT.STATUS.PENDING, Enum.PAYMENT.STATUS.APPROVED],
      default: Enum.PAYMENT.STATUS.PENDING
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

const MerchantSchema = mongoose.Schema(
  {
    serviceAreaId: { type: ObjectId, default: null },
    userId: { type: ObjectId, default: null },
    userType: {
      type: String,
      enum: [Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER, Enum.ROLES.COMPANY],
      default: Enum.ROLES.ADMIN,
      options: {
        isSearch: true
      }
    },
    status: {
      type: String,
      enum: [Enum.PAYMENT.STATUS.PENDING, Enum.PAYMENT.STATUS.APPROVED, Enum.PAYMENT.STATUS.REJECTED],
      default: Enum.PAYMENT.STATUS.PENDING
    },
    lastTransaction: { type: ObjectId, ref: 'Transaction', default: null },
    balance: {
      type: Number,
      default: 0,
      options: {
        isSearch: true
      }
    },
    paymentMethods: { type: [PaymentMethod], default: [] },
    payoutMethods: { type: [PayoutMethod], default: [] },
    createdBy: {
      type: String,
      enum: [Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER, Enum.ROLES.COMPANY],
      default: Enum.ROLES.ADMIN
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

MerchantSchema.loadClass(Merchant)

export default mongoose.model('merchants', MerchantSchema)
