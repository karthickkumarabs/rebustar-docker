/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'

class Language extends BaseModel {
  constructor() {
    super()
  }
}

const LanguageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      options: {
        isSearch: true
      }
    },
    indexName: {
      type: String,
      options: {
        isSearch: true
      }
    },
    status: {
      type: Boolean,
      default: false,
      options: {
        isSearch: true
      }
    },
    file: {
      type: String,
      default: ''
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

LanguageSchema.loadClass(Language)

export default mongoose.model('Language', LanguageSchema)
