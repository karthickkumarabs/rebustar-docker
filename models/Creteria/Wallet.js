/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId

class PartnerWallet extends BaseModel {
  constructor() {
    super()
  }
}

const PartnerWalletSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId },

    trx: {
      trxId: { type: ObjectId },
      description: { type: String, default: '' },
      trxAmt: { type: Number, default: 0 },
      trxType: { type: String },
      type: { type: String, default: 'credit' },
      totalBal: { type: Number, default: 0 },
      paymentDate: { type: Date, default: Date.now }
    }
  },
  {
    timestamps: true,
    usePushEach: true
  }
)

PartnerWalletSchema.loadClass(PartnerWallet)

export default mongoose.model('Wallet', PartnerWalletSchema)
