/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
const ObjectId = mongoose.Schema.Types.ObjectId

const FileSchema = new mongoose.Schema(
  {
    filePath: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true }
  },
  { _id: false }
)

const MediaSectionSchema = new mongoose.Schema({
  title: String,
  description: String,
  state: { type: ObjectId, ref: 'State', required: true },
  country: { type: ObjectId, ref: 'Country', required: true },
  files: { type: [FileSchema], default: [] }
})

const MediaSection = mongoose.model('MediaSection', MediaSectionSchema)
export default MediaSection
