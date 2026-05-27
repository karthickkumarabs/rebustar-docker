/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import XLSX from 'xlsx'
import mongoose from 'mongoose'
import { BaseController } from './../BaseController.js'

import Language from '../../models/DataStore/Language.js'
import Country from '../../models/DataStore/Country.js'
import State from '../../models/DataStore/State.js'
import City from '../../models/DataStore/City.js'
import Model from '../../models/DataStore/Model.js'
import Make from '../../models/DataStore/Make.js'
import Currency from '../../models/DataStore/Currency.js'
import Year from '../../models/DataStore/Year.js'

import { PresetValidator } from './../../validators/DataStore/PresetValidator.js'
import { PresetService } from '../../services/DataStore/PresetService.js'

import { Feature } from '../../config/FeatureConfig.js'

import { RequestHandler } from './../../utils/RequestHandler.js'
import { Logger } from './../../utils/Logger.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'

import { NotFoundError } from '../../utils/ErrorHandler.js'
const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class PresetController extends BaseController {
  constructor() {
    super()
  }

  static getServiceModule = async (req, res) => {
    try {
      const moduleData = Feature.modules
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_SERVICE_MODULE'
      )({ message: 'LISTED|MODULE', modules: moduleData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getLanguageExists = async (req, res) => {
    try {
      const query = req.query

      const validation = await PresetValidator.validateData(query, 'getLanguageExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getLanguage(query)
      if (account?.status) throw new NotFoundError('EXIST|LANGUAGE')

      return requestHandler.sendSuccess(req, res, 'GET_LANGUAGE_EXISTS')({ message: 'NOT_EXIST|LANGUAGE' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async getAllLanguages(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const queryObj = {}
      if (queryData.title) {
        queryObj.title = { $regex: queryData.title, $options: 'i' }
      }
      if (paramData.id) {
        queryObj._id = mongoose.Types.ObjectId(paramData.id)
      }
      const getDataCount = await Language.find(queryObj).count()
      const getData = await Language.find(queryObj).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ALL_LANGUAGES'
      )({ message: 'LISTED|LANGUAGE', languages: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createLanguage = async (req, res) => {
    try {
      const body = req.body

      const validation = await PresetValidator.validateData(body, 'createLanguage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingLang = await Language.findOne({
        $or: [{ code: body.code }, { name: body.name }]
      }).lean()

      if (existingLang) {
        if (existingLang.code === body.code) {
          throw new NotFoundError('LANGUAGE CODE ALREADY EXISTS')
        }
        if (existingLang.name === body.name) {
          throw new NotFoundError('LANGUAGE NAME ALREADY EXISTS')
        }
      }

      const newLanguage = new Language({
        code: body.code,
        name: body.name
      })

      const language = await newLanguage.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_LANGUAGE'
      )({ message: 'CREATED|LANGUAGE', language: language })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateLanguage = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.languageId
      body.exceptId = userId

      const validation = await PresetValidator.validateData(body, 'createLanguage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingLang = await Language.findOne({
        $or: [{ code: body.code }, { name: body.name }]
      }).lean()

      if (existingLang) {
        if (existingLang.code === body.code) {
          throw new NotFoundError('LANGUAGE CODE ALREADY EXISTS')
        }
        if (existingLang.name === body.name) {
          throw new NotFoundError('LANGUAGE NAME ALREADY EXISTS')
        }
      }

      const language = await Language.findById(userId).exec()

      language.code = body.code || language.code
      language.name = body.name || language.name

      const updatedLanguage = await language.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_LANGUAGE'
      )({ message: 'UPDATED|LANGUAGE', language: updatedLanguage })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteLanguage = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.languageId
      body._id = userId

      const account = await PresetService.getLanguage(body)
      if (!account?.status) {
        throw new NotFoundError('NOT_EXISTS')
      }
      const language = await Language.findById(userId).remove().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_LANGUAGE'
      )({ message: 'DELETED|LANGUAGE', language: language })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getCountryExists = async (req, res) => {
    try {
      const query = req.query

      const validation = await PresetValidator.validateData(query, 'getCountryExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getCountry(query)
      if (account?.status) throw new NotFoundError('EXIST|COUNTRY')

      return requestHandler.sendSuccess(req, res, 'GET_COUNTRY_EXISTS')({ message: 'NOT_EXIST|COUNTRY' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async getAllCountry(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(Country, queryData)
      queryObject = queryBuilder.queryObject

      if (paramData.countryId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.countryId)
      }
      const getDataCount = await Country.find(queryObject).count()
      const getData = await Country.find(queryObject).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ALL_COUNTRY'
      )({ message: 'LISTED|COUNTRY', countries: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async listAllCountries(req, res) {
    try {
      const queryData = req.query
      const perPage = queryData.limit
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0
      let queryObj = {}
      const queryBuilder = await QueryBuilder.getSearchable(Country, queryData)
      queryObj = queryBuilder.queryObject
      if (queryData.name) {
        queryObj.name = { $regex: queryData.name, $options: 'i' }
      }
      const getDataCount = await Country.find(queryObj).count()
      const getData = await Country.find(queryObj).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ALL_COUNTRIES'
      )({ message: 'LISTED|COUNTRIES', countries: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createCountry = async (req, res) => {
    try {
      const body = req.body

      const validation = await PresetValidator.validateData(body, 'createCountry')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingCountry = await Country.findOne({
        $or: [{ name: body.name }, { code: body.code }]
      }).lean()

      existingCountry?.name === body.name
        ? (() => {
            throw new NotFoundError('COUNTRY NAME ALREADY EXISTS')
          })()
        : existingCountry?.code === body.code
        ? (() => {
            throw new NotFoundError('COUNTRY CODE ALREADY EXISTS')
          })()
        : null

      const newCountry = new Country({
        code: body.code,
        name: body.name,
        phonecode: body.phonecode
      })

      const country = await newCountry.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_COUNTRY'
      )({ message: 'CREATED|COUNTRY', country: country })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateCountry = async (req, res) => {
    try {
      const body = req.body
      const countryId = req.params.countryId
      body.exceptId = countryId

      const validation = await PresetValidator.validateData(body, 'updateCountry')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingCountry = await Country.findOne({
        _id: { $ne: countryId },
        $or: [{ name: body.name }, { code: body.code }]
      }).lean()

      existingCountry?.name === body.name
        ? (() => {
            throw new NotFoundError('COUNTRY NAME ALREADY EXISTS')
          })()
        : existingCountry?.code === body.code
        ? (() => {
            throw new NotFoundError('COUNTRY CODE ALREADY EXISTS')
          })()
        : null

      const country = await Country.findById(countryId).exec()

      country.code = body.code || country.code
      country.name = body.name || country.name
      country.phonecode = body.phonecode || country.phonecode

      const updatedCountry = await country.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_COUNTRY'
      )({ message: 'UPDATED|COUNTRY', country: updatedCountry })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteCountry = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.countryId
      body._id = userId

      const account = await PresetService.getCountry(body)
      if (!account?.status) {
        throw new NotFoundError('NOT_EXISTS')
      }
      const country = await Country.findById(userId).remove().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_COUNTRY'
      )({ message: 'DELETED|COUNTRY', country: country })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getStateExists = async (req, res) => {
    try {
      const query = req.query

      const validation = await PresetValidator.validateData(query, 'getStateExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getState(query)
      if (account?.status) throw new NotFoundError('EXIST|STATE')

      return requestHandler.sendSuccess(req, res, 'GET_STATE_EXISTS')({ message: 'NOT_EXIST|STATE' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async getAllState(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(State, queryData)
      queryObject = queryBuilder.queryObject

      if (paramData.stateId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.stateId)
      }
      const getDataCount = await State.find(queryObject).count()
      const getData = await State.find(queryObject).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ALL_STATE'
      )({ message: 'LISTED|STATE', states: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async listAllStates(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const queryObj = {}
      if (queryData.name) {
        queryObj.name = { $regex: queryData.name, $options: 'i' }
      }
      if (paramData.countryId) {
        queryObj.country_id = mongoose.Types.ObjectId(paramData.countryId)
      }
      const getDataCount = await State.find(queryObj).count()
      const getData = await State.find(queryObj).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ALL_STATE'
      )({ message: 'LISTED|STATE', states: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createState = async (req, res) => {
    try {
      const body = req.body

      const validation = await PresetValidator.validateData(body, 'createState')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingState = await State.findOne({
        $or: [{ name: body.name }, { code: body.code }]
      }).lean()

      existingState?.name === body.name
        ? (() => {
            throw new NotFoundError('STATE NAME ALREADY EXISTS')
          })()
        : existingState?.code === body.code
        ? (() => {
            throw new NotFoundError('STATE CODE ALREADY EXISTS')
          })()
        : null

      const newState = new State({
        name: body.name,
        code: body.code,
        country_id: body.country_id
      })

      const state = await newState.save()
      return requestHandler.sendSuccess(req, res, 'CREATE_STATE')({ message: 'CREATED|STATE', state: state })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateState = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.stateId
      body.exceptId = userId
      const validation = await PresetValidator.validateData(body, 'updateState')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingState = await State.findOne({
        _id: { $ne: userId },
        $or: [{ name: body.name }, { code: body.code }]
      }).lean()

      existingState?.name === body.name
        ? (() => {
            throw new NotFoundError('STATE NAME ALREADY EXISTS')
          })()
        : existingState?.code === body.code
        ? (() => {
            throw new NotFoundError('STATE CODE ALREADY EXISTS')
          })()
        : null

      const state = await State.findById(userId).exec()

      state.name = body.name || state.name
      state.code = body.code || state.code
      state.country_id = body.country_id || state.country_id

      const updatedState = await state.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_STATE'
      )({ message: 'UPDATED|STATE', state: updatedState })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteState = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.stateId
      body._id = userId

      const account = await PresetService.getState(body)
      if (!account?.status) {
        throw new NotFoundError('NOT_FOUND|STATE')
      }
      const state = await State.findById(userId).remove().exec()

      return requestHandler.sendSuccess(req, res, 'DELETE_STATE')({ message: 'DELETED|STATE', state: state })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getCityExists = async (req, res) => {
    try {
      const query = req.query

      const validation = await PresetValidator.validateData(query, 'getCityExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getCity(req.query)
      if (account?.status) throw new NotFoundError('EXIST|CITY')

      return requestHandler.sendSuccess(req, res, 'GET_CITY_EXISTS')({ message: 'NOT_EXIST|CITY' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async getAllCity(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(City, queryData)
      queryObject = queryBuilder.queryObject

      if (paramData.cityId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.cityId)
      }
      const getDataCount = await City.find(queryObject).count()
      const getData = await City.find(queryObject).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ALL_CITIES'
      )({ message: 'SUCCESS', cities: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async listAllCities(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const queryObj = {}
      if (queryData.name) {
        queryObj.name = { $regex: queryData.name, $options: 'i' }
      }
      if (paramData.countryId) {
        queryObj.country_id = mongoose.Types.ObjectId(paramData.countryId)
      }
      if (paramData.stateId) {
        queryObj.state_id = mongoose.Types.ObjectId(paramData.stateId)
      }
      const getDataCount = await City.find(queryObj).count()
      const getData = await City.find(queryObj).exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ALL_CITIES'
      )({ message: 'LISTED|CITIES', cities: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createCity = async (req, res) => {
    try {
      const body = req.body

      const validation = await PresetValidator.validateData(body, 'createCity')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingCity = await City.findOne({
        $or: [{ name: body.name }, { code: body.code }]
      }).lean()

      existingCity?.name === body.name
        ? (() => {
            throw new NotFoundError('CITY NAME ALREADY EXISTS')
          })()
        : existingCity?.code === body.code
        ? (() => {
            throw new NotFoundError('CITY CODE ALREADY EXISTS')
          })()
        : null

      const newCity = new City({
        name: body.name,
        code: body.code,
        country_id: body.country_id,
        state_id: body.state_id,
        latitude: body.latitude,
        longitude: body.longitude
      })

      const city = await newCity.save()
      return requestHandler.sendSuccess(req, res, 'CREATE_CITY')({ message: 'CREATED|CITY', city: city })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateCity = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.cityId
      body.exceptId = userId

      const validation = await PresetValidator.validateData(body, 'updateCity')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingCity = await City.findOne({
        _id: { $ne: userId },
        $or: [{ name: body.name }, { code: body.code }]
      }).lean()

      existingCity?.name === body.name
        ? (() => {
            throw new NotFoundError('CITY NAME ALREADY EXISTS')
          })()
        : existingCity?.code === body.code
        ? (() => {
            throw new NotFoundError('CITY CODE ALREADY EXISTS')
          })()
        : null

      const city = await City.findById(userId).exec()

      city.name = body.name || city.name
      city.code = body.code || city.code
      city.country_id = body.country_id || city.country_id
      city.state_id = body.state_id || city.state_id
      city.latitude = body.latitude || city.latitude
      city.longitude = body.longitude || city.longitude

      const updatedCity = await city.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_CITY'
      )({ message: 'UPDATED|CITY', city: updatedCity })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteCity = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.cityId
      body._id = userId

      const account = await PresetService.getCity(body)
      if (!account?.status) {
        throw new NotFoundError('NOT_EXISTS')
      }
      const city = await City.findById(userId).remove().exec()

      return requestHandler.sendSuccess(req, res, 'DELETE_CITY')({ message: 'DELETED|CITY', city: city })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getModelExists = async (req, res) => {
    try {
      const query = req.query

      const validation = await PresetValidator.validateData(query, 'getModelExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getModel(req.query)
      if (!account?.status) throw new NotFoundError('EXIST|MODEL')

      return requestHandler.sendSuccess(req, res, 'GET_MODEL_EXISTS')({ message: 'NOT_FOUND|MODEL' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async getAllModel(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(Model, queryData)
      queryObject = queryBuilder.queryObject

      if (paramData.modelId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.modelId)
      }
      const getDataCount = await Model.find(queryObject).count()
      const getData = await Model.find(queryObject).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ALL_MODELS'
      )({ message: 'SUCCESS', models: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async listAllModels(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const queryObj = {}
      if (queryData.name) {
        queryObj.name = { $regex: queryData.name, $options: 'i' }
      }
      if (paramData.makeId) {
        queryObj.make_id = mongoose.Types.ObjectId(paramData.makeId)
      }
      const listModels = await Model.find(queryObj).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ALL_MODELS'
      )({ message: 'LISTED|MODEL', models: listModels })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createModel = async (req, res) => {
    try {
      const body = req.body

      const validation = await PresetValidator.validateData(body, 'createModel')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getModel(body)
      if (account?.status) throw new NotFoundError('EXISTS')

      const newModel = new Model({
        name: body.name,
        year: body.year,
        make_id: body.make_id
      })

      const model = await newModel.save()
      return requestHandler.sendSuccess(req, res, 'CREATE_MODEL')({ message: 'CREATED|MODEL', model: model })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateModel = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.modelId
      body.exceptId = userId

      const validation = await PresetValidator.validateData(body, 'updateModel')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getModel(body)
      if (account?.status) {
        // if(account.data.customer._id != mongoose.Types.ObjectId(userId))
        throw new NotFoundError('EXISTS')
      }

      const model = await Model.findById(userId).exec()

      model.name = body.name || model.name
      model.year = body.year || model.year
      model.make_id = body.make_id || model.make_id

      const updatedModel = await model.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_MODEL'
      )({ message: 'UPDATED|MODEL', model: updatedModel })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteModel = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.modelId
      body._id = userId

      const account = await PresetService.getModel(body)
      if (!account?.status) {
        throw new NotFoundError('NOT_EXISTS')
      }
      const model = await Model.findById(userId).remove().exec()

      return requestHandler.sendSuccess(req, res, 'DELETE_MODEL')({ message: 'DELETED|MODEL', model: model })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getMakeExists = async (req, res) => {
    try {
      const query = req.query

      const validation = await PresetValidator.validateData(query, 'getMakeExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getMake(req.query)
      if (account?.status) throw new NotFoundError('EXIST|MAKE')

      return requestHandler.sendSuccess(req, res, 'GET_MAKE_EXISTS')({ message: 'NOT_FOUND|MAKE' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async getAllMake(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(Make, queryData)
      queryObject = queryBuilder.queryObject

      if (paramData.makeId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.makeId)
      }
      const getDataCount = await Make.find(queryObject).count()
      const getData = await Make.find(queryObject).skip(skip).limit(perPage)
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ALL_MAKE'
      )({ message: 'SUCCESS', makes: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async listAllMakes(req, res) {
    try {
      const queryData = req.query

      const queryObj = {}
      if (queryData.name) {
        queryObj.name = { $regex: queryData.name, $options: 'i' }
      }
      const listMakes = await Make.find(queryObj).lean().exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ALL_MAKE'
      )({ message: 'LISTED|MAKE', makes: listMakes })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createMake = async (req, res) => {
    try {
      const body = req.body

      const validation = await PresetValidator.validateData(body, 'createMake')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getMake(body)
      if (account?.status) throw new NotFoundError('EXIST|MAKE')

      const newMake = new Make({
        name: body.name
      })

      const make = await newMake.save()
      return requestHandler.sendSuccess(req, res, 'CREATE_MAKE')({ message: 'CREATED|MAKE', make: make })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateMake = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.makeId
      body.exceptId = userId

      const validation = await PresetValidator.validateData(body, 'updateMake')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getMake(body)
      if (account?.status) {
        // if(account.data.customer._id != mongoose.Types.ObjectId(userId))
        throw new NotFoundError('EXIST|MAKE')
      }

      const make = await Make.findById(userId).exec()

      make.name = body.name || make.name

      const updatedMake = await make.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_MAKE'
      )({ message: 'UPDATED|MAKE', make: updatedMake })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteMake = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.makeId
      body._id = userId

      const account = await PresetService.getMake(body)
      if (!account?.status) {
        throw new NotFoundError('NOT_FOUND|MAKE')
      }
      const make = await Make.findById(userId).remove().exec()

      return requestHandler.sendSuccess(req, res, 'DELETE_MAKE')({ message: 'DELETED|MAKE', make: make })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async getCurrency(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(Currency, queryData)
      queryObject = queryBuilder.queryObject
      queryObject['deletedAt'] = null

      if (paramData.currencyId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.currencyId)
      }
      const getDataCount = await Currency.find(queryObject).count()
      const getData = await Currency.find(queryObject).skip(skip).limit(perPage).populate('country', 'name')
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_CURRENCY'
      )({ message: 'GET_CURRENCY', currency: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async listCurrency(req, res) {
    try {
      const queryData = req.query

      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(Currency, queryData)
      queryObject = queryBuilder.queryObject
      queryObject['deletedAt'] = null

      const listCurrency = await Currency.find(queryObject).lean().exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_CURRENCY'
      )({ message: 'LISTED|CURRENCY', currency: listCurrency })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createCurrency = async (req, res) => {
    try {
      const body = req.body

      const validation = await PresetValidator.validateData(body, 'createCurrency')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const exists = await PresetService.getCurrency(body)
      if (exists?.status) throw new NotFoundError('EXISTS|CURRENCY')

      const newCurrency = new Currency({
        country: body.country,
        name: body.name,
        code: body.code,
        symbol: body.symbol
      })

      const currency = await newCurrency.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CURRENCY'
      )({ message: 'CREATED|CURRENCY', currency: currency })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateCurrency = async (req, res) => {
    try {
      const body = req.body
      const currencyId = req.params.currencyId
      body.exceptId = currencyId

      const validation = await PresetValidator.validateData(body, 'updateCurrency')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const exists = await PresetService.getCurrency(body)
      if (exists?.status) {
        throw new NotFoundError('EXIST|CURRENCY')
      }

      const currency = await Currency.findById(currencyId).exec()
      if (!body.status && currency.isDefault) throw new Error('CANT_DEACTIVE_IS_DEFAULT_CURRENCY')
      if (body.status == currency.status) throw new Error('STATUS_ALREADY_UPDATED')

      currency.country = body.country || currency.country
      currency.name = body.name || currency.name
      currency.code = body.code || currency.code
      currency.symbol = body.symbol || currency.symbol
      currency.status = body.status || currency.status

      const updatedCurrency = await currency.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_CURRENCY'
      )({ message: 'UPDATED|CURRENCY', currency: updatedCurrency })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteCurrency = async (req, res) => {
    try {
      const body = req.body
      const currencyId = req.params.currencyId
      body._id = currencyId

      const exists = await PresetService.getCurrency(body)
      if (!exists?.status) {
        throw new NotFoundError('NOT_FOUND|CURRENCY')
      }
      const currency = await Currency.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(currencyId), deletedAt: null },
        { deletedAt: new Date() },
        { new: true }
      ).exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_CURRENCY'
      )({ message: 'DELETED|CURRENCY', currency: currency })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static importCountries = async (req, res) => {
    try {
      const workbooks = XLSX.read(req.file.buffer, { type: 'buffer' })
      const sheetName = workbooks.SheetNames[0]
      const sheet = workbooks.Sheets[sheetName]

      const jsonData = XLSX.utils.sheet_to_json(sheet)
      for (const element of jsonData) {
        const existData = await Country.findOne({
          code: element.numeric_code,
          name: element.country_name
        })
        if (!existData) {
          await Country.create({
            name: element.name,
            code: element.numeric_code,
            phonecode: element.phone_code
          })
        }
      }
      return requestHandler.sendSuccess(req, res, 'IMPORT_DATA', 200)({ message: 'DATA_IMPORTED' })
    } catch (err) {
      return requestHandler.sendError(req, res, err)
    }
  }
  static importStates = async (req, res) => {
    try {
      const workbooks = XLSX.read(req.file.buffer, { type: 'buffer' })
      const sheetName = workbooks.SheetNames[0]
      const sheet = workbooks.Sheets[sheetName]

      const jsonData = XLSX.utils.sheet_to_json(sheet)
      let countryData = null
      for (const element of jsonData) {
        if (countryData == null || countryData.name != element.country_name) {
          countryData = await Country.findOne({
            status: true,
            name: element.country_name
          })
        }
        const existData = await State.findOne({
          name: element.name,
          code: element.state_code
        })

        if (!existData) {
          await State.create({
            name: element.name,
            code: element.state_code,
            country_id: countryData._id
          })
        }
      }
      return requestHandler.sendSuccess(req, res, 'IMPORT_DATA', 200)({ message: 'DATA_IMPORTED' })
    } catch (err) {
      return requestHandler.sendError(req, res, err)
    }
  }
  static importCities = async (req, res) => {
    try {
      const workbooks = XLSX.read(req.file.buffer, { type: 'buffer' })
      const sheetName = workbooks.SheetNames[0]
      const sheet = workbooks.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet)
      const totalRecords = jsonData.length
      const chunkSize = 10000
      let chunkStart = 0
      // const notFound = [];
      // Process the data in chunks
      while (chunkStart < totalRecords) {
        const chunkEnd = Math.min(chunkStart + chunkSize, totalRecords)
        const chunk = jsonData.slice(chunkStart, chunkEnd)
        await this.processCitiesChunk(chunk)
        // if (citiesNotFound.length > 0) notFound.push(citiesNotFound)
        chunkStart += chunkSize
      }
      return requestHandler.sendSuccess(req, res, 'IMPORT_DATA', 200)({ message: 'DATA_IMPORTED' })
    } catch (error) {
      return requestHandler.sendError(req, res, err)
    }
  }

  static processCitiesChunk = async (citiesData) => {
    let stateData = null
    const notFound = []
    for (const cities of citiesData) {
      if (stateData == null || stateData.name != cities.state_name) {
        const stateDataArr = await State.aggregate([
          {
            $match: { name: cities.state_name }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country'
            }
          },
          {
            $unwind: '$country'
          },
          {
            $match: { 'country.name': cities.country_name }
          },
          {
            $project: {
              name: 1,
              country: 1
            }
          }
        ])
        stateData = stateDataArr.length > 0 ? stateDataArr[0] : null
        console.log('NEW_STATE', JSON.stringify(stateData))
      }
      if (stateData) {
        const existData = await City.findOne({
          name: cities.name,
          code: cities.name.slice(0, 2),
          country_id: stateData.country?._id,
          state_id: stateData?._id
        })
        if (!existData) {
          await City.create({
            name: cities.name,
            code: cities.name.slice(0, 2).toUpperCase() || 'UN',
            country_id: stateData.country?._id,
            state_id: stateData?._id,
            latitude: cities.latitude,
            longitude: cities.longitude
          })
        }
      } else {
        notFound.push(cities)
      }
    }
    return notFound
  }

  static async getAllYear(req, res) {
    try {
      const queryData = req.query
      const paramData = req.params

      const perPage = parseInt(queryData.limit) || 10
      const page = parseInt(queryData.page) || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(Year, queryData)
      queryObject = queryBuilder.queryObject

      if (paramData.yearId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.yearId)
      }

      if (queryData.dataName) {
        const isNumeric = !isNaN(queryData.dataName)
        const parsedDataName = isNumeric ? Number(queryData.dataName) : queryData.dataName
        console.log('parsedDataName', parsedDataName)
      }

      // Add dataName filter conditionally to $match
      const addDataNameToMatch = queryData.dataName ? { 'datas.name': Number(queryData.dataName) } : {}

      const finalMatch = { ...queryObject, ...addDataNameToMatch }

      const pipeline = [
        { $match: finalMatch },
        {
          $project: {
            _id: 1,
            datas: {
              $slice: [
                {
                  $filter: {
                    input: '$datas',
                    as: 'dataItem',
                    cond: queryData.dataName ? { $eq: ['$$dataItem.name', Number(queryData.dataName)] } : {} // if no filter, just return all
                  }
                },
                skip,
                perPage
              ]
            }
          }
        }
      ]

      const getData = await Year.aggregate(pipeline)

      // Count total matching datas
      const totalPipeline = [
        { $match: finalMatch },
        {
          $project: {
            datas: queryData.dataName
              ? {
                  $filter: {
                    input: '$datas',
                    as: 'dataItem',
                    cond: {
                      $eq: ['$$dataItem.name', Number(queryData.dataName)]
                    }
                  }
                }
              : 1
          }
        },
        { $unwind: '$datas' },
        { $count: 'total' }
      ]

      const totalResult = await Year.aggregate(totalPipeline)
      const totalCount = totalResult.length > 0 ? totalResult[0].total : 0
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ALL_YEAR'
      )({
        message: 'SUCCESS',
        _id: getData.length > 0 ? getData[0]._id : null,
        years: getData.length > 0 ? getData[0].datas : [],
        total: totalCount
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async listAllYears(req, res) {
    try {
      const queryData = req.query

      const queryObj = {}
      if (queryData.name) {
        queryObj.datas.name = { $regex: queryData.name, $options: 'i' }
      }
      const listYears = await Year.find(queryObj).lean().exec()
      console.log('listYears', listYears)
      const yearsList = listYears.length ? listYears[0].datas : []
      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ALL_YEAR'
      )({ message: 'LISTED|YEAR', years: yearsList, total: yearsList.length })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createYear = async (req, res) => {
    try {
      const body = req.body
      console.log('createYear', body)
      const validation = await PresetValidator.validateData(body, 'createYear')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getYear(body)
      console.log(account)
      if (account?.status) throw new NotFoundError('EXIST|YEAR')
      const yearInfo = { name: body.name }
      const year = await Year.findOneAndUpdate({ _id: body._id }, { $push: { datas: yearInfo } })
      // const newYear = new Year({
      //   name: body.name
      // })
      // const year = await newYear.save()
      return requestHandler.sendSuccess(req, res, 'CREATE_YEAR')({ message: 'CREATED|YEAR', year: year })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addYear = async (req, res) => {
    try {
      const body = req.body

      const validation = await PresetValidator.validateData(body, 'createYear')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getYear(body)
      console.log(account)
      if (account?.status) throw new NotFoundError('EXIST|YEAR')
      // const yearInfo = { name: body.name }
      // const year = await Year.findOneAndUpdate({ _id: body._id }, { $push: { datas: yearInfo } })
      const newYear = new Year({
        name: body.name
      })
      const year = await newYear.save()
      return requestHandler.sendSuccess(req, res, 'CREATE_YEAR')({ message: 'CREATED|YEAR', year: year })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateYear = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.yearId
      body.exceptId = userId

      const validation = await PresetValidator.validateData(body, 'updateYear')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await PresetService.getYear(body)
      if (account?.status) {
        throw new NotFoundError('EXIST|YEAR')
      }

      const updatedYear = await Year.findOneAndUpdate({ 'datas._id': userId }, { 'datas.$.name': body.name })

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_YEAR'
      )({ message: 'UPDATED|YEAR', make: updatedYear })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteYear = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.yearId
      const id = req.params.id

      const account = await PresetService.getYear(body)
      if (!account?.status) {
        throw new NotFoundError('NOT_FOUND|YEAR')
      }
      const year = await Year.findById(id).exec()
      year.datas.pull(userId)
      year.save()

      return requestHandler.sendSuccess(req, res, 'DELETE_YEAR')({ message: 'DELETED|YEAR', year: year })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}
export { PresetController }
