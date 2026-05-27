/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId

class Model extends BaseModel {
  constructor() {
    super()
  }
}

const ModelSchema = mongoose.Schema({
  name: {
    type: String,
    default: '',
    options: {
      isSearch: true
    }
  },
  year: {
    type: String,
    default: '',
    options: {
      isSearch: true
    }
  },
  make_id: { type: ObjectId, ref: 'Makes', default: null },
  status: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
})

ModelSchema.loadClass(Model)

export default mongoose.model('Model', ModelSchema)
