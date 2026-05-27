/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from './../../models/BaseModel.js'

class Attendance extends BaseModel {
  constructor() {
    super()
  }
}

const EventsSchema = new mongoose.Schema(
  {
    type: { type: String, default: null },
    description: { type: String, default: null },
    createdAt: { type: Date, default: Date.now() }
  },
  { timestamps: false }
)

const AttendanceSchema = new mongoose.Schema(
  {
    requested: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    notresponded: { type: Number, default: 0 },
    onlineTime: { type: Number, default: 0 },
    partner: { type: mongoose.Types.ObjectId, ref: 'Partner' },
    events: [EventsSchema],
    lastOn: { type: Date, default: null },
    lastOff: { type: Date, default: null },
    payable: { type: Number, default: 0 },
    commision: { type: Number, default: 0 },
    reference: {
      type: String,
      default: null,
      options: {
        isSearch: true
      }
    }
  },
  { timestamps: true }
)

AttendanceSchema.loadClass(Attendance)

export default mongoose.model('Attendance', AttendanceSchema)
