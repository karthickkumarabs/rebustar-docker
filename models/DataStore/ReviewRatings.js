/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

const ReviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true },
    customer: {
      comment: { type: [String], required: true }
    },
    partner: {
      comment: { type: [String], required: true }
    }
  },
  { timestamps: true }
)

export default mongoose.model('Review', ReviewSchema)
