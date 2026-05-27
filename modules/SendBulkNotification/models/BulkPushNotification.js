/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../../models/BaseModel.js'
import mongoose from 'mongoose'

class BulkPushNotification extends BaseModel {
  constructor() {
    super()
  }
}

const BulkpushNotificationSchema = mongoose.Schema(
  {
    forWhom: { type: String, default: '' },
    message: { type: String, default: '' },
    forType: { type: Number, default: null }, // 1 -> push, 2 -> SMS
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
)

BulkpushNotificationSchema.loadClass(BulkPushNotification)

export default mongoose.model('pushnotificbackup', BulkpushNotificationSchema)
