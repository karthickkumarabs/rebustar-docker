/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseService } from '../BaseService.js'

import Admin from '../../models/Auth/Admin.js'
import AdminGroup from '../../models/Auth/AdminGroup.js'
import Customer from '../../models/Auth/Customer.js'
import Partner from '../../models/Auth/Partner.js'
import Company from '../../models/Auth/Company.js'
import Vehicle from '../../models/Creteria/Vehicle.js'
import ServiceType from '../../models/Creteria/ServiceType.js'

import { InvoiceNumber } from 'invoice-number'

import { Feature } from '../../config/FeatureConfig.js'
import { Enum } from '../../utils/Enum.js'

class AuthServices extends BaseService {
  static uniCodeGenerator = async (module) => {
    let response = {
      status: false,
      message: 'UNPROCESSABLE_ENTITY',
      data: {}
    }
    try {
      const allowedModule = ['Customer', 'Provider', 'Admin', 'Partner']
      if (!allowedModule.includes(module)) throw new Error('NOT_FOUND|MODULE')

      let moduleCode = ''
      if (module == 'Customer') {
        moduleCode = `${Feature.account.customerPrefix}${Feature.account.customerStart}`
        const moduleData = await Customer.findOne({}, { uniCode: 1 }, { sort: { _id: -1 } }).exec()
        if (moduleData && moduleData?.uniCode != '') moduleCode = InvoiceNumber.next(moduleData.uniCode)
        else moduleCode
      }
      if (module == 'Partner') {
        moduleCode = `${Feature.account.partnerPrefix}${Feature.account.partnerStart}`
        const moduleData = await Partner.findOne({}, { uniCode: 1 }, { sort: { _id: -1 } }).exec()
        if (moduleData && moduleData?.uniCode != '') moduleCode = InvoiceNumber.next(moduleData.uniCode)
        else moduleCode
      }
      console.log('moduleCode', moduleCode)
      if (moduleCode == '') throw new Error('NOT_FOUND|MODULE_CODE')
      response = {
        status: true,
        message: 'GENERATED',
        data: {
          code: moduleCode
        }
      }
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getCustomer = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const orCond = []
      const findCondition = {}
      if (query.exceptId) findCondition['_id'] = { $ne: mongoose.Types.ObjectId(query.exceptId) }

      if (query.phone || query.phoneCode) {
        const phoneValid = []
        if (query.phone) phoneValid.push({ phone: query.phone })
        if (query.phoneCode) phoneValid.push({ phoneCode: query.phoneCode })

        if (phoneValid.length > 0) {
          orCond.push({ $and: phoneValid })
        }
      }

      if (query.email) orCond.push({ email: query.email })

      findCondition['$or'] = orCond

      const account = await Customer.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|CUSTOMER')

      response.status = true
      response.data = {
        customer: account
      }
      response.message = 'FOUND|CUSTOMER'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getPartner = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const orCond = []
      const findCondition = {}
      if (query.exceptId) findCondition['_id'] = { $ne: mongoose.Types.ObjectId(query.exceptId) }
      if (query._id) orCond.push({ _id: mongoose.Types.ObjectId(query._id) })
      if (query.phone || query.phoneCode) {
        const phoneValid = []
        if (query.phone) phoneValid.push({ phone: query.phone })
        if (query.phoneCode) phoneValid.push({ phoneCode: query.phoneCode })

        if (phoneValid.length > 0) {
          orCond.push({ $and: phoneValid })
        }
      }

      if (query.email) orCond.push({ email: query.email })

      findCondition['$or'] = orCond

      const account = await Partner.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|PARTNER')

      response.status = true
      response.data = {
        partner: account
      }
      response.message = 'FOUND|PARTNER'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getAdmin = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const orCond = []
      const findCondition = {}
      if (query.exceptId) findCondition['_id'] = { $ne: mongoose.Types.ObjectId(query.exceptId) }

      if (query.phone || query.phoneCode) {
        const phoneValid = []
        if (query.phone) phoneValid.push({ phone: query.phone })
        if (query.phoneCode) phoneValid.push({ phoneCode: query.phoneCode })

        if (phoneValid.length > 0) {
          orCond.push({ $and: phoneValid })
        }
      }

      if (query.email) orCond.push({ email: query.email })

      findCondition['$or'] = orCond
      const account = await Admin.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|ADMIN')

      response.status = true
      response.data = {
        admin: account
      }
      response.message = 'FOUND|ADMIN'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getAdminGroup = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const orCond = []
      const findCondition = {}
      if (query.exceptId) findCondition['_id'] = { $ne: mongoose.Types.ObjectId(query.exceptId) }
      if (query._id) findCondition['_id'] = mongoose.Types.ObjectId(query._id)
      if (query.group) orCond.push({ group: query.group })
      findCondition['$or'] = orCond
      const adminGroup = await AdminGroup.findOne(findCondition).lean().exec()

      if (!adminGroup) throw new Error('NOT_FOUND|ADMIN_GROUP')

      response.status = true
      response.data = {
        admin: adminGroup
      }
      response.message = 'FOUND|ADMIN_GROUP'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getPartnertaxi = async (body) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const account = await Partner.findOne({
        _id: body.partner,
        taxis: { $elemMatch: { licence: body.licence } }
      }).exec()

      if (account) throw new Error('VEHICLE_ALREADY_EXISTS')

      response.status = false
      response.data = {
        customer: account
      }
      response.message = 'FOUND|PARTNER_TAXI'
    } catch (error) {
      response = {
        status: true,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getCompany = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const orCond = []
      const findCondition = {}
      if (query.exceptId) findCondition['_id'] = { $ne: mongoose.Types.ObjectId(query.exceptId) }
      if (query._id) orCond.push({ _id: query._id })
      if (query.phone || query.phoneCode) {
        const phoneValid = []
        if (query.phone) phoneValid.push({ phone: query.phone })
        if (query.phoneCode) phoneValid.push({ phoneCode: query.phoneCode })

        if (phoneValid.length > 0) {
          orCond.push({ $and: phoneValid })
        }
      }

      if (query.email) orCond.push({ email: query.email })

      findCondition['$or'] = orCond

      const account = await Company.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|COMPANY')

      response.status = true
      response.data = {
        company: account
      }
      response.message = 'FOUND|COMPANY'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static updateRating = async (ratingData) => {
    try {
      const { userId, userRole, rating } = ratingData
      if (userRole == Enum.ROLES.CUSTOMER) {
        const customer = await Customer.findOne({ _id: mongoose.Types.ObjectId(userId) }).exec()
        if (!customer) throw new Error('CUSTOMER_NOT_FOUND')

        const newRating = Number(
          (
            ((customer.ratings.totalValue || 0) * (customer.ratings.totalCount || 0) + (rating || 0)) /
            ((customer.ratings.totalCount || 0) + 1)
          ).toFixed(2)
        )
        if (!newRating) throw new Error('RATING_MIS_CALCULATED')

        customer.ratings.totalValue = newRating
        customer.ratings.totalCount = customer.ratings.totalCount + 1

        await customer.save()
      } else if (userRole == Enum.ROLES.PARTNER) {
        const partner = await Partner.findOne({ _id: mongoose.Types.ObjectId(userId) }).exec()
        if (!partner) throw new Error('PARTNER_NOT_FOUND')

        const newRating = Number(
          (
            ((partner.ratings.totalValue || 0) * (partner.ratings.totalCount || 0) + (rating || 0)) /
            ((partner.ratings.totalCount || 0) + 1)
          ).toFixed(2)
        )
        if (!newRating) throw new Error('RATING_MIS_CALCULATED')

        partner.ratings.totalValue = newRating
        partner.ratings.totalCount = partner.ratings.totalCount + 1

        await partner.save()
      } else {
        throw new Error('UNKNOWN_ROLE')
      }
      console.log('UPDATE_RATING_SUCCESS')
    } catch (error) {
      console.error('UPDATE_RATING_ERROR', error)
    }
  }

  // Before check your replica is set already
  static partnerAutoApproval = async (data) => {
    let response = {
      status: false,
      message: 'UNPROCESSABLE_ENTITY',
      data: {}
    }
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
      const { partnerId, scopeOperation = [], vehicleId = null } = data
      const scopeOperationLength = scopeOperation.length

      if (scopeOperationLength == 0 || scopeOperation.includes('PARTNER_DOCUMENTS')) {
        const updatePartnerDocs = await Partner.findOneAndUpdate(
          {
            _id: mongoose.Types.ObjectId(partnerId)
          },
          {
            $set: {
              'document.$[elem].status': 'approved'
            }
          },
          {
            new: true,
            arrayFilters: [{ 'elem.status': 'pending' }],
            projection: {
              document: 1
            }
          }
        ).exec()
        response.data.partnerDocuments = updatePartnerDocs.document
      }

      // throw new Error('CHECKING')

      if (scopeOperationLength == 0 || scopeOperation.includes('VEHICLE_DOCUMENTS')) {
        if (!vehicleId) throw new Error('VEHICLE_ID_REQUIRED')
        const updateVehicleDocs = await Vehicle.findOneAndUpdate(
          { _id: vehicleId },
          {
            $set: {
              'document.$[elem].status': 'approved'
            }
          },
          {
            new: true,
            arrayFilters: [{ 'elem.status': 'pending' }],
            projection: {
              document: 1
            }
          }
        )
        response.data.vehicleDocuments = updateVehicleDocs?.document || []
      }

      if (scopeOperationLength == 0 || scopeOperation.includes('VEHICLE_ACTIVE')) {
        if (!vehicleId) throw new Error('VEHICLE_ID_REQUIRED')
        const getVehicle = await Vehicle.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(vehicleId) },
          {
            $set: {
              status: 'active'
            }
          },
          {
            new: true
          }
        )
          .lean()
          .exec()
        if (!getVehicle) throw new Error('VEHICLE_NOT_FOUND')

        const getService = await ServiceType.findOne({ _id: getVehicle.servicetype }).lean().exec()
        if (!getService) throw new Error('SERVICE_NOT_FOUND')

        await Partner.findOneAndUpdate(
          { _id: partnerId },
          { $set: { activeVechicle: vehicleId, curService: getService._id } },
          { new: true }
        )

        response.data.vehicleActive = {
          vehicleId: vehicleId,
          serviceTypeId: getService._id,
          serviceType: getService.name
        }
      }

      if (scopeOperationLength == 0 || scopeOperation.includes('PARTNER_ACTIVE')) {
        const updateVehicleDocs = await Partner.findOneAndUpdate(
          {
            _id: mongoose.Types.ObjectId(partnerId)
          },
          {
            status: 'Active'
          },
          {
            new: true
          }
        )
        response.data.prtnerStatus = updateVehicleDocs?.status || false
      }

      response.status = true
      response.message = 'PROCESSED'

      await session.commitTransaction()
    } catch (error) {
      console.error('PARTNER_AUTO_APPROVAL', error)
      await session.abortTransaction()
      response = {
        status: false,
        message: 'UNPROCESSABLE_ENTITY',
        data: {}
      }
    } finally {
      session.endSession() // Release the session even if an error occurs
    }
    return response
  }
}

export { AuthServices }
