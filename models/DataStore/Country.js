/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class Country extends BaseModel {
  constructor() {
    super()
  }
}

const CountrySchema = mongoose.Schema({
  name: {
    type: String,
    default: '',
    options: {
      isSearch: true
    }
  },
  code: {
    type: String,
    default: '',
    options: {
      isSearch: true
    }
  },
  phonecode: {
    type: String,
    default: '',
    options: {
      isSearch: true
    }
  },
  status: {
    type: Boolean,
    default: true,
    options: {
      isSearch: true
    }
  },
  deletedAt: { type: Date, default: null }
})

CountrySchema.loadClass(Country)

export default mongoose.model('Country', CountrySchema)
