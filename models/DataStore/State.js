/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId

class State extends BaseModel {
  constructor() {
    super()
  }
}

const StateSchema = mongoose.Schema({
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
  status: {
    type: Boolean,
    default: true,
    options: {
      isSearch: true
    }
  },
  deletedAt: { type: Date, default: null }
})

StateSchema.loadClass(State)

export default mongoose.model('State', StateSchema)
