/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { BaseController } from '../../../controllers/BaseController.js'
import { Logger } from '../../../utils/Logger.js'
import { BiddingModels } from '../models/Bidding.js'
import Trip from '../../../models/ServiceModule/Trip.js'
import mongoose from 'mongoose'
import { Enum } from '../../../utils/Enum.js'
import Pricing from './../../../models/Creteria/Pricing.js'
import { BiddingConfiguration } from '../Config.js'
import fs from 'fs'
import path from 'path'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class BiddingController extends BaseController {
  constructor() {
    super()
  }
  static create = async (userId, userType, TripData, amount) => {
    try {
      const tripId = mongoose.Types.ObjectId(TripData._id)
      const existingBid = await BiddingModels.findOne({ tripId })
      if (existingBid) {
        return {
          success: true,
          message: 'Bidding Already Added',
          data: existingBid,
          statusCode: 200
        }
      }
      const newBid = new BiddingModels({
        tripId,
        userId: userId,
        status: Enum.BIDDING.BIDDINGSTATUS.OPEN,
        finalAmount: amount,
        transactions: []
      })

      const createdBid = await newBid.save()

      return {
        success: true,
        message: 'Bidding Added Successfully',
        data: createdBid,
        statusCode: 200
      }
    } catch (error) {
      throw error
    }
  }

  static update = async (userId, userType, data, TripData) => {
    try {
      const Obj = {}
      const resObj = {}
      const tripId = mongoose.Types.ObjectId(TripData._id)
      const PricingData = await Pricing.findOne(
        { serviceId: mongoose.Types.ObjectId(TripData.serviceType) },
        { additional: 1 }
      )
        .lean()
        .exec()
      const BiddingConfig = PricingData.additional.bidding
      if (BiddingConfig.status) {
        const BiddingData = await BiddingModels.findOne({
          tripId: tripId,
          status: Enum.BIDDING.BIDDINGSTATUS.OPEN
        })
        if (!BiddingData) {
          ;(resObj.success = false),
            (resObj.message = 'Bidding not found for this trip'),
            (resObj.data = {}),
            (resObj.statusCode = 404)
          return resObj
        }
        const totalFare = Number(TripData.estimation.totalFare)
        const minimumBiddingAmount =
          totalFare - Number((Number(BiddingConfig.minimumAmountinpercentage) / 100) * totalFare)
        const maximumBiddingAmount =
          totalFare + Number((Number(BiddingConfig.maximumAmountinpercentage) / 100) * totalFare)
        resObj.minimumAmount = minimumBiddingAmount
        resObj.maximumAmount = maximumBiddingAmount
        const objectId = new mongoose.Types.ObjectId()
        Obj._id = objectId
        Obj.userId = userId
        Obj.userType = userType
        Obj.amount = Number(data.amount ? data.amount : 0)
        Obj.status = Enum.BIDDING.BIDDINGTRANSACTIONSTATUS.PENDING
        const index = BiddingData.transactions.findIndex(
          (num) => num.amount == Number(data.amount ? data.amount : 0)
        )
        if (index != -1) {
          ;(resObj.success = false),
            (resObj.message = 'Already Bidding Added for this amount'),
            (resObj.data = {}),
            (resObj.statusCode = 500)
        } else {
          const FinalBiddingAmount = Number(data.amount ? data.amount : Number(BiddingData.finalAmount))
          await BiddingModels.updateOne(
            { _id: BiddingData._id },
            {
              $set: {
                finalAmount: FinalBiddingAmount
              },
              $push: { transactions: Obj }
            }
          )
          const matchQuery = [
            { $match: { tripId } },
            { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: true } }
          ]
          if (objectId) {
            matchQuery.push({ $match: { 'transactions._id': mongoose.Types.ObjectId(objectId) } })
          }
          const UpdateBiddingData = await this.getTrxDetails(matchQuery)
          ;(resObj.success = true),
            (resObj.message = 'Bidding Updated Successfully'),
            (resObj.data = UpdateBiddingData[0]),
            (resObj.statusCode = 200)
        }
        return resObj
      } else {
        ;(resObj.success = false),
          (resObj.message = 'BIDDING FEE NOT ENABLED'),
          (resObj.data = {}),
          (resObj.statusCode = 500)
        return resObj
      }
    } catch (error) {
      throw error
    }
  }

  static updateAmtinESTfare = async (TripData, BiddingStatus, BiddingTrxstatus, messageId) => {
    try {
      const resObj = {}
      const tripId = mongoose.Types.ObjectId(TripData._id)
      await BiddingModels.updateOne(
        { tripId: tripId, 'transactions._id': mongoose.Types.ObjectId(messageId) },
        {
          $set: {
            status: BiddingStatus,
            'transactions.$.status': BiddingTrxstatus
          }
        }
      )
      const matchQuery = [
        { $match: { tripId } },
        { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: true } }
      ]

      if (messageId) {
        matchQuery.push({ $match: { 'transactions._id': mongoose.Types.ObjectId(messageId) } })
      }
      const updateBiddingData = await this.getTrxDetails(matchQuery)
      if (BiddingTrxstatus == Enum.BIDDING.BIDDINGTRANSACTIONSTATUS.ACCEPTED) {
        const Obj = {
          name: Enum.SOCKET.BIDDING,
          fareType: 'amount',
          actual: Number(TripData.estimation.totalFare),
          fare: Number(updateBiddingData[0].finalAmount) - Number(TripData.estimation.totalFare)
        }
        await Trip.updateOne(
          { _id: mongoose.Types.ObjectId(TripData._id) },

          {
            $set: { 'estimation.totalFare': Number(updateBiddingData[0].finalAmount) },
            $push: { 'estimation.additional': Obj }
          }
        )
      }
      ;(resObj.success = true),
        (resObj.message = `Bidding ${BiddingTrxstatus} Successfully`),
        (resObj.data = updateBiddingData[0]),
        (resObj.statusCode = 200)
      return resObj
    } catch (error) {
      throw error
    }
  }
  static getTransactionHistory = async (req, res) => {
    try {
      const queryData = req.query
      const tripId = mongoose.Types.ObjectId(queryData._id)
      const matchQuery = [
        { $match: { tripId } },
        { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: true } }
      ]
      const BiddingData = await this.getTrxDetails(matchQuery)
      const totalCount = await BiddingModels.aggregate([
        { $match: { tripId: mongoose.Types.ObjectId(queryData._id) } },
        { $project: { totalTransactions: { $size: '$transactions' } } }
      ])
      if (BiddingData.length == 0) {
        throw new Error('Bidding not found for this trip')
      } else {
        return requestHandler.sendSuccess(
          req,
          res,
          'GET_SERVICE_TYPE'
        )({ message: 'SUCCESS', data: BiddingData[0], total: totalCount[0].totalTransactions })
      }
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getTrxDetails = async (matchquery) => {
    const BidData = await BiddingModels.aggregate([
      ...matchquery,
      {
        $lookup: {
          from: 'customers',
          localField: 'transactions.userId',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $lookup: {
          from: 'partners',
          localField: 'transactions.userId',
          foreignField: '_id',
          as: 'partnerDetails'
        }
      },
      {
        $addFields: {
          'transactions.userDetails': {
            $cond: {
              if: { $eq: ['$transactions.userType', Enum.ROLES.CUSTOMER] },
              then: { $arrayElemAt: ['$userDetails', 0] },
              else: null
            }
          },
          'transactions.partnerDetails': {
            $cond: {
              if: { $eq: ['$transactions.userType', Enum.ROLES.PARTNER] },
              then: { $arrayElemAt: ['$partnerDetails', 0] },
              else: null
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          tripId: { $first: '$tripId' },
          userId: { $first: '$userId' },
          status: { $first: '$status' },
          finalAmount: { $first: '$finalAmount' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          transactions: { $push: '$transactions' }
        }
      },
      {
        $project: {
          _id: 1,
          tripId: 1,
          status: 1,
          finalAmount: 1,
          transactions: {
            $filter: {
              input: {
                $map: {
                  input: '$transactions',
                  as: 'txn',
                  in: {
                    $let: {
                      vars: {
                        userDetails: {
                          $cond: [
                            {
                              $and: [
                                { $eq: ['$$txn.userType', Enum.ROLES.CUSTOMER] },
                                { $ne: ['$$txn.userDetails', null] }
                              ]
                            },
                            {
                              name: '$$txn.userDetails.fname',
                              phone: '$$txn.userDetails.phone',
                              email: '$$txn.userDetails.email',
                              profile: '$$txn.userDetails.profile',
                              ratings: '$$txn.userDetails.ratings.totalValue'
                            },
                            '$$REMOVE'
                          ]
                        },
                        partnerDetails: {
                          $cond: [
                            {
                              $and: [
                                { $eq: ['$$txn.userType', Enum.ROLES.PARTNER] },
                                { $ne: ['$$txn.partnerDetails', null] }
                              ]
                            },
                            {
                              name: '$$txn.partnerDetails.fname',
                              phone: '$$txn.partnerDetails.phone',
                              email: '$$txn.partnerDetails.email',
                              profile: '$$txn.partnerDetails.profile',
                              ratings: '$$txn.partnerDetails.ratings.totalValue'
                            },
                            '$$REMOVE'
                          ]
                        }
                      },
                      in: {
                        $mergeObjects: [
                          {
                            userId: '$$txn.userId',
                            userType: '$$txn.userType',
                            amount: '$$txn.amount',
                            _id: '$$txn._id',
                            status: '$$txn.status'
                          },
                          { userDetails: '$$userDetails' },
                          { partnerDetails: '$$partnerDetails' }
                        ]
                      }
                    }
                  }
                }
              },
              as: 'txn',
              cond: { $gt: [{ $size: { $objectToArray: '$$txn' } }, 0] }
            }
          }
        }
      }
    ]).exec()
    return BidData
  }

  static MinandMax = async (req, res) => {
    try {
      const bidamount = Number(req.query.bidamount) ? Number(req.query.bidamount) : 0
      const TripData = await Trip.findOne(
        { _id: mongoose.Types.ObjectId(req.query.tripId) },
        { serviceType: 1 }
      )
        .lean()
        .exec()
      const PricingData = await Pricing.findOne(
        { serviceId: mongoose.Types.ObjectId(TripData.serviceType) },
        { additional: 1 }
      )
        .lean()
        .exec()
      if (!PricingData || !PricingData.additional || !PricingData.additional.bidding)
        throw new Error('Bidding configuration not found for this service')
      const BiddingConfig = PricingData.additional.bidding
      const minimumBiddingAmount =
        bidamount - Number((Number(BiddingConfig.minimumAmountinpercentage) / 100) * bidamount)
      const maximumBiddingAmount =
        bidamount + Number((Number(BiddingConfig.maximumAmountinpercentage) / 100) * bidamount)
      const checkData = await this.checkMinandMaxamtLimit(
        minimumBiddingAmount,
        maximumBiddingAmount,
        bidamount
      )
      if (!checkData.success) {
        throw new Error(checkData.message)
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_BIDDING_AMOUNT'
      )({
        message: 'SUCCESS',
        minimumBiddingAmount: minimumBiddingAmount,
        maximumBiddingAmount: maximumBiddingAmount,
        bidamount: bidamount
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static checkMinandMaxamtLimit = async (minimumBiddingAmount, maximumBiddingAmount, bidamount) => {
    const BiddingAmt = Number(bidamount)
    const resObj = {
      success: true,
      message: '',
      data: BiddingAmt,
      statusCode: 200
    }
    if (Number(BiddingAmt) < minimumBiddingAmount || Number(BiddingAmt) > maximumBiddingAmount) {
      ;(resObj.success = false),
        (resObj.message = `Bidding Amount should be between ${minimumBiddingAmount} and ${maximumBiddingAmount}`),
        (resObj.data = {}),
        (resObj.statusCode = 500)
    }
    return resObj
  }

  static EnableBidding = async (req, res) => {
    try {
      const body = req.body
      const servicedata = body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/Config.js`
      const fileContent = `
          /* ************************
     * Copyright 2023
     * ABSERVETECH
     ************************ */
        const BiddingConfiguration = ${JSON.stringify(servicedata, null, 2)} 
        export { BiddingConfiguration }`

      await fs.writeFileSync(filePath, fileContent)
      if (body.biddingFlowenable === false) {
        await Pricing.updateMany(
          {},
          {
            $set: {
              'additional.bidding.status': false,
              'additional.bidding.minimumAmountinpercentage': 0,
              'additional.bidding.maximumAmountinpercentage': 0
            }
          }
        )
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({ message: 'UPDATED', servicedata: servicedata })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static getBidding = async (req, res) => {
    try {
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_BIDDING_CONFIG'
      )({ message: 'SUCCESS', data: BiddingConfiguration })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { BiddingController }
