/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'
const Schema = mongoose.Schema

class Document extends BaseModel {
  constructor() {
    super()
  }
}

const documentSchema = mongoose.Schema(
  {
    user_id: { type: Schema.Types.ObjectId },
    name: { type: String },
    field: [
      {
        name: { type: String },
        value: { type: String }
      }
    ]
  },
  { timestamps: true }
)

documentSchema.loadClass(Document)

export default mongoose.model('Document', documentSchema)
