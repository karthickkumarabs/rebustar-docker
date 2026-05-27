/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import { Enum } from '../../utils/Enum.js'
import mongoose from 'mongoose'
import { Config } from '../../config/AppConfig.js'

class Verification extends BaseModel {
  constructor() {
    super()
  }
}

const VerificationSchema = mongoose.Schema(
  {
    phoneCode: { type: String, default: '' },
    phoneNumber: {
      type: Config.isEncrypt ? Buffer : String,
      default: '',
      unique: true,
      options: {
        isEncrypt: Config.isEncrypt
      }
    },
    email: {
      type: Config.isEncrypt ? Buffer : String,
      default: '',
      options: {
        isEncrypt: Config.isEncrypt
      }
    },

    otp: { type: String, default: '' },
    userType: {
      type: String,
      enum: [Enum.ROLES.ADMIN, Enum.ROLES.CUSTOMER, Enum.ROLES.PARTNER],
      default: Enum.ROLES.ADMIN
      // enum: ['ADMIN','CUSTOMER','PARTNER'],default:'ADMIN',
    },

    verified: { type: Boolean, default: false },
    verifyBy: { type: String, enum: ['email', 'phone'], default: '' },
    verifyFrom: { type: String, default: 'login' },
    deletedAt: { type: Date, default: null },
    OTPLimitUpdatedDate: { type: Date, default: null },
    wrongOTPLimitUpdatedDate: { type: Date, default: null },
    wrongOTPLimit: { type: Number, default: 0 },
    OTPLimit: { type: Number, default: 0 }
  },
  { timestamps: true }
)

VerificationSchema.loadClass(Verification)
// 🔹 Encrypt field before saving
const getEncryptedFields = (schema) => {
  if (Config.isEncrypt) {
    return Object.keys(schema.paths).filter((field) => {
      const pathOptions = schema.paths[field]?.options
      return pathOptions?.options?.isEncrypt
    })
  }
}
const fieldsToEncrypt = getEncryptedFields(VerificationSchema)

// 🔹 Encrypt field before saving
VerificationSchema.pre('save', async function (next) {
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
VerificationSchema.post('find', async function (docs) {
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
export default mongoose.model('Verification', VerificationSchema)
