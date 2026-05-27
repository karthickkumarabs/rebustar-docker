/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'
import mongoose, { ObjectId } from 'mongoose'

import { Config } from '../../config/AppConfig.js'

class Partner extends BaseModel {
  constructor() {
    super()
  }
}

const Payment = new mongoose.Schema({
  wallet: { type: Number, default: 0 },
  subscriptionPackage: { type: String, default: '' },
  subscriptionEndDate: { type: String, default: null },
  subscriptionStatus: { type: Boolean, default: false },
  packageId: { type: ObjectId, default: null }
})

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
      isSearch: true,
      isEncrypt: Config.isEncrypt
    }
  },
  phoneCode: { type: String, default: Config.app.phoneCode || '+91' }
})

const Document = new mongoose.Schema({
  name: { type: String },
  status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' },
  reason: { type: String, default: '' },
  fields: [
    {
      name: { type: String },
      value: { type: String },
      status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' },
      reason: { type: String, default: '' }
    }
  ],
  verificationObj: { type: Object, default: {} }
})

const PartnerSchema = mongoose.Schema(
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
    dob: { type: Date, default: null },
    gender: { type: String, default: 'Male', enum: ['Male', 'Female', 'Others'] },
    profile: { type: String, default: 'public/Auth/Partners/default.jpg' },
    fcmId: { type: String, default: '' },
    companyId: { type: ObjectId, ref: 'Company', default: null },
    curService: { type: mongoose.Types.ObjectId, ref: 'ServiceType', default: null },
    curStatus: { type: String, default: 'free' },
    serviceStatus: { type: String, default: '' },
    curTrip: { type: String, default: '' },
    drivingSession: {
      startTime: { type: Date, default: null },
      lastOfflineTime: { type: Date, default: null }
    },
    tripRequests: [
      {
        tripId: { type: ObjectId },
        status: { type: String },
        requestTime: { type: Date, default: new Date() }
      }
    ],
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },

    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    accountVerified: { type: Boolean, default: false },
    accountProgress: { type: Boolean, default: false },
    status: {
      type: String,
      default: 'Pending',
      enum: ['Pending', 'Active', 'Inactive', 'Blocked'],
      options: {
        isSearch: true
      }
    },

    document: [Document],

    deviceId: { type: String, default: '' },
    hash: { type: String, default: '' },
    salt: { type: String, default: '' },

    online: {
      type: Boolean,
      default: false,
      options: {
        isSearch: true
      }
    },
    activeVechicle: { type: ObjectId, default: null },
    bearing: { type: Number, default: 0 },
    location: {
      type: { type: String, required: true, enum: 'Point', default: 'Point' },
      coordinates: { type: [Number], required: true, default: [0, 0] }
    },
    scId: { type: [ObjectId], default: [] },

    referrer: { type: String, default: '' },
    updatedBy: {
      userId: { type: ObjectId },
      role: { type: String }
    },
    EmergencyContact: [EmergencyContact],

    payment: Payment,
    ratings: {
      totalValue: { type: Number, default: 0.0 },
      totalCount: { type: Number, default: 0 }
    },

    events: [
      {
        userId: { type: ObjectId },
        userType: { type: String },
        updatedAt: { type: Date },
        description: { type: String }
      }
    ],
    inShareTrip: { type: Boolean, default: false },
    curShareTripId: { type: ObjectId, ref: 'sharerideposts', default: null },
    shareReqStatus: { type: String, default: 'free' },
    qrCodeImage: { type: String, default: '' },
    upiId: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
    OTPLimitations: {
      isblocked: { type: Boolean, default: false },
      blockedFor: { type: String, default: '' },
      blockedTime: { type: Date, default: null },
      wrongOTPblockedTime: { type: Date, default: null }
    },
    // for new subscription discounts
    isAnySubscriptionPurchased: { type: Boolean, default: false },
    hailTripDiscountStatus: { type: Boolean, default: false },
    hailTripDiscountPercentage: { type: Number, default: 0 }
  },
  { timestamps: true }
)

// 🔹 Encrypt field before saving
const getEncryptedFields = (schema) => {
  if (Config.isEncrypt) {
    return Object.keys(schema.paths).filter((field) => {
      const pathOptions = schema.paths[field]?.options
      return pathOptions?.options?.isEncrypt
    })
  }
}
const fieldsToEncrypt = getEncryptedFields(PartnerSchema)

PartnerSchema.pre('save', async function (next) {
  let eventsArr = []
  const updatedFields = Object.values(this.modifiedPaths())

  if (this.events.length > 0) {
    eventsArr = this.events.map((item) => {
      item.updatedAt = this.updatedAt
      item.description = 'Last Updated fields are ' + updatedFields.join(',')
      item.userId = this.updatedBy.userId
      item.userType = this.updatedBy.role
      return item
    })
  } else {
    eventsArr.push({
      updatedAt: this.updatedAt,
      description: 'Last Updated fields are ' + updatedFields.join(','),
      userId: this.updatedBy.userId,
      userType: this.updatedBy.role
    })
  }
  this.events = eventsArr

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
PartnerSchema.post('find', async function (docs) {
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

PartnerSchema.loadClass(Partner)

export default mongoose.model('Partner', PartnerSchema)
