/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Config } from './../config/AppConfig.js'
class BaseModel {
  setPassword(password = 'abservetech') {
    this.salt = crypto.randomBytes(16).toString('hex')
    this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex')
  }

  validPassword(password = 'abservetech', salt, hashval) {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
    return hashval === hash
  }

  getPassword(password = 'abservetech') {
    const obj = {}
    obj.salt = crypto.randomBytes(16).toString('hex')
    obj.hash = crypto.pbkdf2Sync(password, obj.salt, 1000, 64, 'sha512').toString('hex')
    return obj
  }

  generateJwt(generateObj) {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 7) // 7 days
    return jwt.sign(generateObj, Config.auth.cipherKey)
  }

  softDeleteMiddleware(next, value) {
    if (value?.includeDeleted) {
      next()
    } else {
      this.where({ deletedAt: { $eq: null } })
      next()
    }
  }
}

export { BaseModel }
