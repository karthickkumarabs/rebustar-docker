/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
import { Enum } from '../../../utils/Enum.js'

class ReferralTansaction extends BaseModel {
  constructor() {
    super()
  }
}

const referralSchema = mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, default: null },
    reportType: {
      type: String,
      enum: [Enum.REFERRALTYPES.BYUSING, Enum.REFERRALTYPES.BYREFERRED],
      default: Enum.REFERRALTYPES.BYREFERRED
    },

    referrerId: { type: mongoose.Schema.Types.ObjectId, default: null }, // sharedbyId
    referrerType: { type: String, enum: [Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER], default: '' },

    refereeId: { type: mongoose.Types.ObjectId, default: null }, // UsedbyId
    refereeType: { type: String, enum: [Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER], default: '' },

    amount: { type: Number, default: 0 },
    type: {
      type: String,
      enum: [Enum.PAYMENT.MODE.CREDIT, Enum.PAYMENT.MODE.DEBIT],
      default: Enum.PAYMENT.MODE.CREDIT
    }
  },
  { timestamps: true }
)

referralSchema.loadClass(ReferralTansaction)

export default mongoose.model('ReferralTansactions', referralSchema)
