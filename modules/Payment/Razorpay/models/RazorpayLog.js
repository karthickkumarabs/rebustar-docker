/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

const RazorpayLogSchema = new mongoose.Schema(
  {
    transactionReference: { type: String },
    requestPayload: { type: mongoose.Schema.Types.Mixed },
    responsePayload: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    type: {
      type: String,
      enum: ['init', 'verify', 'transfer', 'transfer_finalize', 'charge'],
      required: true
    },
    message: { type: String }
  },
  { timestamps: true }
)

export default mongoose.model('RazorpayLog', RazorpayLogSchema)
