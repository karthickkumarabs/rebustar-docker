/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { Worker } from 'worker_threads'
import { BaseController } from './../BaseController.js'

import Admin from '../../models/Auth/Admin.js'
import Company from '../../models/Auth/Company.js'
import Partner from '../../models/Auth/Partner.js'
import Customer from '../../models/Auth/Customer.js'
import ServiceType from '../../models/Creteria/ServiceType.js'
import Trip from '../../models/ServiceModule/Trip.js'

import { AuthValidator } from '../../validators/Common/AuthValidator.js'
// import { AuthServices } from '../../services/Common/AuthService.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { Enum } from '../../utils/Enum.js'
import { Config } from '../../config/AppConfig.js'
import Make from '../../models/DataStore/Make.js'
import Model from '../../models/DataStore/Model.js'
import Country from '../../models/DataStore/Country.js'
import State from '../../models/DataStore/State.js'
import City from '../../models/DataStore/City.js'
import Vehicle from '../../models/Creteria/Vehicle.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ReportController extends BaseController {
  constructor() {
    super()
  }

  static dashboard = async (req, res) => {
    try {
      const response = { message: 'DASHBOARD' }
      const paramData = req.params
      const queryData = req.query
      // const setDate = new Date(queryData.date) || new Date()
      let setDate = new Date(queryData.date)
      if (isNaN(setDate)) setDate = new Date()
      const setDateYear = setDate.getFullYear()
      const setDateMonth = setDate.getMonth()

      if (!paramData.requestType || paramData.requestType == 'totalRecord') {
        const totalRecord = {
          partner: 0,
          customer: 0,
          company: 0,
          vehicle: 0,
          trip: 0
        }
        totalRecord.partner = (await Partner.countDocuments()) || 0
        totalRecord.customer = (await Customer.countDocuments()) || 0
        totalRecord.company = (await Company.countDocuments()) || 0
        totalRecord.vehicle = (await ServiceType.countDocuments()) || 0
        totalRecord.trip = (await Trip.countDocuments()) || 0
        response['totalRecord'] = totalRecord
      }

      if (!paramData.requestType || paramData.requestType == 'tripEarning') {
        const monthStart = new Date(setDateYear, setDateMonth, 1)
        const monthEnd = new Date(setDateYear, setDateMonth + 1, 0, 23, 59, 59, 999)
        const tripEarningArr = await Trip.aggregate([
          {
            $match: {
              status: Enum.TRIP.STATUS.FINISHED,
              updatedAt: {
                $gte: monthStart, // Start of day
                $lt: monthEnd // End of day
              }
            }
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              admin: { $sum: '$invoice.earnings' },
              partner: { $sum: '$invoice.payable' },
              trip: { $sum: '$invoice.totalFare' }
            }
          }
        ])
        const tripEarning = {
          count: tripEarningArr?.[0]?.count || 0,
          admin: (tripEarningArr?.[0]?.admin || 0).toFixed(2),
          partner: (tripEarningArr?.[0]?.partner || 0).toFixed(2),
          trip: (tripEarningArr?.[0]?.trip || 0).toFixed(2)
        }
        response['tripEarning'] = tripEarning
      }

      if (!paramData.requestType || paramData.requestType == 'tripReport') {
        const queryObject = {}
        let dateRangeQuery = { $dayOfMonth: '$createdAt' }
        if (queryData.dateRange === 'year') {
          const yearStartDate = new Date(setDate)
          const yearEndDate = new Date(setDate.getFullYear(), 11, 31, 23, 59, 59, 999)

          queryObject['createdAt'] = {
            $gte: yearStartDate,
            $lt: yearEndDate
          }

          dateRangeQuery = { $month: '$createdAt' }
        } else if (queryData.dateRange === 'month') {
          const monthStart = new Date(setDate)
          const monthEnd = new Date(setDate.getFullYear(), setDate.getMonth() + 1, 0, 23, 59, 59, 999)

          queryObject['createdAt'] = {
            $gte: monthStart,
            $lt: monthEnd
          }
          dateRangeQuery = { $dayOfMonth: '$createdAt' }
        } else if (queryData.dateRange === 'week') {
          const dayOfWeek = setDate.getDay()
          const weekStart = new Date(setDate)
          weekStart.setDate(setDate.getDate() - dayOfWeek)
          weekStart.setHours(0, 0, 0, 0)

          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          weekEnd.setHours(23, 59, 59, 999)

          queryObject['createdAt'] = { $gte: weekStart, $lt: weekEnd }

          dateRangeQuery = { $dayOfWeek: '$createdAt' }
        }

        console.log('queryObject', queryObject)

        const tripReport = await Trip.aggregate([
          {
            $match: queryObject
          },
          {
            $project: {
              paymentStatus: 1,
              month: dateRangeQuery,
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            }
          },
          {
            $group: {
              _id: { paymentStatus: '$paymentStatus', month: '$month' },
              count: { $sum: 1 },
              date: { $first: '$date' }
            }
          },
          {
            $group: {
              _id: '$_id.month',
              value: {
                $push: {
                  status: '$_id.paymentStatus',
                  count: '$count'
                }
              },
              count: { $sum: '$count' },
              date: { $first: '$date' }
            }
          },
          {
            $project: {
              _id: '$_id',
              value: {
                $filter: {
                  input: '$value',
                  as: 'item',
                  cond: { $eq: ['$$item.status', 'PAID'] }
                }
              },
              count: '$count',
              date: '$date'
            }
          }
        ])
        response['tripReport'] = tripReport
      }

      return requestHandler.sendSuccess(req, res, 'DASHBOARD')(response)
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static siteStatistics = async (req, res) => {
    try {
      const response = { message: 'SITE_STATISTICS' }
      const paramData = req.params
      const queryData = req.query
      let setDate = new Date(queryData.date)
      if (isNaN(setDate)) setDate = new Date()
      const setDateYear = setDate.getFullYear()

      let dateRangeQuery = { $dayOfMonth: '$createdAt' }
      if (queryData.dateRange == 'year') {
        dateRangeQuery = { $month: '$createdAt' }
      }
      let dayStart
      if (queryData.dateRange === 'year') {
        dayStart = new Date(setDateYear, 0, 1)
      } else if (queryData.dateRange === 'week') {
        const day = setDate.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const diffToMonday = setDate.getDate() - day + (day === 0 ? -6 : 1)
        dayStart = new Date(setDate)
        dayStart.setDate(diffToMonday)
        dayStart.setHours(0, 0, 0, 0)
      } else {
        // default to month
        dayStart = new Date(setDateYear, setDate.getMonth(), 1)
      }
      let dayEnd
      if (queryData.dateRange === 'year') {
        dayEnd = new Date(setDateYear + 1, 0, 1)
      } else if (queryData.dateRange === 'week') {
        dayEnd = new Date(dayStart)
        dayEnd.setDate(dayStart.getDate() + 7)
        dayEnd.setHours(0, 0, 0, 0)
      } else {
        // default to month
        dayEnd = new Date(setDateYear, setDate.getMonth() + 1, 1)
      }

      if (!paramData.requestType || paramData.requestType == 'tripReport') {
        const tripReportQuery = {
          deletedAt: null,
          status: Enum.TRIP.STATUS.FINISHED,
          createdAt: { $gte: dayStart, $lt: dayEnd }
        }
        const tripReport = await Trip.aggregate([
          {
            $match: tripReportQuery
          },
          {
            $lookup: {
              from: 'serviceareas', // collection name (check your actual collection name)
              localField: 'serviceArea',
              foreignField: '_id',
              as: 'serviceArea'
            }
          },
          { $unwind: { path: '$serviceArea', preserveNullAndEmptyArrays: true } },
          ...(queryData.scity_like
            ? [
                {
                  $match: {
                    'serviceArea.name': { $regex: queryData.scity_like, $options: 'i' }
                  }
                }
              ]
            : []),

          {
            $group: {
              _id: dateRangeQuery,
              totalAmount: { $sum: '$invoice.totalFare' },
              discount: { $sum: '$invoice.discountFare' },
              online: {
                $sum: {
                  $cond: {
                    if: { $ne: ['$paymentMethod', Enum.TRIP.PAYMENT_MODE.CASH] },
                    then: '$invoice.totalFare',
                    else: 0
                  }
                }
              },
              offline: {
                $sum: {
                  $cond: {
                    if: { $eq: ['$paymentMethod', Enum.TRIP.PAYMENT_MODE.CASH] },
                    then: '$invoice.totalFare',
                    else: 0
                  }
                }
              },
              partner: { $sum: '$invoice.totalFare' },
              admin: { $sum: '$invoice.earnings' },
              date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }
            }
          }
        ])
        response['tripReport'] = tripReport
      }
      if (!paramData.requestType || paramData.requestType == 'tripCount') {
        const tripCountQuery = {
          deletedAt: null,
          createdAt: { $gte: dayStart, $lt: dayEnd }
        }
        const tripCountArr = await Trip.aggregate([
          { $match: { ...tripCountQuery } },
          {
            $lookup: {
              from: 'serviceareas',
              localField: 'serviceArea',
              foreignField: '_id',
              as: 'serviceArea'
            }
          },
          { $unwind: { path: '$serviceArea', preserveNullAndEmptyArrays: true } },
          ...(queryData.scity_like
            ? [
                {
                  $match: {
                    'serviceArea.name': { $regex: queryData.scity_like, $options: 'i' }
                  }
                }
              ]
            : []),
          {
            $group: {
              _id: null,
              finished: { $sum: { $cond: [{ $eq: ['$status', Enum.TRIP.STATUS.FINISHED] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', Enum.TRIP.STATUS.CANCELLED] }, 1, 0] } },
              noResponse: { $sum: { $cond: [{ $eq: ['$status', Enum.TRIP.STATUS.NORESPONSE] }, 1, 0] } }
            }
          }
        ])

        const tripCount = {
          finished: tripCountArr?.[0]?.finished || 0,
          cancelled: tripCountArr?.[0]?.cancelled || 0,
          noResponse: tripCountArr?.[0]?.noResponse || 0
        }
        response['tripCount'] = tripCount
      }

      if (!paramData.requestType || paramData.requestType == 'customerCount') {
        const customerCountQuery = {
          deletedAt: null,
          createdAt: { $gte: dayStart, $lt: dayEnd }
        }
        const customerCount = await Customer.aggregate([
          {
            $match: customerCountQuery
          },
          {
            $project: {
              month: { $month: '$createdAt' }
            }
          },
          {
            $group: {
              _id: '$month',
              count: { $sum: 1 }
            }
          }
        ])
        response['customerCount'] = customerCount
      }

      return requestHandler.sendSuccess(req, res, 'SITE_STATISTICS')(response)
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static adminReport = async (req, res) => {
    try {
      const validation = await AuthValidator.validateData(req.query, 'getAdmin')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const queryData = req.query
      const paramData = req.params
      const perPage = queryData.limit || 1000
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const queryBuilder = await QueryBuilder.getSearchable(Admin, queryData)
      const queryObject = queryBuilder.queryObject

      if (paramData.adminId) {
        queryObject['_id'] = mongoose.Types.ObjectId(paramData.adminId)
      }

      const getData = await Admin.find(queryObject).sort({ _id: -1 }).skip(skip).limit(perPage).lean().exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            fname: 'First Name',
            lname: 'Last Name',
            email: 'Email',
            phone: 'Phone',
            group: 'Role',
            createdAt: 'Created Time'
          },
          filename: 'Admin-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'Admin-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=Admin-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_ADMIN_ERROR', error)
      return res.status(500).send(error.message)
    }
  }

  static partnerReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const getData = await Partner.find({}).sort({ _id: -1 }).skip(skip).limit(perPage).lean().exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            fname: 'First Name',
            lname: 'Last Name',
            email: 'Email',
            phone: 'Phone',
            status: 'Status',
            online: 'Online',
            createdAt: 'Created At',
            updatedAt: 'Last Updated Time'
          },
          filename: 'Partner-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        console.log(stream, 'stream')
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'Partner-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=Partner-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_PARTNER_ERROR', error)
      return res.status(500).send(error.message)
    }
  }

  static customerReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0
      const getData = await Customer.find({}).sort({ _id: -1 }).skip(skip).limit(perPage).lean().exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            fname: 'First Name',
            lname: 'Last Name',
            email: 'Email',
            phone: 'Phone',
            status: 'Status',
            createdAt: 'Created At'
          },
          filename: 'Customer-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'Customer-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=Customer-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_CUSTOMER_ERROR', error)
      return res.status(500).send(error.message)
    }
  }

  static tripReport = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params
      const perPage = queryData.limit || 1000
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const queryBuilder = await QueryBuilder.getSearchable(Trip, queryData)
      const queryObject = queryBuilder.queryObject

      if (paramData.tripId) {
        queryObject['_id'] = mongoose.Types.ObjectId(paramData.tripId)
      }

      const getData = await Trip.find(queryObject).sort({ _id: -1 }).skip(skip).limit(perPage).lean().exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            module: 'Trip Type',
            requestFrom: 'Request From',
            referenceNo: 'Trip No',
            scheduleOn: 'Date',
            paymentMethod: 'Payment Method',
            'customer.name': 'Customer Name',
            'customer.phoneNo': 'Customer PhoneNo',
            'partner.name': 'Partner Name',
            'partner.phoneNo': 'Partner PhoneNo',
            'partner.vehicle': 'Vehicle Type',
            'invoice.totalFare': 'TotalFare',
            status: 'Status'
          },
          filename: 'Trip-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'Trip-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=Trip-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_TRIP_ERROR', error)
      return res.status(500).send(error.message)
    }
  }

  static tripPaymentReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 1000
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const getData = await Trip.find({ status: 'Finished' })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(perPage)
        .lean()
        .exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            referenceNo: 'Trip no',
            scheduleOn: 'TripDate',
            paymentMethod: 'Payment Mode',
            'partner.name': 'Partner Name',
            'partner.code': 'Partner Code',
            'invoice.bookingFare': 'Booking Fare',
            'invoice.taxFare': 'GST',
            'invoice.discountFare': 'Discount Fare',
            'invoice.roundOff': 'Round Off',
            'invoice.totalFare': 'Total Fare',
            'invoice.commision': 'Commision',
            'invoice.earnings': 'Partner earned',
            status: 'Ride Status'
          },
          filename: 'TripPayment-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'TripPayment-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=TripPayment-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_TRIP_ERROR', error)
      return res.status(500).send(error.message)
    }
  }

  static createInvoice = async (req, res) => {
    try {
      const requestId = req.query.requestId || null
      if (!requestId) throw new Error('UNPROCESSABLE_ENTRY')

      const getData = await Trip.findOne({ _id: mongoose.Types.ObjectId(requestId) })
        .lean()
        .exec()
      if (!getData) throw new Error('TRIP_NOT_FOUND')

      const invoice = {
        invoiceNo: getData.referenceNo,
        createdAt: new Date(getData.createdAt).toDateString(),
        currency: Config.app.currency /* getData.currency*/,
        roundOff: getData.invoice.roundOff,
        totalFare: getData.invoice.totalFare,
        paymentMode: getData.paymentMethod,
        pickupAddress: getData.invoice.start,
        dropAddress: getData.invoice.end,
        partner: {
          name: getData.partner.name,
          vehicleNo: getData.partner.vehicleNo,
          vehicleType: getData.partner.serviceTypeName,
          distance: getData.invoice.distance + ' KM',
          time: getData.invoice.estTime + ' M'
        },
        items: [
          {
            item: 'Base Fare',
            value: getData.invoice.baseFare
          },
          {
            item: 'Booking Fare',
            value: getData.invoice.bookingFare
          },
          {
            item: 'Distance Fare',
            value: getData.invoice.fareAmt
          },
          {
            item: 'Time Fare',
            value: getData.invoice.timeFare
          },
          {
            item: 'Waiting Charge',
            value: getData.invoice.waitingFare
          },
          {
            item: 'Tax',
            value: getData.invoice.taxFare
          }
        ]
      }
      console.log('invoice', invoice)
      const worker = new Worker('./utils/InvoiceWorker.js', {
        workerData: {
          invoice,
          path: 'output.pdf'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'Report.pdf')
          // res.setHeader('Content-disposition', 'attachment; filename=Report.pdf')
          res.setHeader('Content-type', 'application/pdf')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('CREATE_INVOICE_ERROR:', error)
      return res.status(500).send(error.message)
    }
  }
  static makeReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 1000
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0
      const getData = await Make.find({ status: true }).skip(skip).limit(perPage).lean().exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            name: 'Name',
            status: 'Status'
          },
          filename: 'Make-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'Make-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=Make-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_TRIP_ERROR', error)
      return res.status(500).send(error.message)
    }
  }
  static modelReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 1000
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0
      const getData = await Model.find({ status: true }).skip(skip).limit(perPage).lean().exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            name: 'Name',
            year: 'Year',
            status: 'Status'
          },
          filename: 'Model-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete-----1')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'Model-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=Model-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_TRIP_ERROR', error)
      return res.status(500).send(error.message)
    }
  }
  static countryReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 1000
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const getData = await Country.find({ status: true }).skip(skip).limit(perPage).lean().exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            name: 'Name',
            code: 'Code',
            phonecode: 'Phone Code',
            status: 'Status'
          },
          filename: 'Country-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'Country-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=Country-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_TRIP_ERROR', error)
      return res.status(500).send(error.message)
    }
  }
  static stateReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 1000
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const getData = await State.find({ status: true }).skip(skip).limit(perPage).lean().exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            name: 'Name',
            code: 'Code',
            phonecode: 'Phone Code',
            status: 'Status'
          },
          filename: 'State-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'State-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=State-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_TRIP_ERROR', error)
      return res.status(500).send(error.message)
    }
  }
  static cityReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 1000
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const getData = await City.find({ status: true }).skip(skip).limit(perPage).lean().exec()
      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            name: 'Name',
            code: 'Code',
            phonecode: 'Phone Code',
            status: 'Status'
          },
          filename: 'State-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          console.log('Excel file generation complete')
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'State-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=State-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
          // stream.pipe(res)
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_TRIP_ERROR', error)
      return res.status(500).send(error.message)
    }
  }

  static vehicleReport = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const getData = await Vehicle.find({})
        .populate('partnerId', 'fname lname')
        .sort({ _id: -1 })
        .skip(skip)
        .limit(perPage)
        .lean()
        .exec()

      const worker = new Worker('./utils/ExcelWorker.js', {
        workerData: {
          data: getData,
          columns: {
            ownerType: 'Owner Type',
            partnername: 'Partner Name',
            servicetypename: 'Service Type',
            registrationnumber: 'Registration Number',
            color: 'Color',
            status: 'Status',
            createdAt: 'Created At',
            updatedAt: 'Last Updated Time'
          },

          filename: 'Vehicle-Report.xlsx'
        }
      })

      worker.on('message', (stream) => {
        console.log(stream, 'stream')
        if (stream.error) {
          res.status(500).send('Worker error')
        } else {
          res.header('Access-Control-Allow-Headers', '*')
          res.setHeader('x-filename', 'Vehicle-Report.xlsx')
          res.setHeader('Content-disposition', 'attachment; filename=Vehicle-Report.xlsx')
          res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          res.send(Buffer.from(stream.buffer))
        }
      })

      worker.on('error', (error) => {
        console.error('Worker error:', error)
        res.status(500).send('Worker error')
      })
    } catch (error) {
      console.error('DOWNLOAD_REPORT_VEHICLE_ERROR', error)
      return res.status(500).send(error.message)
    }
  }
}
export { ReportController }
