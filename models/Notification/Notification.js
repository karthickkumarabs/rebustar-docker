/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'
import { Enum } from '../../utils/Enum.js'
const Schema = mongoose.Schema

class Notification extends BaseModel {
  constructor() {
    super()
  }
}

const NotificationSchema = mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, default: null },
    userType: {
      type: String,
      enum: [Enum.ROLES.ADMIN, Enum.ROLES.COMPANY, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]
    },

    module: {
      type: String,
      enum: [
        Enum.NOTIFICATION.TYPE.INACCOUNT,
        Enum.NOTIFICATION.TYPE.MAIL,
        Enum.NOTIFICATION.TYPE.SMS,
        Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION
      ],
      default: Enum.NOTIFICATION.TYPE.INACCOUNT
    },
    severity: {
      type: String,
      enum: [
        Enum.NOTIFICATION.SEVERITY.INFO,
        Enum.NOTIFICATION.SEVERITY.WARNING,
        Enum.NOTIFICATION.SEVERITY.DANGER
      ],
      default: Enum.NOTIFICATION.SEVERITY.INFO
    },

    title: { type: String, default: '' },
    body: { type: String, default: '' },
    image: { type: String, default: '' },
    supplementary: {
      type: mongoose.SchemaTypes.Mixed,
      default: null
    },

    status: {
      type: String,
      enum: [Enum.NOTIFICATION.STATUS.SUCCESS, Enum.NOTIFICATION.STATUS.FAILURE],
      default: Enum.NOTIFICATION.STATUS.SUCCESS
    },

    isRead: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

NotificationSchema.loadClass(Notification)

export default mongoose.model('Notification', NotificationSchema)
