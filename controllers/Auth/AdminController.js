/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

import { BaseController } from '../BaseController.js'
import Admin from '../../models/Auth/Admin.js'
import AdminGroup from '../../models/Auth/AdminGroup.js'

import { AuthValidator } from '../../validators/Common/AuthValidator.js'
import { AuthServices } from '../../services/Common/AuthService.js'

import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { permissions } from '../../config/Permissions.js'
import { Enum } from '../../utils/Enum.js'

import { AuthendicationError, ValidationError } from '../../utils/ErrorHandler.js'
import { QueryBuilder } from '../../helpers/QueryBuilder.js'
const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class AdminController extends BaseController {
  constructor() {
    super()
  }

  static loginAdmin = async (req, res) => {
    try {
      const body = req.body
      const validation = await AuthValidator.validateData(body, 'loginAdmin')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      // const DeviceId = req.headers['x-client-id'] || undefined
      // if (!DeviceId) throw new Error('DeviceId is required.')

      const query = {}

      if (body.email) {
        query['email'] = body.email
      } else {
        query['phone'] = body.phone
        query['phoneCode'] = body.phoneCode
      }

      // const update = {
      //   deviceId: DeviceId,
      // }

      const admin = await Admin.findOne(query).populate('group').exec()
      if (!admin) throw new AuthendicationError('NOT_FOUND|ADMIN')

      admin.fcmId = req.body.fcmId || admin.fcmId
      await admin.save()

      // const admin = await Admin.findOneAndUpdate(query, update, { new: true }).exec()

      const passwordIsValid = await admin.validPassword(body.password, admin.salt, admin.hash)
      if (!passwordIsValid) throw new ValidationError('MAKE_SURE_YOUR_PASSWORD!')

      const tokenData = {
        userId: admin._id,
        email: admin.email,
        name: admin.fname,
        group: admin.group,
        role: Enum.ROLES.ADMIN
      }
      const loginToken = await admin.generateJwt(tokenData)
      return requestHandler.sendSuccess(
        req,
        res,
        'LOGIN_ADMIN'
      )({ message: 'LOGIN_SUCCESS', admin: admin, token: loginToken })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getAdmin = async (req, res) => {
    try {
      const validation = await AuthValidator.validateData(req.query, 'getAdmin')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryData = req.query
      const paramData = req.params
      const perPage = parseInt(queryData.limit) || 10
      const page = parseInt(queryData.page) || 1
      const skip = (page - 1) * perPage

      const queryBuilder = await QueryBuilder.getSearchable(Admin, queryData)
      const queryObject = queryBuilder.queryObject

      if (paramData.adminId) {
        queryObject['_id'] = mongoose.Types.ObjectId(paramData.adminId)
      }

      if (queryData['group.group']) {
        const groupData = await AdminGroup.findOne({ group: queryData['group.group'] }, '_id')
        if (groupData) queryObject.group = groupData._id
        else queryObject.group = null // no matching group
      }

      const totalDataCount = await Admin.countDocuments(queryObject)

      const admins = await Admin.find(queryObject).skip(skip).limit(perPage).populate('group', 'group')

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ADMIN'
      )({
        message: 'GET_ADMIN_SUCCESS',
        admin: admins,
        total: totalDataCount
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
  static createAdmin = async (req, res) => {
    try {
      const body = req.body

      const validation = await AuthValidator.validateData(body, 'getAdmin')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingAdmin = await Admin.findOne({
        $or: [{ email: body.email }, { phone: body.phone, phoneCode: body.phoneCode }]
      }).lean()

      if (existingAdmin) {
        existingAdmin.email === body.email
          ? (() => {
              throw new AuthendicationError('EMAIL ALREADY EXISTS')
            })()
          : existingAdmin.phone === body.phone && existingAdmin.phoneCode === body.phoneCode
          ? (() => {
              throw new AuthendicationError('PHONE NUMBER ALREADY EXISTS')
            })()
          : null
      }

      const newDoc = new Admin({
        fname: body.fname,
        lname: body.lname,
        email: body.email,
        phone: body.phone,
        phoneCode: body.phoneCode,
        group: body.group,
        scIds: body.scIds && body.scIds != '' ? body.scIds.split(',') : [],
        fcmId: body.fcmId
      })

      if (req.file) newDoc.profile = req.file.path

      newDoc.setPassword(body.password)

      const admin = await newDoc.save()
      return requestHandler.sendSuccess(req, res, 'CREATE_ADMIN')({ message: 'CREATED|ADMIN', admin })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateAdmin = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.adminId || req.body.userId
      body.exceptId = userId

      const validation = await AuthValidator.validateData(body, 'updateAdmin')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const existingAdmin = await Admin.findOne({
        $or: [{ email: body.email }, { phone: body.phone, phoneCode: body.phoneCode }],
        _id: { $ne: userId }
      }).lean()

      if (existingAdmin) {
        existingAdmin.email === body.email
          ? (() => {
              throw new AuthendicationError('EMAIL ALREADY EXISTS')
            })()
          : existingAdmin.phone === body.phone && existingAdmin.phoneCode === body.phoneCode
          ? (() => {
              throw new AuthendicationError('PHONE NUMBER ALREADY EXISTS')
            })()
          : null
      }

      const admin = await Admin.findById(userId).exec()

      admin.fname = body.fname || admin.fname
      admin.lname = body.lname || admin.lname
      admin.email = body.email || admin.email
      admin.phone = body.phone || admin.phone
      admin.phoneCode = body.phoneCode || admin.phoneCode
      admin.group = body.group || admin.group
      admin.scIds = body.scIds && body.scIds != '' ? body.scIds.split(',') : admin.scIds
      admin.fcmId = body.fcmId || admin.fcmId
      if (req.file) admin.profile = req.file.path

      if (body.password) admin.setPassword(body.password)

      const updatedAdmin = await admin.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_ADMIN'
      )({ message: 'UPDATED|ADMIN', admin: updatedAdmin })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteAdmin = async (req, res) => {
    try {
      const body = req.body
      const userId = req.params.adminId || req.body.userId
      body._id = userId

      const account = await AuthServices.getAdmin(body)
      if (!account?.status) {
        throw new AuthendicationError('NOT_EXIST|ADMIN')
      }
      const customer = await Admin.findById(userId).remove().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_ADMIN'
      )({ message: 'DELETED|ADMIN', customer: customer })
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

      const account = await Admin.findOne({ _id: id }).exec()
      if (!account) throw new AuthendicationError('NOT_FOUND|ADMIN')
      account.setPassword(body.password)
      const admin = await account.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'CHANGE_PASSWORD'
      )({ message: 'PASSWORD_CHANGED|ADMIN', admin: admin })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getAdminExists = async (req, res) => {
    try {
      const query = req.query

      const validation = await AuthValidator.validateData(query, 'getAdminExists')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getAdmin(req.query)
      if (account?.status) throw new AuthendicationError('EXIST|ADMIN')

      return requestHandler.sendSuccess(req, res, 'GET_ADMIN_EXISTS')({ message: 'NOT_EXIST|ADMIN' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getMenuList = async (req, res) => {
    try {
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_MENU_LIST'
      )({ message: 'LISTED|MENU', menuList: JSON.parse(JSON.stringify(permissions.menusList)) })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static listAdminGroup = async (req, res) => {
    try {
      const validation = await AuthValidator.validateData(req.query, 'getAdmin')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryData = req.query
      const queryBuilder = await QueryBuilder.getSearchable(Admin, queryData)
      const queryObject = queryBuilder.queryObject
      const listData = await AdminGroup.find(queryObject, { _id: 1, group: 1 }).lean().exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'LIST_ADMIN_GROUP'
      )({ message: 'LIST_ADMIN_GROUP_SUCCESS', adminGroup: listData })
    } catch (error) {
      console.log('LIST_ADMIN_GROUP_ERROR', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getAdminGroup = async (req, res) => {
    try {
      const validation = await AuthValidator.validateData(req.query, 'getAdmin')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const queryData = req.query
      const paramData = req.params
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      const queryBuilder = await QueryBuilder.getSearchable(Admin, queryData)
      const queryObject = queryBuilder.queryObject
      if (queryData.group) {
        const normalizedGroup = queryData.group.replace(/\s+/g, '').toLowerCase()
        queryObject.$expr = {
          $regexMatch: {
            input: { $replaceAll: { input: { $toLower: '$group' }, find: ' ', replacement: '' } },
            regex: normalizedGroup
          }
        }
      }

      if (queryData.description) {
        queryObject.description = { $regex: queryData.description, $options: 'i' }
      }

      if (paramData.adminGroupId) {
        queryObject['_id'] = mongoose.Types.ObjectId(paramData.adminGroupId)
      }

      const getDataCount = await AdminGroup.find(queryObject).count()
      const getData = await AdminGroup.find(queryObject).skip(skip).limit(perPage)

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ADMIN_GROUP'
      )({ message: 'GET_ADMIN_GROUP_SUCCESS', adminGroup: getData, total: getDataCount })
    } catch (error) {
      console.log('GET_ADMIN_GROUP_ERROR', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static createAdminGroup = async (req, res) => {
    try {
      const body = req.body

      const validation = await AuthValidator.validateData(body, 'createAdminGroup')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const account = await AuthServices.getAdminGroup(body)
      if (account?.status) throw new ValidationError('EXIST|ADMIN_GROUP')

      const newDoc = new AdminGroup({
        group: body.group,
        description: body.description,
        permission: body.permission
      })

      const adminGroup = await newDoc.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_ADMIN_GROUP'
      )({ message: 'CREATED|ADMIN_GROUP', adminGroup })
    } catch (error) {
      console.log('CREATE_ADMIN_GROUP_ERROR', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateAdminGroup = async (req, res) => {
    try {
      const body = req.body

      const validation = await AuthValidator.validateData(body, 'createAdminGroup')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      // if (body.group == 'SUPERADMIN') throw new ValidationError('NO_ACCESS_TO_EDIT')

      const adminGroupId = req.params.adminGroupId
      body.exceptId = adminGroupId
      const account = await AuthServices.getAdminGroup(body)
      if (account?.status) throw new ValidationError('EXIST|ADMIN_GROUP')

      const adminGroup = await AdminGroup.findById(adminGroupId).exec()
      adminGroup.group = body.group || adminGroup.group
      adminGroup.description = body.description || adminGroup.description
      adminGroup.permission = body.permission || adminGroup.permission

      const updatedAdminGroup = await adminGroup.save()
      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_ADMIN_GROUP'
      )({ message: 'UPDATED|ADMIN_GROUP', adminGroup: updatedAdminGroup })
    } catch (error) {
      console.log('CREATE_ADMIN_GROUP_ERROR', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteAdminGroup = async (req, res) => {
    try {
      const body = req.body
      const adminGroupId = req.params.adminGroupId
      body._id = adminGroupId

      const account = await AuthServices.getAdminGroup(body)
      if (!account?.status) throw new AuthendicationError('NOT_EXIST|ADMIN')
      const adminGroupData = await AdminGroup.findById(adminGroupId).lean().exec()
      if (adminGroupData.group == 'SUPERADMIN') throw new ValidationError('NO_ACCESS_TO_EDIT')

      const adminGroup = await AdminGroup.findById(adminGroupId).remove().exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_ADMIN_GROUP'
      )({ message: 'DELETED|ADMIN_GROUP', adminGroup: adminGroup })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { AdminController }
