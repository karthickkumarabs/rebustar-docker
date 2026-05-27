/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
import { Enum } from '../../../utils/Enum.js'

class Cancelreport extends BaseModel {
  constructor() {
    super()
  }
}

const CancelreportSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, default: null },
    userType: { type: String, enum: [Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER], default: '' },
    nooftripsCancelled: { type: Number, default: 0 },
    isblockedDate: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now() },
    updatedAt: { type: Date, default: Date.now() }
  },
  { timestamps: true }
)

CancelreportSchema.loadClass(Cancelreport)

export default mongoose.model('Cancelreports', CancelreportSchema)
