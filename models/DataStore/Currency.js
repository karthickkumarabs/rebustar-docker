/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose, { ObjectId } from 'mongoose'

class Currency extends BaseModel {
  constructor() {
    super()
  }
}

const CurrencySchema = mongoose.Schema({
  country: {
    type: ObjectId,
    ref: 'Country',
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
  },
  code: {
    type: String,
    default: '',
    options: {
      isSearch: true
    }
  },
  symbol: {
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
  isDefault: {
    type: Boolean,
    default: false,
    options: {
      isSearch: true
    }
  },
  deletedAt: { type: Date, default: null }
})

CurrencySchema.pre('find', function (next) {
  // remove is a one of the hook here we replace the any particular hook
  this.model().softDeleteMiddleware.bind(this)(next, this._mongooseOptions.queryOptions)
})

CurrencySchema.loadClass(Currency)

export default mongoose.model('Currency', CurrencySchema)
