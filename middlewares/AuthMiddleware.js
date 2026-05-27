/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { Config } from '../config/AppConfig.js'
import Jwt from 'jsonwebtoken'

import { RequestHandler } from './../utils/RequestHandler.js'
import { Logger } from './../utils/Logger.js'

import Partner from '../models/Auth/Partner.js'
import Customer from '../models/Auth/Customer.js'

import { Enum } from '../utils/Enum.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class AuthMiddleware {
  /**
   * Adds two numbers together.
   * @param {object} generateObject The first number.
   * @returns {object} Auth Data.
   */
  static generateAuth = async (generateObject) => {
    let authObject = {
      status: false,
      data: {},
      message: ''
    }

    try {
      const { authToken = '' } = generateObject

      const cipherKey = Config.auth.cipherKey

      if (cipherKey != '') {
        const authInfo = await new Promise((resolve, reject) => {
          Jwt.verify(authToken, cipherKey, function (err, decoded) {
            if (err) reject(err.message || 'Failed to authenticate.')
            else resolve(decoded)
          })
        })
        authObject = {
          status: true,
          data: {
            userId: mongoose.Types.ObjectId(authInfo.userId),
            email: authInfo.email,
            name: authInfo.name,
            role: authInfo.role,
            deviceId: authInfo.deviceId
          },
          message: 'Auth Verified'
        }
      }
    } catch (error) {
      authObject = {
        status: false,
        data: {},
        message: error.message || 'Authendication Error'
      }
    }
    return authObject
  }

  /**
   * Adds two numbers together.
   */

  static addAuth =
    (roles = []) =>
    async (req, res, next) => {
      try {
        const Authorization = req.headers['authorization'] || null
        let authData = null
        if (Authorization) {
          const generateObject = {
            authToken: Authorization
          }
          const generateAuthFunc = await this.generateAuth(generateObject)
          if (!generateAuthFunc.status) throw new Error('Authentication token is invalid.')

          authData = generateAuthFunc.data

          if (!roles.includes(authData.role))
            throw new Error('Authentication role not permit for this action.')
        }
        req.auth = authData
        // if (authData.deviceId != req.headers['X-Client-Id']) {
        //   const errorObj = {
        //     status: 401,
        //     message: error.message || 'UnAuthorised You have login another device'
        //   }
        //   return requestHandler.sendError(req, res, errorObj)
        // }
        next()
      } catch (error) {
        return requestHandler.sendError(req, res, error)
      }
    }

  /**
   * Adds two numbers together.
   */
  static authorize =
    (roles = []) =>
    async (req, res, next) => {
      try {
        const Authorization = req.headers['authorization'] || null
        if (!Authorization) throw new Error('Authentication is required.')

        const generateObject = {
          authToken: Authorization
        }
        const generateAuthFunc = await this.generateAuth(generateObject)
        if (!generateAuthFunc.status) throw new Error('Authentication token is invalid.')

        const authData = generateAuthFunc.data
        if (!roles.includes(authData.role)) throw new Error('Authentication role not permit for this action.')
        const deviceId = req.headers['x-client-id'] || undefined
        if (!deviceId && [Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER].includes(authData.role)) {
          throw new Error('ClientId is required.')
        } else if (authData.role == Enum.ROLES.PARTNER) {
          const partner = await Partner.findOne({ _id: authData.userId, deviceId: deviceId }).lean().exec()
          // const partner = await Partner.findOne({ _id: authData.userId }).lean().exec()
          if (!partner) throw new Error('UnAuthorised You have login another device')
        } else if (authData.role == Enum.ROLES.CUSTOMER) {
          const customer = await Customer.findOne({ _id: authData.userId, deviceId: deviceId }).lean().exec()
          if (!customer) throw new Error('UnAuthorised You have login another device')
        } else {
          // Skip for admins and companies
        }

        req.auth = authData
        next()
      } catch (error) {
        const errorObj = {
          status: 401,
          message: error.message || 'Authentication Failed'
        }
        return requestHandler.sendError(req, res, errorObj)
      }
    }
}

export { AuthMiddleware }
