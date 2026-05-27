/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose from 'mongoose'
import { encryptText, decryptText } from '../../server/encryption.js'
import { Config } from '../../config/AppConfig.js'
// import { Helpers } from '../../helpers/Function.js'

class Customer extends BaseModel {
  constructor() {
    super()
  }

  // Virtual method to get masked email
  // get email() {
  //   return this.constructor.maskEmail(this.email) // Access the static method from BaseModel
  // }
}

const EmergencyContact = new mongoose.Schema({
  name: { type: String },
  email: {
    type: Config.isEncrypt ? Buffer : String,
    default: '',
    options: {
      isEncrypt: Config.isEncrypt
    }
  },
  phoneNumber: {
    type: Config.isEncrypt ? Buffer : String,
    default: '',
    options: {
      isEncrypt: Config.isEncrypt
    }
  },
  phoneCode: { type: String, default: Config.app.phoneCode || '+91' }
})

const FavLocation = new mongoose.Schema({
  name: { type: String },
  address: { type: String, default: '' },
  location: {
    type: { type: String, required: true, enum: 'Point', default: 'Point' },
    coordinates: { type: [Number], required: true, default: [0, 0] }
  }
})

const FavouritePerson = new mongoose.Schema({
  name: { type: String },
  phoneNumber: {
    type: Config.isEncrypt ? Buffer : String,
    default: '',
    options: {
      isEncrypt: Config.isEncrypt
    }
  }
})

const CustomerSchema = new mongoose.Schema(
  {
    uniCode: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },

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
    email: {
      type: Config.isEncrypt ? Buffer : String,
      default: '',
      options: {
        isSearch: true,
        isEncrypt: Config.isEncrypt
      }
    },
    phone: {
      type: Config.isEncrypt ? Buffer : String,
      default: '',
      options: {
        isSearch: true,
        isEncrypt: Config.isEncrypt
      }
    },
    phoneCode: { type: String, default: Config.app.phoneCode || '+91' },
    currency: { type: String, default: Config.app.currency },

    language: { type: String, default: Config.app.language || 'en' },
    gender: { type: String, default: 'Male', enum: ['Male', 'Female', 'Others'] },
    profile: { type: String, default: 'public/Auth/customers/default.jpg' },
    fcmId: { type: String, default: '' },
    companyId: { type: mongoose.Types.ObjectId, ref: 'Company', default: null },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    curStatus: { type: String, default: 'free' }, // free/intrip,
    curTrip: { type: String, default: '' },

    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    accountVerified: { type: Boolean, default: false },
    accountProgress: { type: Boolean, default: false },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Active', 'Inactive', 'Blocked'] },

    deviceId: { type: String, default: '' },
    hash: { type: String, default: '' },
    salt: { type: String, default: '' },

    EmergencyContact: [EmergencyContact],
    FavouriteLocation: [FavLocation],
    FavouritePerson: [FavouritePerson],

    ratings: {
      totalValue: { type: Number, default: 0.0 },
      totalCount: { type: Number, default: 0 }
    },
    deletedAt: { type: Date, default: null },
    referrer: { type: String, default: '' },
    OTPLimitations: {
      isblocked: { type: Boolean, default: false },
      blockedFor: { type: String, default: '' },
      blockedTime: { type: Date, default: null },
      wrongOTPblockedTime: { type: Date, default: null }
    }
  },
  {
    timestamps: true
  }
)

CustomerSchema.loadClass(Customer)

// // Override toObject and toJSON methods to mask the email automatically
// CustomerSchema.set('toObject', {
//   transform: function (doc, ret) {
//     if (Config.mode == 'development') {
//       ret.email = Helpers.maskEmail(ret.email) // Mask the existing email field
//       ret.phone = Helpers.maskPhone(ret.phone) // Mask the existing email field
//     }
//     return ret
//   }
// })

// CustomerSchema.set('toJSON', {
//   transform: function (doc, ret) {
//     if (Config.mode == 'development') {
//       ret.email = Helpers.maskEmail(ret.email) // Mask the existing email field
//       ret.phone = Helpers.maskPhone(ret.phone) // Mask the existing email field
//     }
//     return ret
//   }
// })

// Include virtuals when converting to a plain object
// CustomerSchema.set('toObject', { virtuals: true })
// CustomerSchema.set('toJSON', { virtuals: true })

// 🔹 Encrypt field before saving
const getEncryptedFields = (schema) => {
  if (Config.isEncrypt) {
    return Object.keys(schema.paths).filter((field) => {
      const pathOptions = schema.paths[field]?.options
      return pathOptions?.options?.isEncrypt
    })
  }
}
const fieldsToEncrypt = getEncryptedFields(CustomerSchema)

// 🔹 Encrypt field before saving
CustomerSchema.pre('save', async function (next) {
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
CustomerSchema.post('find', async function (docs) {
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

export default mongoose.model('Customer', CustomerSchema)
