/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

// class DatabaseLogs {
//   constructor() {}
// }

const DatabaseLogsSchema = new mongoose.Schema(
  {
    fileName: { type: String },
    actionBy: { type: String, enum: ['MANUAL', 'CRON'], default: 'CRON' }
  },
  { timestamps: true }
)

// DatabaseLogsSchema.loadClass(DatabaseLogs)

export default mongoose.model('databaselogs', DatabaseLogsSchema)
