/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseService } from '../BaseService.js'
import path from 'path'
import mongoose from 'mongoose'
import * as fs from 'fs'
import ServiceType from '../../models/Creteria/ServiceType.js'
import ServiceArea from '../../models/Creteria/ServiceArea.js'
import Coupon from '../../models/Creteria/Coupon.js'

class CreteriaService extends BaseService {
  static getServicesType = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const findCondition = []
      if (query._id) findCondition.push({ _id: mongoose.Types.ObjectId(query._id) })

      if (query.name) findCondition.push({ name: query.name })

      const account = await ServiceType.findOne({ $or: findCondition }).exec()

      if (!account) throw new Error('NOT_FOUND|SERVICE_TYPE')

      response.status = true
      response.data = {
        Language: account
      }
      response.message = 'FOUND|SERVICE_TYPE'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }
  static getServiceArea = async (query) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const findCondition = []
      if (query._id) findCondition.push({ _id: mongoose.Types.ObjectId(query._id) })

      if (query.name) findCondition.push({ name: query.name })

      const account = await ServiceArea.findOne({ $or: findCondition }).exec()

      if (!account) throw new Error('NOT_FOUND|SERVICE_AREA')

      response.status = true
      response.data = {
        serviceArea: account
      }
      response.message = 'FOUND|SERVICE_AREA'
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static makeDirectory = async (pathUrl) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const movePath = {
        newPath: pathUrl
      }
      if (fs.existsSync(pathUrl)) {
        movePath['exist'] = true
      } else {
        fs.mkdirSync(pathUrl)
        movePath['exist'] = false
      }
      response = {
        status: true,
        data: movePath,
        message: 'UNPROCESSABLE_ENTITY'
      }
    } catch (error) {
      console.error('MAKE_DIRECTORY', error)
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    console.log(response)
    return response
  }

  static moveFile = async (src, dest) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }

    try {
      const projectRoot = path.resolve()
      const sourcePath = path.resolve(src)
      let targetPath = dest

      if (path.isAbsolute(dest)) {
        if (!dest.startsWith('/public/')) {
          throw new Error(`Unsafe destination path: ${dest}`)
        }
        targetPath = path.join(projectRoot, dest.slice(1))
      } else {
        targetPath = path.join(projectRoot, dest)
      }

      const targetDir = path.dirname(targetPath)

      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // Remove file if already exists
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath)
      }

      // Move file
      await fs.promises.rename(sourcePath, targetPath)

      response = {
        status: true,
        data: { from: sourcePath, to: targetPath },
        message: 'FILE_MOVED'
      }
    } catch (err) {
      console.error('MOVE_FILE Error:', err)
      response.message = err.message || response.message
    }

    return response
  }

  static removeFile = async (data) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      fs.unlinkSync(data)
      return true
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static removeDirectory = async (data) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      fs.rmdirSync(data)
      return true
    } catch (error) {
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static uploadDoc = async (documentData, pathUL, body, dbData) => {
    let response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      const removeOldFiles = []
      let findFile = {}

      const fieldArr = []
      for (const document of documentData.fields) {
        const fieldData = {
          name: document.indexName
        }
        let findField
        if (dbData) {
          findFile = dbData.find((e) => e.name == body.fieldName)
          if (findFile && findFile.status == 'rejected') {
            findFile.status = 'pending'
            findFile.reason = ''
          }
        }
        if (findFile?.fields) {
          findField = findFile.fields.find((e) => e.name == document.indexName)
        }
        if (document.type == 'image') {
          const imagePath = body.files.find((elem) => elem.fieldname == document.indexName)
          if (imagePath) {
            // Remove Existing File
            if (findField) {
              removeOldFiles.push(pathUL + '/' + findField.value)
            }
            const getPath = await CreteriaService.makeDirectory(pathUL)
            if (!getPath.status) throw new Error(getPath.message)
            const directory = getPath.data.newPath + '/' + path.basename(imagePath.path)
            await CreteriaService.moveFile(imagePath.path, directory)
            fieldData['value'] = path.basename(imagePath.path)
          } else {
            fieldData['value'] = findField?.value ?? ''
          }
        } else if (document.type == 'string') {
          fieldData['value'] = body[document.indexName] || findField.value
        } else if (document.type == 'date') {
          let dateData = body[document.indexName] || findField.value
          dateData = new Date(dateData)
          dateData.setHours(0, 0, 0, 0)
          fieldData['value'] = dateData.toISOString()
        }
        fieldArr.push(fieldData)
      }
      response['data']['removeOldFiles'] = removeOldFiles
      response['data']['fieldArr'] = fieldArr
      response['data']['findFile'] = findFile
      response['status'] = true
      response['message'] = 'success'
    } catch (error) {
      console.error('Upload Docs Error: ', error)
      response = {
        status: false,
        data: {},
        message: error.message || response.message
      }
    }
    return response
  }

  static isValidCoupon = async (inputData) => {
    const response = {
      status: false,
      message: 'Unprocessable',
      data: {}
    }
    try {
      const coupon = await Coupon.findOne({ code: inputData.coupon }).lean().exec()
      if (!coupon) throw new Error('COUPON_IS_NOT_VALID')

      const today = new Date()
      const startDate = Date.parse(coupon.start)
      const endDate = Date.parse(coupon.end)

      const startTimeArr = coupon.startTime.split(':') || [0, 0]
      const endTimeArr = coupon.endTime.split(':') || [23, 59]
      const startTime = new Date().setHours(startTimeArr[0], startTimeArr[1], 0, 0)
      const endTime = new Date().setHours(endTimeArr[0], endTimeArr[1], 0, 0)

      const claimsData = coupon.claims

      let filterClaimData = []
      if (inputData.userId) {
        filterClaimData = claimsData.filter((fData) => fData.userId == inputData.userId)
      }

      if (!coupon.status) throw new Error('COUPON_IS_NOT_ACTIVATED')
      else if (!(today <= endDate && today >= startDate))
        throw new Error('COUPON_IS_UNAVAILABLE') // Date Validation
      else if (!(today <= endTime && today >= startTime))
        throw new Error('COUPON_IS_UNAVAILABLE') // Time Validation
      else if (inputData.serviceCity && coupon.scIds?.includes(inputData.serviceCity))
        throw new Error('COUPON_IS_UNAVAILABLE_LOCATION')
      else if (claimsData && claimsData.length >= coupon.limit) throw new Error('COUPON_LIMIT_EXCEED')
      else if (filterClaimData.length >= coupon.userLimit) throw new Error('COUPON_IS_ALREADY_USED')
      else {
        response.status = true
        response.message = 'COUPON_IS_APPLICABLE'
        response.data = {
          coupon: inputData.coupon,
          offerLimit: coupon.offerLimit,
          fare: coupon.fare
        }
      }
    } catch (error) {
      console.error('Apply Coupon Error: ', error)
      response.status = false
      response.message = error.message
      response.data = {}
    }
    return response
  }

  static applyCoupon = async (inputData) => {
    const response = {
      status: false,
      message: 'Unprocessable'
    }
    try {
      const coupon = await Coupon.findOne({ code: inputData.coupon }).exec()
      if (!coupon) throw new Error('COUPON_IS_NOT_VALID')
      else {
        const claims = {
          referenceId: inputData.referenceId,
          module: inputData.module || 'TRIP',
          amount: inputData.amount,
          userId: inputData.userId,
          userRole: inputData.userRole
        }
        coupon.claims.push(claims)
        coupon.save()
        response.status = true
        response.message = 'COUPON_IS_APPLICABLE'
      }
    } catch (error) {
      console.error('Apply Coupon Error: ', error)
      response.status = false
      response.message = error.message
    }
    return response
  }
}

export { CreteriaService }
