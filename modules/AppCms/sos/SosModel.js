/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'

class SosModel extends BaseModel {
  constructor() {
    super()
  }
}

const SosSchema = new mongoose.Schema({
  title: {
    type: String,
    default: '',
    options: {
      isSearch: true
    }
  },
  subTitle: {
    type: String,
    default: ''
  },
  displayOrder: {
    type: Number,
    default: 1
  },
  image: {
    type: String,
    default: ''
  },
  status: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
})

SosSchema.loadClass(SosModel)

export default mongoose.model('Sos', SosSchema)
