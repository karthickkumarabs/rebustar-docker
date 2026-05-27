/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

import { BaseService } from '../BaseService.js'
import Language from '../../models/DataStore/Language.js'
import Country from '../../models/DataStore/Country.js'
import State from '../../models/DataStore/State.js'
import City from '../../models/DataStore/City.js'
import Make from '../../models/DataStore/Make.js'
import Model from '../../models/DataStore/Model.js'
import Currency from '../../models/DataStore/Currency.js'
import Year from '../../models/DataStore/Year.js'

class PresetService extends BaseService {
  static getLanguage = async (query) => {
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
      if (query.code) orCond.push({ code: query.code })

      if (query.name) orCond.push({ name: query.name })

      findCondition['$or'] = orCond

      const account = await Language.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|LANGUAGE')

      response.status = true
      response.data = {
        Language: account
      }
      response.message = 'FOUND|LANGUAGE'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getCountry = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const orCond = []
      const findCondition = {}

      if (query.exceptId) findCondition['_id'] = { $ne: mongoose.Types.ObjectId(query.exceptId) }

      // if (query._id) findCondition['_id'] = { _id: mongoose.Types.ObjectId(query._id) }
      if (query._id) orCond.push({ _id: mongoose.Types.ObjectId(query._id) })
      if (query.name) orCond.push({ name: query.name })

      if (query.code) orCond.push({ code: query.code })

      if (query.phonecode) orCond.push({ phonecode: query.phonecode })

      findCondition['$or'] = orCond

      const account = await Country.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|COUNTRY')

      response.status = true
      response.data = {
        Country: account
      }
      response.message = 'FOUND|COUNTY'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getState = async (query) => {
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

      if (query.name) orCond.push({ name: query.name })

      if (query.code) orCond.push({ code: query.code })

      findCondition['$or'] = orCond
      const account = await State.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|STATE')

      response.status = true
      response.data = {
        State: account
      }
      response.message = 'FOUND|STATE'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getCity = async (query) => {
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

      if (query.name) orCond.push({ name: query.name })

      if (query.country_id || query.state_id || query.code) {
        const andCond = []

        if (query.country_id) andCond.push({ country_id: query.country_id })

        if (query.state_id) andCond.push({ state_id: query.state_id })

        if (query.code) andCond.push({ code: query.code })

        if (andCond.length > 0) {
          orCond.push({ $and: andCond })
        }
      }

      findCondition['$or'] = orCond

      const account = await City.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|CITY')

      response.status = true
      response.data = {
        City: account
      }
      response.message = 'FOUND|CITY'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getMake = async (query) => {
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

      if (query.name) orCond.push({ name: query.name })

      findCondition['$or'] = orCond

      const account = await Make.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|MAKE')

      response.status = true
      response.data = {
        Make: account
      }
      response.message = 'FOUND|MAKE'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getModel = async (query) => {
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

      if (query.make_id || query.year || query.name) {
        const andCond = []
        if (query.name) andCond.push({ name: query.name })
        if (query.year) andCond.push({ year: query.year })
        if (query.make_id) andCond.push({ make_id: query.make_id })

        if (andCond.length > 0) {
          orCond.push({ $and: andCond })
        }
      }

      findCondition['$or'] = orCond

      const account = await Model.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|MODEL')

      response.status = true
      response.data = {
        Make: account
      }
      response.message = 'FOUND|MODEL'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getCurrency = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const orCond = []
      const findCondition = {
        deletedAt: null
      }

      if (query.exceptId) findCondition['_id'] = { $ne: mongoose.Types.ObjectId(query.exceptId) }

      if (query._id) orCond.push({ _id: mongoose.Types.ObjectId(query._id) })

      if (query.name) orCond.push({ name: query.name })

      findCondition['$or'] = orCond

      const account = await Currency.findOne(findCondition).exec()

      if (!account) throw new Error('NOT_FOUND|CURRENCY')

      response.status = true
      response.data = {
        Make: account
      }
      response.message = 'FOUND|CURRENCY'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static getYear = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const findCondition = []

      if (query.exceptId)
        findCondition.push({ 'datas._id': { $ne: mongoose.Types.ObjectId(query.exceptId) } })

      if (query.name) findCondition.push({ 'datas.name': query.name })

      console.log(JSON.stringify(findCondition))
      const account = await Year.findOne({ $or: findCondition }).exec()

      if (!account) throw new Error('NOT_FOUND|YEAR')

      response.status = true
      response.data = {
        Year: account
      }
      response.message = 'FOUND|YEAR'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }
}

export { PresetService }
