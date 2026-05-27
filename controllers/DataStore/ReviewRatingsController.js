/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { RequestHandler } from '../../utils/RequestHandler.js'
import { BaseController } from '../BaseController.js'
import { Logger } from '../../utils/Logger.js'
import mongoose from 'mongoose'
import Review from '../../models/DataStore/ReviewRatings.js'
import { ServiceConfig } from '../../config/ServiceConfig.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ReviewRatingsController extends BaseController {
  constructor() {
    super()
  }

  static addReview = async (req, res) => {
    try {
      const { rating, customer, partner } = req.body

      if (!rating) throw new Error('RATING_REQUIRED')
      rating === 1 &&
        (!customer?.comment?.length || !partner?.comment?.length) &&
        (() => {
          throw new Error('COMMENT_REQUIRED_FOR_RATING_ONE')
        })()

      const custComments = Array.isArray(customer?.comment)
        ? customer.comment
        : [customer?.comment].filter(Boolean)
      const partComments = Array.isArray(partner?.comment)
        ? partner.comment
        : [partner?.comment].filter(Boolean)

      let review = await Review.findOne({ rating })

      review
        ? ((review.customer.comment = [...new Set([...review.customer.comment, ...custComments])]),
          (review.partner.comment = [...new Set([...review.partner.comment, ...partComments])]),
          await review.save(),
          requestHandler.sendSuccess(
            req,
            res,
            'REVIEW_UPDATED'
          )({
            id: review._id,
            rating: review.rating,
            customer: review.customer,
            partner: review.partner
          }))
        : ((review = await Review.create({
            rating,
            customer: { comment: custComments },
            partner: { comment: partComments }
          })),
          requestHandler.sendSuccess(
            req,
            res,
            'REVIEW_ADDED'
          )({
            id: review._id,
            rating: review.rating,
            customer: review.customer,
            partner: review.partner
          }))
    } catch (error) {
      return requestHandler.sendError(req, res, error.message)
    }
  }

  static getReview = async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query
      const { id } = req.params
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const filter = id ? { _id: new mongoose.Types.ObjectId(id) } : {}

      const [reviews, count] = await Promise.all([
        Review.find(filter).sort({ rating: 1 }).skip(skip).limit(parseInt(limit)).lean(),
        Review.countDocuments(filter)
      ])

      const finalReviews = reviews.length
        ? reviews
        : [
            {
              rating: ServiceConfig.feedBacks.rating,
              customer: { ...ServiceConfig.feedBacks.customer },
              partner: { ...ServiceConfig.feedBacks.partner }
            }
          ]

      const finalCount = reviews.length ? count : 1

      return res.status(200).json({
        type: 'success',
        message: 'Success result',
        data: { count: finalCount, reviews: finalReviews }
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        type: 'error',
        message: 'Internal Server Error'
      })
    }
  }

  static updateReview = async (req, res) => {
    try {
      const { id } = req.params
      const { rating, customer, partner } = req.body

      const review = await Review.findById(id)
      if (!review) throw new Error('REVIEW_NOT_FOUND')

      rating !== undefined && (review.rating = rating)
      customer?.comment &&
        (review.customer.comment = Array.isArray(customer.comment) ? customer.comment : [customer.comment])
      partner?.comment &&
        (review.partner.comment = Array.isArray(partner.comment) ? partner.comment : [partner.comment])

      await review.save()

      return requestHandler.sendSuccess(req, res, 'REVIEW_UPDATED')(review)
    } catch (error) {
      return requestHandler.sendError(req, res, error.message)
    }
  }

  // Delete Review
  static deleteReview = async (req, res) => {
    try {
      const { id } = req.params
      const review = await Review.findById(id)
      if (!review) throw new Error('REVIEW_NOT_FOUND')

      await Review.deleteOne({ _id: id })

      return requestHandler.sendSuccess(req, res, 'REVIEW_DELETED')({ id })
    } catch (error) {
      return requestHandler.sendError(req, res, error.message)
    }
  }
}

export default ReviewRatingsController
