/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../../../models/BaseModel.js'
import mongoose from 'mongoose'

class ContactUs extends BaseModel {
  constructor() {
    super()
  }
}

const ContactUsSchema = mongoose.Schema({
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  subject: { type: String, default: '' },
  detail: { type: String, default: '' },
  city: { type: String, default: '' }
})

ContactUsSchema.loadClass(ContactUs)

export default mongoose.model('ContactUs', ContactUsSchema)
