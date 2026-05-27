/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

// class StripeLog {
//   constructor() {}
// }

const StripeLogSchema = new mongoose.Schema(
  {
    responseData: { type: String },
    bodyData: { type: String },
    status: { type: String, default: 'Pending' },
    transactionId: { type: String }
  },
  { timestamps: true }
)

// StripeLogSchema.loadClass(StripeLog)

export default mongoose.model('StripeLog', StripeLogSchema)
