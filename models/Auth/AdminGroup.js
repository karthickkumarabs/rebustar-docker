/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'

class AdminGroup extends BaseModel {
  constructor() {
    super()
  }
}

const AdminGroupSchema = mongoose.Schema(
  {
    group: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    description: {
      type: String,
      default: ''
    },
    permission: {
      type: Array,
      default: []
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

AdminGroupSchema.loadClass(AdminGroup)

export default mongoose.model('admingroups', AdminGroupSchema)
