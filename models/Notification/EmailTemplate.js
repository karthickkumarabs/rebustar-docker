/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class EmailTemplate extends BaseModel {
  constructor() {
    super()
  }
}

const emailTemplateSchema = mongoose.Schema(
  {
    subject: { type: String },
    description: { type: String },
    body: { type: String },
    status: { type: Boolean },
    header: { type: String },
    language: { type: String, default: 'en' },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

emailTemplateSchema.loadClass(EmailTemplate)

export default mongoose.model('emailtemplate', emailTemplateSchema)
