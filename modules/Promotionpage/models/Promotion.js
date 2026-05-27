/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../../models/BaseModel.js'
import mongoose from 'mongoose'
const Schema = mongoose.Schema

class Promotion extends BaseModel {
  constructor() {
    super()
  }
}

const FeatureSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  }
})

const PromotionSchema = mongoose.Schema(
  {
    serviceTypeId: {
      type: mongoose.Types.ObjectId,
      ref: 'ServiceType',
      required: true
    },
    description: {
      type: String,
      required: true
    },
    features: {
      type: [FeatureSchema],
      default: []
    },
    status: {
      type: String,
      default: 'Active',
      enum: ['Active', 'Inactive']
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

PromotionSchema.loadClass(Promotion)

export default mongoose.model('Promotion', PromotionSchema)
