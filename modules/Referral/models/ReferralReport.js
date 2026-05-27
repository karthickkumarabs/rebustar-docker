/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
import { Enum } from '../../../utils/Enum.js'

class Referralreport extends BaseModel {
  constructor() {
    super()
  }
}

const ReferralreportSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, default: null },
    userType: { type: String, enum: [Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER], default: '' },
    referralCount: { type: Number, default: 0 },
    referedCount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    lastTransaction: { type: mongoose.Types.ObjectId, default: null },
    createdAt: { type: Date, default: Date.now() }
  },
  { timestamps: true }
)

ReferralreportSchema.loadClass(Referralreport)

export default mongoose.model('Referralreports', ReferralreportSchema)
