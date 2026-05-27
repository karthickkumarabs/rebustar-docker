/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'

class Translation extends BaseModel {
  constructor() {
    super()
  }
}

const TranslationSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Types.ObjectId,
      ref: 'Translation',
      default: null,
      options: {
        isSearch: true
      }
    },
    interpret: {
      type: String,
      options: {
        isSearch: true
      }
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

TranslationSchema.loadClass(Translation)

export default mongoose.model('Translation', TranslationSchema)
