/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class Year extends BaseModel {
  constructor() {
    super()
  }
}

const YearSchema = mongoose.Schema({
  name: {
    type: String,
    default: 'Year',
    options: {
      isSearch: true
    }
  },
  status: { type: Boolean, default: true },
  datas: [{ name: Number }],
  deletedAt: { type: Date, default: null }
})

YearSchema.loadClass(Year)

export default mongoose.model('Year', YearSchema)
