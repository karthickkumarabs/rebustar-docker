/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
import { Enum } from '../../../utils/Enum.js'

class Messages extends BaseModel {
  constructor() {
    super()
  }
}

const messageSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, default: null },
    userType: {
      type: String,
      enum: [Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER],
      default: Enum.ROLES.ADMIN
    },
    tripId: { type: mongoose.Types.ObjectId, ref: 'trips', default: null },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['text', 'file', 'image'],
      default: 'text'
    },
    content: { type: String, default: '' },
    context: { type: mongoose.Types.ObjectId, ref: 'messages', default: null },
    seen: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

messageSchema.loadClass(Messages)

export default mongoose.model('messages', messageSchema)
