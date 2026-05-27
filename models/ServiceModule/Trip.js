/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseModel } from '../BaseModel.js'

import mongoose from 'mongoose'
import autoIncrement from '../../utils/AutoIncrement.js'
import { Enum } from '../../utils/Enum.js'
autoIncrement.initialize(mongoose)
import { Config } from '../../config/AppConfig.js'

class Trip extends BaseModel {
  constructor() {
    super()
  }
}

const eventValue = mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, default: null },
  userType: {
    type: String,
    default: Enum.MODULES.PARTNER,
    enum: [Enum.MODULES.PARTNER, Enum.MODULES.CUSTOMER, Enum.MODULES.ADMIN]
  },
  userName: { type: String, default: '' },
  category: {
    type: String,
    enum: [
      Enum.TRIP.STATUS.REQUESTED,
      Enum.TRIP.STATUS.PROCESSING,
      Enum.TRIP.STATUS.ACCEPTED,
      Enum.TRIP.STATUS.ARRIVED,
      Enum.TRIP.STATUS.PROGRESS,
      Enum.TRIP.STATUS.FINISHED,
      Enum.TRIP.STATUS.CANCELLED,
      Enum.TRIP.STATUS.NORESPONSE,
      Enum.TRIP.STATUS.DECLINED
    ],
    default: Enum.TRIP.STATUS.REQUESTED
  },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
})

const partnerList = mongoose.Schema({
  partnerId: { type: mongoose.Types.ObjectId, default: null },
  partnerUniCode: { type: String, default: '' },
  serviceTypeName: { type: String, default: '' },
  status: {
    type: String,
    default: Enum.TRIP.STATUS.ASSIGNED,
    enum: [
      Enum.TRIP.STATUS.ASSIGNED,
      Enum.TRIP.STATUS.CALLED,
      Enum.TRIP.STATUS.ACCEPTED,
      Enum.TRIP.STATUS.DECLINED,
      Enum.TRIP.STATUS.HOLD,
      Enum.TRIP.STATUS.NORESPONSE
    ]
  },
  distance: { type: Number, default: 0 },
  ETA: { type: Number, default: 0 },
  requestTime: { type: Date, default: null }
})

const additionalValue = mongoose.Schema({
  name: { type: String, default: '' },
  fareType: { type: String, default: '' }, // "percentage/amount"
  actual: { type: Number, default: 0 }, // "30% / 30"
  fare: { type: Number, default: 0 } // 30
})

const estimatedValue = mongoose.Schema({
  distance: { type: Number, default: 0 }, // Readable value
  estTime: { type: Number, default: 0 }, // Readable value
  start: { type: String, default: '' }, // pickup address
  end: { type: String, default: '' }, // drop address
  startcoords: { type: [Number], default: [0, 0] },
  endcoords: { type: [Number], default: [0, 0] },

  baseFare: { type: Number, default: 0 },
  bookingFare: { type: Number, default: 0 },
  timeFare: { type: Number, default: 0 },
  minimumFare: { type: Number, default: 0 },
  fareType: { type: String, default: '' },
  fareAmt: { type: Number, default: 0 },
  waitingFare: { type: Number, default: 0 },
  taxFare: { type: Number, default: 0 },
  additionalFare: { type: Number, default: 0 },
  additional: [additionalValue],

  actualFare: { type: Number, default: 0 },
  discountFare: { type: Number, default: 0 },
  wallet: { type: Number, default: 0 },
  offers: { type: Array, default: [] },
  coupon: { type: String, default: '' },
  roundOff: { type: Number, default: 0 },
  totalFare: {
    type: Number,
    default: 0,
    options: {
      isSearch: true
    }
  },
  commision: { type: Number, default: 0 },
  companycommission: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  payable: { type: Number, default: 0 },
  // this only for multiple stop trip otherwise don't need to use it
  stops: {
    type: [
      {
        index: { type: Number, default: null },
        name: { type: String, default: '' },
        address: { type: String, default: '' },
        coords: { type: [Number], default: [0, 0] },
        time: { type: Number, default: '' },
        distance: { type: Number, default: '' },
        timeLabel: { type: String, default: '' },
        distanceLabel: { type: String, default: '' },
        arrivedTime: { type: Date, default: null },
        startTime: { type: Date, default: null },
        waitingTime: { type: Number, default: 0 }, // in milliseconds,
        status: { type: String, default: 'PENDING' }
      }
    ],
    default: []
  },
  stopCurrentIndex: { type: Number, default: 0 }
})

const TripSchema = mongoose.Schema(
  {
    requestFrom: {
      type: String,
      enum: [
        Enum.TRIP.REQUEST_FROM.ANDROID,
        Enum.TRIP.REQUEST_FROM.IOS,
        Enum.TRIP.REQUEST_FROM.WEB,
        Enum.TRIP.REQUEST_FROM.ADMIN
      ],
      default: Enum.TRIP.REQUEST_FROM.ANDROID
    },
    module: {
      type: String,
      default: Enum.MODULES.DAILY,
      enum: [
        Enum.MODULES.DAILY,
        Enum.MODULES.RENTAL,
        Enum.MODULES.OUTSTATION,
        Enum.MODULES.DAILY_MULTISTOP,
        Enum.MODULES.HAILRIDE
      ],
      options: {
        isSearch: true
      }
    },
    referenceNo: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    serviceArea: { type: mongoose.Types.ObjectId, ref: 'ServiceArea', default: null },
    serviceType: {
      type: mongoose.Types.ObjectId,
      ref: 'ServiceType',
      default: null,
      options: {
        isSearch: true
      }
    },
    serviceTypeName: {
      type: String,
      default: '',
      options: {
        isSearch: true
      }
    },
    servicePricing: { type: mongoose.Types.ObjectId, ref: 'Pricing', default: null },

    scheduleOn: {
      type: Date,
      default: Date.now,
      options: {
        isSearch: true
      }
    },
    timeZone: { type: String, default: 'UTC+00:00' }, //  Maintain UTC difference like GMT+05:30
    isScheduleLater: { type: Boolean, default: false }, // Maintain schedule Later

    distanceMetric: {
      type: String,
      default: Enum.TRIP.DISTANCEMETRIC.METER,
      enum: [
        Enum.TRIP.DISTANCEMETRIC.METER,
        Enum.TRIP.DISTANCEMETRIC.KILOMETER,
        Enum.TRIP.DISTANCEMETRIC.MILE
      ]
    },
    currency: { type: String, default: '' },
    currencyCode: { type: String, default: '' },
    customer: {
      id: { type: mongoose.Types.ObjectId, ref: 'Customer', default: null },
      name: {
        type: String,
        default: '',
        options: {
          isSearch: true
        }
      },
      code: {
        type: String,
        default: ''
      },
      email: {
        type: Config.isEncrypt ? Buffer : String,
        default: '',
        options: {
          isEncrypt: Config.isEncrypt
        }
      },
      phoneNo: {
        type: Config.isEncrypt ? Buffer : String,
        default: '',
        options: {
          isEncrypt: Config.isEncrypt
        }
      },
      phoneCode: {
        type: String,
        default: ''
      },
      profile: { type: String, default: '' },
      experience: { type: Number, default: 0 },
      myRating: { type: Number, default: 0 },
      requestPin: { type: String, default: '' },

      rating: { type: Number, default: 0 },
      comment: { type: String, default: '' },
      cancelReason: { type: String, default: '' }
    },
    partner: {
      id: { type: mongoose.Types.ObjectId, ref: 'Partner', default: null },
      name: {
        type: String,
        default: '',
        options: {
          isSearch: true
        }
      },
      code: {
        type: String,
        default: ''
      },
      email: {
        type: Config.isEncrypt ? Buffer : String,
        default: '',
        options: {
          isEncrypt: Config.isEncrypt
        }
      },
      phoneNo: {
        type: Config.isEncrypt ? Buffer : String,
        default: '',
        options: {
          isEncrypt: Config.isEncrypt
        }
      },
      phoneCode: {
        type: String,
        default: ''
      },
      profile: { type: String, default: '' },
      vehicle: { type: mongoose.Types.ObjectId, ref: 'Vehicle', default: null },
      vehicleNo: { type: String, default: '' },
      serviceType: { type: mongoose.Types.ObjectId, ref: 'ServiceType', default: null },
      serviceTypeName: {
        type: String,
        default: '',
        options: {
          isSearch: true
        }
      },
      experience: { type: Number, default: 0 },
      myRating: { type: Number, default: 0 },

      acceptTime: { type: Date, default: null },
      acceptLocation: { type: [Number], default: [0, 0] },

      arriveTime: { type: Date, default: null },
      arriveLocation: { type: [Number], default: [0, 0] },

      startTime: { type: Date, default: null },
      startLocation: { type: [Number], default: [0, 0] },

      endTime: { type: Date, default: null },
      endLocation: { type: [Number], default: [0, 0] },

      rating: { type: Number, default: 0 },
      comment: { type: String, default: '' },
      cancelReason: { type: String, default: '' },
      subscriptionStatus: { type: Boolean, default: false }
    },
    partnerList: [partnerList], // for one by one
    estimation: estimatedValue,
    companyId: { type: mongoose.Types.ObjectId, ref: 'Company', default: null },
    invoice: estimatedValue,
    review: { type: String, default: '' },
    routeImage: { type: String, default: 'public/services/routes/default.png' },
    status: {
      type: String,
      enum: [
        Enum.TRIP.STATUS.REQUESTED,
        Enum.TRIP.STATUS.PROCESSING,
        Enum.TRIP.STATUS.ACCEPTED,
        Enum.TRIP.STATUS.ARRIVED,
        Enum.TRIP.STATUS.PROGRESS,
        Enum.TRIP.STATUS.FINISHED,
        Enum.TRIP.STATUS.CANCELLED,
        Enum.TRIP.STATUS.NORESPONSE
      ],
      default: Enum.TRIP.STATUS.REQUESTED,
      options: {
        isSearch: true
      }
    }, // noresponse,Cancelled,Finished,processing,accepted,Progress
    paymentMethodChange: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      default: Enum.TRIP.PAYMENT_MODE.CASH,
      options: {
        isSearch: true
      }
    },
    paymentMethodId: { type: String, default: '' },
    paymentStatus: {
      type: String,
      default: Enum.TRIP.PAYMENT_STATUS.UNPAID,
      enum: [Enum.TRIP.PAYMENT_STATUS.PAID, Enum.TRIP.PAYMENT_STATUS.UNPAID],
      options: {
        isSearch: true
      }
    },
    additionalDetails: { type: Object, default: {} },
    needClear: { type: Boolean, default: true },
    events: [eventValue],
    deletedAt: { type: Date, default: null },
    Bidding: { type: Boolean, enum: [true, false], default: false }
  },
  { timestamps: true }
)

TripSchema.loadClass(Trip)
TripSchema.plugin(autoIncrement.plugin, {
  model: 'Trip',
  field: 'referenceNo',
  startAt: 1000,
  incrementBy: 1,
  options: {
    isSearch: true
  }
})
// 🔹 Encrypt field before saving
const getEncryptedFields = (schema) => {
  if (Config.isEncrypt) {
    return Object.keys(schema.paths).filter((field) => {
      const pathOptions = schema.paths[field]?.options
      return pathOptions?.options?.isEncrypt
    })
  }
}
const fieldsToEncrypt = getEncryptedFields(TripSchema)

// 🔹 Encrypt field before saving
TripSchema.pre('save', async function (next) {
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
TripSchema.post('find', async function (docs) {
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
export default mongoose.model('Trip', TripSchema)
