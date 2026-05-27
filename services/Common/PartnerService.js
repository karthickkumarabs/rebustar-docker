/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseService } from '../BaseService.js'
import Customer from '../../models/Common/Auth/Customer.js'
import mongoose from 'mongoose'
import { InvoiceNumber } from 'invoice-number'

import { Feature } from '../../config/FeatureConfig.js'

class AuthServices extends BaseService {
  static uniCodeGenerator = async (module) => {
    try {
      const allowedModule = ['Customer', 'Provider', 'Admin']
      if (!allowedModule.includes(module)) throw new Error('NOT_FOUND|MODULE')

      let moduleCode = ''
      if (module == 'Customer') {
        moduleCode = `${Feature.account.customerPrefix}${Feature.account.customerStart}`
        const moduleData = await Customer.findOne({}, { uniCode: 1 }, { sort: { _id: -1 } }).exec()
        if (moduleData) moduleCode = InvoiceNumber.next(moduleData.uniCode)
      }

      if (moduleCode == '') throw new Error('NOT_FOUND|MODULE_CODE')
      return {
        status: true,
        message: 'GENERATED',
        data: {
          code: moduleCode
        }
      }
    } catch (error) {
      return {
        status: false,
        data: {},
        message: error.message || 'UNPROCESSABLE_ENTITY'
      }
    }
  }
  static getCustomer = async (query) => {
    const response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const findCondition = []
      if (query._id) findCondition.push({ _id: mongoose.Types.ObjectId(query._id) })

      if (query.phone) findCondition.push({ phone: query.phone })

      if (query.phoneCode) findCondition.push({ phoneCode: query.phoneCode })

      if (query.email) findCondition.push({ email: query.email })

      const account = await Customer.findOne({ $or: findCondition }).exec()

      if (!account) throw new Error('NOT_FOUND|CUSTOMER')

      response.status = true
      response.data = {
        customer: account
      }
      response.message = 'FOUND|CUSTOMER'
    } catch (error) {
      response.status = false
      response.data = {}
      response.message = error.message || response.message
    }
    return response
  }
}

export { AuthServices }
