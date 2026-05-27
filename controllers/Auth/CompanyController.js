/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

import { BaseController } from '../BaseController.js'

import { AuthValidator } from '../../validators/Common/AuthValidator.js'
import { AuthServices } from '../../services/Common/AuthService.js'

import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'

import Company from '../../models/Auth/Company.js'

import { AuthendicationError, ValidationError } from '../../utils/ErrorHandler.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'
import { Enum } from '../../utils/Enum.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class CompanyController extends BaseController {
  constructor() {
    super()
  }

  static getCompany = async (req, res) => {
    try {
      const validation = await AuthValidator.validateData(req.query, 'getCompany')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryData = req.query
      const paramData = req.params

      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(Company, queryData)
      queryObject = queryBuilder.queryObject

      if (paramData.companyId) {
        queryObject._id = mongoose.Types.ObjectId(paramData.companyId)
      }

      const getDataCount = await Company.find(queryObject).count()
      const getData = await Company.find(queryObject).skip(skip).limit(perPage)

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_COMPANY'
      )({ message: 'SUCCESS', company: getData, total: getDataCount })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static createCompany = async (req, res) => {
    try {
      const body = req.body

      const validation = await AuthValidator.validateData(body, 'createCompany')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getCompany(body)
      if (account?.status) throw new AuthendicationError('EXIST|COMPANY')

      const newDoc = new Company({
        fname: body.fname,
        lname: body.lname,
        email: body.email,
        phone: body.phone,
        phoneCode: body.phoneCode,
        scIds: body.scIds && body.scIds != '' ? body.scIds.split(',') : [],
        fcmId: body.fcmId,
        commission: body.commission || 0
      })

      if (req.file) newDoc.profile = req.file.path

      newDoc.setPassword(body.password)

      const company = await newDoc.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_COMPANY'
      )({ message: 'CREATED|COMPANY', company: company })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateCompany = async (req, res) => {
    try {
      const body = req.body
      const companyId = req.params.companyId || req.body.companyId
      body.exceptId = companyId

      const validation = await AuthValidator.validateData(body, 'updateCompany')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getCompany(body)
      if (account?.status) {
        throw new AuthendicationError('EXIST|COMPANY')
      }

      const company = await Company.findById(companyId).exec()

      company.fname = body.fname || company.fname
      company.lname = body.lname || company.lname
      company.email = body.email || company.email
      company.phone = body.phone || company.phone
      company.phoneCode = body.phoneCode || company.phoneCode
      company.fcmId = body.fcmId || company.fcmId
      company.scIds = body.scIds && body.scIds != '' ? body.scIds.split(',') : company.scIds
      company.commission = body.commission || company.commission

      if (req.file) company.profile = req.file.path

      if (body.password) company.setPassword(body.password)

      const updatedCompany = await company.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_COMPANY'
      )({ message: 'UPDATED|COMPANY', company: updatedCompany })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteCompany = async (req, res) => {
    try {
      const body = req.body
      const companyId = req.params.companyId || req.body.companyId
      body._id = companyId

      const account = await AuthServices.getCompany(body)
      if (!account?.status) {
        throw new AuthendicationError('NOT_EXIST|COMPANY')
      }
      const customer = await Company.findById(companyId).remove().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_COMPANY'
      )({ message: 'DELETED|COMPANY', customer: customer })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static changePassword = async (req, res) => {
    try {
      const body = req.body
      const id = body._id

      const validation = await AuthValidator.validateData(body, 'changepassword')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await Company.findOne({ _id: id }).exec()
      if (!account) throw new AuthendicationError('NOT_FOUND|COMPANY')
      account.setPassword(body.password)
      const company = await account.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'CHANGE_PASSWORD'
      )({ message: 'PASSWORD_CHANGED|COMPANY', company: company })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getCompanyExists = async (req, res) => {
    try {
      const query = req.query

      const validation = await AuthValidator.validateData(query, 'getCompanyExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getCompany(req.query)
      if (account?.status) throw new AuthendicationError('EXIST|COMPANY')

      return requestHandler.sendSuccess(req, res, 'GET_COMPANY_EXISTS')({ message: 'NOT_EXIST|COMPNAY' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static companyLogin = async (req, res) => {
    try {
      const body = req.body
      const validation = await AuthValidator.validateData(body, 'companyLogin')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)
      const query = {}

      if (body.email) {
        query['email'] = body.email
      } else {
        query['phone'] = body.phone
        query['phoneCode'] = body.phoneCode
      }

      const company = await Company.findOne(query).populate('group').exec()
      if (!company) throw new AuthendicationError('NOT_FOUND|COMPANY')
      const passwordIsValid = await company.validPassword(body.password, company.salt, company.hash)
      if (!passwordIsValid) throw new ValidationError('MAKE_SURE_YOUR_PASSWORD!')

      const tokenData = {
        userId: company._id,
        email: company.email,
        name: company.fname,
        role: Enum.ROLES.COMPANY
      }
      const loginToken = await company.generateJwt(tokenData)
      return requestHandler.sendSuccess(
        req,
        res,
        'LOGIN_COMPANY'
      )({ message: 'LOGIN_SUCCESS', company: company, token: loginToken })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { CompanyController }
