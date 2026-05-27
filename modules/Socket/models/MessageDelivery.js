/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../../models/BaseModel.js'
import mongoose from 'mongoose'

class MessageDelivery extends BaseModel {
  constructor() {
    super()
  }
}

const messageDeliverySchema = mongoose.Schema(
  {
    messageId: { type: mongoose.Types.ObjectId, ref: 'messages', default: null },
    senderId: { type: mongoose.Types.ObjectId, default: null },
    receiverId: { type: mongoose.Types.ObjectId, default: null },
    seenAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

messageDeliverySchema.loadClass(MessageDelivery)

export default mongoose.model('messageDelivery', messageDeliverySchema)
