/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class Onboarding extends BaseModel {
  constructor() {
    super()
  }
}

const OnboardingSchema = mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    description: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    image: { type: String, default: 'public/frontend/onboarding/default.png' },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

OnboardingSchema.loadClass(Onboarding)

export default mongoose.model('Onboarding', OnboardingSchema)
