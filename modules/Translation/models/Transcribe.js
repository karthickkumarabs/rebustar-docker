/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'

class Transcribe extends BaseModel {
  constructor() {
    super()
  }
}

const TranscribeSchema = new mongoose.Schema(
  {
    translation: {
      type: mongoose.Types.ObjectId,
      ref: 'Translation',
      default: null,
      options: {
        isSearch: true
      }
    },
    language: {
      type: mongoose.Types.ObjectId,
      ref: 'Language',
      options: {
        isSearch: true
      }
    },
    describe: {
      type: String,
      options: {
        isSearch: true
      }
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

TranscribeSchema.loadClass(Transcribe)

export default mongoose.model('Transcribe', TranscribeSchema)
