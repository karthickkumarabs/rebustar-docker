/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class Language extends BaseModel {
  constructor() {
    super()
  }
}

const LanguageSchema = mongoose.Schema({
  code: { type: String, default: 'en' },
  name: { type: String, default: '' },
  status: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
})

LanguageSchema.loadClass(Language)

export default mongoose.model('LanguageOld', LanguageSchema)
