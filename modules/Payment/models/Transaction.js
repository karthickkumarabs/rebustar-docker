/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../../models/BaseModel.js'
import mongoose, { ObjectId } from 'mongoose'

import { Enum } from '../../../utils/Enum.js'
import { Config } from '../../../config/AppConfig.js'

class Transaction extends BaseModel {
  constructor() {
    super()
  }
}

const TransactionSchema = mongoose.Schema(
  {
    module: {
      type: String,
      enum: [
        Enum.PAYMENT.MODULES.TRIP,
        Enum.PAYMENT.MODULES.SUBSCRIPTION,
        Enum.PAYMENT.MODULES.ADJUSTMENT,
        Enum.PAYMENT.MODULES.REFUND,
        Enum.PAYMENT.MODULES.REFERRAL,
        Enum.PAYMENT.MODULES.CANCEL,
        Enum.PAYMENT.MODULES.SIGNUP_BONUS,
        Enum.PAYMENT.MODULES.PAYOUT,
        Enum.PAYMENT.MODULES.WALLET
      ],
      default: Enum.PAYMENT.MODULES.TRIP,
      options: {
        isSearch: true
      }
    },
    referenceId: {
      type: String,
      default: null,
      options: {
        isSearch: true
      }
    },
    description: { type: String, default: null },

    serviceAreaId: { type: ObjectId, default: null },
    userId: { type: ObjectId, default: null },
    userType: {
      type: String,
      enum: [Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER, Enum.ROLES.COMPANY],
      default: Enum.ROLES.ADMIN
    },

    // paidAmount: { type: Number, default: 0 },
    // payableAmount: { type: Number, default: 0 },
    // earnings: { type: Number, default: 0 },

    amount: {
      type: Number,
      default: 0,
      options: {
        isSearch: true
      }
    },
    mode: {
      type: String,
      enum: [Enum.PAYMENT.MODE.CREDIT, Enum.PAYMENT.MODE.DEBIT],
      default: Enum.PAYMENT.MODE.CREDIT,
      options: {
        isSearch: true
      }
    },
    balance: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    currency: { type: String, default: Config.app.currency },
    createdBy: {
      type: String,
      enum: [Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER, Enum.ROLES.COMPANY],
      default: Enum.ROLES.ADMIN
    },
    deletedAt: { type: Date, default: null },
    status: { type: String, enum: ['hold', 'approved', 'rejected'], default: 'approved' }
  },
  { timestamps: true, usePushEach: true }
)

TransactionSchema.loadClass(Transaction)

export default mongoose.model('transaction', TransactionSchema)
