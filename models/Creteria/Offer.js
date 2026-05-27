/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class Offer extends BaseModel {
  constructor() {
    super()
  }
}

const offerSchema = new mongoose.Schema(
  {
    start: {
      type: Date,
      options: {
        isSearch: true
      }
    },
    end: {
      type: Date,
      options: {
        isSearch: true
      }
    },
    title: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    description: { type: String, default: '' },
    offerImg: { type: String, default: 'public/Offer/default.png' },
    scIds: { type: [mongoose.Types.ObjectId], default: [] },
    hasCoupon: { type: Boolean, default: true },
    couponId: { type: mongoose.Types.ObjectId, default: null },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

offerSchema.pre('find', function (next) {
  // remove is a one of the hook here we replace the any particular hook
  this.model().softDeleteMiddleware.bind(this)(next, this._mongooseOptions.queryOptions)
})

offerSchema.loadClass(Offer)

export default mongoose.model('offer', offerSchema)
