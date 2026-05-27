/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class Make extends BaseModel {
  constructor() {
    super()
  }
}

const MakeSchema = mongoose.Schema({
  name: {
    type: String,
    default: '',
    options: {
      isSearch: true
    }
  },
  status: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
})

MakeSchema.loadClass(Make)

export default mongoose.model('Make', MakeSchema)
