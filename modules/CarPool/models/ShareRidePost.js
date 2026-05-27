/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'
import { Enum } from '../../../utils/Enum.js'
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId

class ShareRidePost extends BaseModel {
  constructor() {
    super()
  }
}

const VehicleSchema = new mongoose.Schema(
  {
    makename: { type: String, default: '' },
    model: { type: String, default: '' },
    year: { type: String, default: '' },
    registrationNo: { type: String, default: '' },
    color: { type: String, default: '' },
    description: { type: String, default: '' },
    vehicleId: { type: mongoose.Types.ObjectId, ref: 'Partner', default: null }
  },
  { timestamps: true }
)

const ShareRidePostSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, default: Date.now },
    requestFrom: { type: String, enum: ['app', 'admin', 'web'], default: 'app' },
    isScheduleLater: { type: Boolean, default: false },
    module: {
      type: String,
      default: Enum.MODULES.DAILY,
      enum: [Enum.MODULES.DAILY, Enum.MODULES.RENTAL, Enum.MODULES.OUTSTATION],
      options: {
        isSearch: true
      }
    },
    // triptype: { type: String, default: 'daily' }, // { daily/rental/outstation }
    partnerName: String,
    partnerId: { type: mongoose.Types.ObjectId, ref: 'Partner', default: null },
    status: {
      type: String,
      enum: [
        Enum.SHARETRIP.STATUS.PENDING,
        Enum.SHARETRIP.STATUS.ACCEPTED,
        Enum.SHARETRIP.STATUS.ARRIVED,
        Enum.SHARETRIP.STATUS.PROGRESS,
        Enum.SHARETRIP.STATUS.FINISHED,
        Enum.SHARETRIP.STATUS.CANCELLED,
        Enum.SHARETRIP.STATUS.NORESPONSE
      ],
      default: Enum.SHARETRIP.STATUS.PENDING,
      options: {
        isSearch: true
      }
    },
    postStatus: { type: String, enum: ['active', 'inactive'], default: 'active' },
    serviceAreaId: { type: ObjectId, ref: 'ServiceArea', default: null },
    serviceAreaName: { type: String, default: '' },
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
    basicFeatures: { type: [String], default: [] },
    noOfSeats: { type: Number, default: 1 },
    availableSeats: { type: Number, default: 1 },
    bookedSeats: { type: Number, default: 0 },
    currency: { type: String, default: '' },
    currencyCode: { type: String, default: '' },
    perSeatRate: { type: Number, default: 0 },
    tripFee: { type: Number, default: 0 },
    start: String, // pickup address
    end: String, // drop address
    startcoords: { type: [Number] },
    endcoords: { type: [Number] },
    enpath: { type: String, default: '' },
    latdirection: { type: String, default: '' },
    lngdirection: { type: String, default: '' },
    scheduleOn: {
      type: Date,
      default: Date.now,
      options: {
        isSearch: true
      }
    }, // 2025-03-18T13:34:35.000Z
    timeZone: { type: String, default: 'UTC+00:00' }, //  Maintain UTC difference like GMT+05:30
    vehicle: VehicleSchema,
    enpath: { type: String, default: '' },
    distkm: { type: String, default: '' },
    estTime: { type: String, default: '' },
    notes: { type: String, default: '' },
    features: {
      luggageAllowed: { type: Boolean, default: false },
      noOfLuggages: { type: Number, default: 0 },
      petAllowed: { type: Boolean, default: false },
      childAllowed: { type: Boolean, default: false },
      noOfChildSeats: { type: Number, default: 0 },
      smokingAllowed: { type: Boolean, default: false },
      handicapAllowed: { type: Boolean, default: false }
    },
    paymentMethod: {
      type: String,
      default: Enum.TRIP.PAYMENT_MODE.CASH,
      options: {
        isSearch: true
      }
    },
    paymentMethodId: { type: String, default: null },
    paymentStatus: {
      type: String,
      default: Enum.TRIP.PAYMENT_STATUS.UNPAID,
      enum: [Enum.TRIP.PAYMENT_STATUS.PAID, Enum.TRIP.PAYMENT_STATUS.UNPAID],
      options: {
        isSearch: true
      }
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

ShareRidePostSchema.loadClass(ShareRidePost)

export default mongoose.model('ShareRidePost', ShareRidePostSchema)
