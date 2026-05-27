/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose, { ObjectId } from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
import { Enum } from '../../../utils/Enum.js'

class BiddingModel extends BaseModel {
  constructor() {
    super()
  }
}
const BiddingTransaction = new mongoose.Schema({
  userId: {
    type: ObjectId,
    required: true
  },
  userType: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    default: ''
  },
  userprofile: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: [
      Enum.BIDDING.BIDDINGTRANSACTIONSTATUS.PENDING,
      Enum.BIDDING.BIDDINGTRANSACTIONSTATUS.ACCEPTED,
      Enum.BIDDING.BIDDINGTRANSACTIONSTATUS.REJECTED
    ],
    default: Enum.BIDDING.BIDDINGTRANSACTIONSTATUS.PENDING,
    required: true
  }
})
const BiddingSchema = new mongoose.Schema(
  {
    tripId: {
      type: ObjectId,
      required: true
    },
    userId: {
      type: ObjectId,
      required: true
    },
    transactions: [BiddingTransaction],
    status: {
      type: String,
      enum: [Enum.BIDDING.BIDDINGSTATUS.OPEN, Enum.BIDDING.BIDDINGSTATUS.CLOSE],
      default: Enum.BIDDING.BIDDINGSTATUS.OPEN,
      required: true
    },
    finalAmount: {
      type: Number,
      required: false
    }
  },
  { timestamps: true }
)
BiddingSchema.loadClass(BiddingModel)

export const BiddingModels = mongoose.model('Bidding', BiddingSchema)
