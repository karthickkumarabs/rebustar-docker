/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId

class City extends BaseModel {
  constructor() {
    super()
  }
}

const CitySchema = mongoose.Schema({
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
  country_id: { type: ObjectId, ref: 'countries', default: null },
  state_id: { type: ObjectId, ref: 'States', default: null },
  latitude: { type: Number, default: 0.0 },
  longitude: { type: Number, default: 0.0 },
  status: {
    type: Boolean,
    default: true,
    options: {
      isSearch: true
    }
  },
  deletedAt: { type: Date, default: null }
})

CitySchema.loadClass(City)

export default mongoose.model('City', CitySchema)
