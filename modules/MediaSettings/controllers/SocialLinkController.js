/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Logger } from '../../../utils/Logger.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import SocialLinks from '../models/SocialLinkModel.js'
import { SocialLinkConfig } from '../SocialLinkConfig.js'
import { SettingsConfig } from '../../../config/SettingsConfig.js'
import path from 'path'
import fs from 'fs'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class SocialLinkController {
  static updateConfig = async (req, res) => {
    try {
      const configObj = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/MediaSettings/SocialLinkConfig.js`

      const fileContent = `/* ************************
 * Copyright 2025
 * ABSERVETECH
 ************************ */

const SocialLinkConfig = ${JSON.stringify(configObj, null, 2)}

export { SocialLinkConfig }
`

      await fs.writeFileSync(filePath, fileContent)
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({
        message: 'UPDATED',
        SocialLinkData: configObj
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getConfig = async (req, res) => {
    try {
      const config = SocialLinkConfig
      return requestHandler.sendSuccess(req, res, 'GET_CONFIG')({ message: 'SUCCESS', data: config })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }
  static getAll = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit

      const [infos, total] = await Promise.all([
        SocialLinks.find().skip(skip).limit(limit).lean(),
        SocialLinks.countDocuments()
      ])

      res.json({ success: true, total, data: infos })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static getAllForApp = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit

      const [infos, total] = await Promise.all([
        SocialLinks.find().skip(skip).limit(limit).lean(),
        SocialLinks.countDocuments()
      ])

      res.json({ success: true, total, data: infos })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static getById = async (req, res) => {
    try {
      const info = await SocialLinks.findById(req.params.id).lean()
      if (!info) return res.status(404).json({ success: false, message: 'Not found' })
      res.json({ success: true, data: info })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static create = async (req, res) => {
    try {
      const socialLinkSetting = SettingsConfig.menulist.find((item) => item.menu === 'SOCIALLINK_SETTINGS')

      if (!socialLinkSetting || !socialLinkSetting.enabled) {
        return requestHandler.sendError(req, res, {
          message: 'MEDIA_SETTINGS_DISABLED',
          code: 403
        })
      }

      const body = req.body

      // Normalize `link`
      if (body.link) {
        body.link = Array.isArray(body.link) ? body.link.map((l) => ({ link: l })) : [{ link: body.link }]
      }

      const info = await SocialLinks.create(body)
      res.json({ success: true, data: info, message: 'Created Successfully' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static update = async (req, res) => {
    try {
      const body = req.body

      if (body.link) {
        body.link = Array.isArray(body.link) ? body.link.map((l) => ({ link: l })) : [{ link: body.link }]
      }

      const info = await SocialLinks.findByIdAndUpdate(req.params.id, body, {
        new: true
      }).lean()

      if (!info) {
        return res.status(404).json({ success: false, message: 'Not found' })
      }

      res.json({ success: true, data: info, message: 'Updated Successfully' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static remove = async (req, res) => {
    try {
      const info = await SocialLinks.findByIdAndDelete(req.params.id).lean()
      if (!info) return res.status(404).json({ success: false, message: 'Not found' })
      res.json({ success: true, data: info, message: 'Deleted Successfully' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export { SocialLinkController }
