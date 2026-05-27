/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose, { ObjectId } from 'mongoose'
import { Config } from '../../config/AppConfig.js'

class Admin extends BaseModel {
  constructor() {
    super()
  }
}

const AdminSchema = mongoose.Schema(
  {
    fname: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    lname: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    hash: { type: String, default: '' },
    salt: { type: String, default: '' },
    email: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    phone: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    phoneCode: { type: String, default: Config.app.phoneCode || '+91' },
    group: {
      type: ObjectId,
      ref: 'admingroups',
      default: null
    },
    profile: { type: String, default: 'public/auth/admin/default.jpg' },
    deviceId: { type: String, default: '' },
    fcmId: { type: String, default: '' },
    scIds: { type: [ObjectId], default: [] },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

AdminSchema.loadClass(Admin)

export default mongoose.model('Admin', AdminSchema)
