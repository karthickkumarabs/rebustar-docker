/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../../models/BaseModel.js'
import mongoose from 'mongoose'

class Autocomplete extends BaseModel {
  constructor() {
    super()
  }
}

const predictionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  placeId: { type: String, required: true, ref: 'Place' },
  structuredFormatting: {
    mainText: { type: String, required: true },
    secondaryText: { type: String, required: true }
  },
  countryCode: { type: String, required: true }
})

const AutocompleteSchema = mongoose.Schema(
  {
    query: { type: String, required: true, unique: true },
    countryCode: { type: String, required: true },
    predictions: { type: [predictionSchema], default: [] }
    // createdAt: { type: Date, default: Date.now } // Expire after 180 days
  },
  { timestamps: true, usePushEach: true }
)

AutocompleteSchema.loadClass(Autocomplete)

export default mongoose.model('Autocomplete', AutocompleteSchema)
