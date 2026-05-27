/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
import { Enum } from '../../../utils/Enum.js'
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId

class Document extends BaseModel {
  constructor() {
    super()
  }
}
const DocumentFieldSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      Enum.DOCUMENT.FILETYPE.TEXT,
      Enum.DOCUMENT.FILETYPE.IMAGE,
      Enum.DOCUMENT.FILETYPE.DATE,
      Enum.DOCUMENT.FILETYPE.DEFAULT
    ],
    default: Enum.DOCUMENT.FILETYPE.DEFAULT
  },
  name: { type: String, default: '' },
  indexName: { type: String, default: '' }
})

const DocumentSchema = new mongoose.Schema(
  {
    serviceCities: {
      type: [ObjectId],
      default: [],
      options: {
        isSearch: true
      }
    },
    type: {
      type: String,
      enum: [Enum.DOCUMENT.TYPE.PARTNER, Enum.DOCUMENT.TYPE.VEHICLE, Enum.DOCUMENT.TYPE.DEFAULT],
      default: Enum.DOCUMENT.TYPE.DEFAULT,
      options: {
        isSearch: true
      }
    },
    name: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    }, // eg
    indexName: { type: String, default: '' }, // eg. panCard
    mandatory: { type: Boolean, default: false },
    status: { type: Boolean, default: true },
    description: { type: String, default: '' },
    fields: [DocumentFieldSchema],
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

DocumentSchema.loadClass(Document)

export default mongoose.model('Document', DocumentSchema)
