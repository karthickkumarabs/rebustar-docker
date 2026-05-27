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

const searchableField = {
  type: String,
  default: '',
  options: {
    isSearch: true
  }
}
if (Config.isEncrypt) {
  searchableField.type = Config.isEncrypt ? Buffer : String
  searchableField.options.isEncrypt = Config.isEncrypt
}

const CompanySchema = mongoose.Schema(
  {
    fname: searchableField,
    lname: searchableField,
    hash: { type: String, default: '' },
    salt: { type: String, default: '' },
    email: searchableField,
    phone: searchableField,
    phoneCode: { type: String, default: Config.app.phoneCode || '+91' },
    profile: { type: String, default: 'public/auth/company/default.jpg' },
    fcmId: { type: String, default: '' },
    scIds: { type: [ObjectId], default: [] },
    commission: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, usePushEach: true }
)

CompanySchema.loadClass(Admin)
// 🔹 Encrypt field before saving
const getEncryptedFields = (schema) => {
  if (Config.isEncrypt) {
    return Object.keys(schema.paths).filter((field) => {
      const pathOptions = schema.paths[field]?.options
      return pathOptions?.options?.isEncrypt
    })
  }
}
const fieldsToEncrypt = getEncryptedFields(CompanySchema)

// 🔹 Encrypt field before saving
CompanySchema.pre('save', async function (next) {
  if (Config.isEncrypt) {
    for (const field of fieldsToEncrypt) {
      if (this.isModified(field)) {
        this[field] = await encryptText(this[field])
      }
    }
  }
  next()
})

// 🔹 Decrypt field after retrieving
CompanySchema.post('find', async function (docs) {
  if (Config.isEncrypt) {
    for (const doc of docs) {
      for (const field of fieldsToEncrypt) {
        if (doc[field]) {
          console.log('doc[field]', doc[field])
          doc[field] = await decryptText(doc[field])
        }
      }
    }
  }
})
export default mongoose.model('Company', CompanySchema)
