/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../models/BaseModel.js'
import mongoose from 'mongoose'

class CancelReason extends BaseModel {
  constructor() {
    super()
  }
}

const CancelReasonSchema = mongoose.Schema({
  languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
  partnerCancelReason: [String],
  customerCancelReason: [String]
})

CancelReasonSchema.loadClass(CancelReason)

const CancelReasons = mongoose.model('CancelReason', CancelReasonSchema)

export default CancelReasons
