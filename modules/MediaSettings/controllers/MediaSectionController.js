/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import MediaSection from '../models/MediaSectionModel.js'
import { Logger } from '../../../utils/Logger.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { MediaConfig } from '../MediaConfig.js'

import path from 'path'
import fs from 'fs'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class MediaSectionController {
  static updateConfig = async (req, res) => {
    try {
      const configObj = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/MediaSettings/MediaConfig.js`

      const fileContent = `/* ************************
 * Copyright 2025
 * ABSERVETECH
 ************************ */

const MediaConfig = ${JSON.stringify(configObj, null, 2)}

export { MediaConfig }
`

      await fs.writeFileSync(filePath, fileContent)
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({
        message: 'UPDATED',
        MediaSectionData: configObj
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getConfig = async (req, res) => {
    try {
      const config = MediaConfig
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

      const [data, total] = await Promise.all([
        MediaSection.find().skip(skip).limit(limit).lean(),
        MediaSection.countDocuments()
      ])

      res.json({ success: true, total, data })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static getAllForApp = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10

      const skip = (page - 1) * limit

      const [data, total] = await Promise.all([
        MediaSection.find().skip(skip).limit(limit).lean(),
        MediaSection.countDocuments()
      ])

      res.json({ success: true, total, data })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static getById = async (req, res) => {
    try {
      const data = await MediaSection.findById(req.params.id).lean()
      if (!data) return res.status(404).json({ success: false, message: 'Not found' })
      res.json({ success: true, data })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  // static create = async (req, res) => {
  //   try {
  //     const mediaSetting = SettingsConfig.menulist.find((item) => item.menu === 'MEDIA_SETTINGS')

  //     if (!mediaSetting || !mediaSetting.enabled) {
  //       return requestHandler.sendError(req, res, {
  //         message: 'MEDIA_SETTINGS_DISABLED',
  //         code: 403
  //       })
  //     }

  //     const body = req.body
  //     let files = []

  //     if (req.file) {
  //       files = [{ file: req.file.path }]
  //     } else if (req.files && req.files.length > 0) {
  //       files = req.files.map((f) => ({ file: f.path }))
  //     }

  //     const data = await MediaSection.create({
  //       ...body,
  //       file: files
  //     })

  //     res.json({
  //       success: true,
  //       data,
  //       message: 'Created Successfully'
  //     })
  //   } catch (err) {
  //     res.status(500).json({ success: false, message: err.message })
  //   }
  // }

  // static update = async (req, res) => {
  //   try {
  //     const body = req.body
  //     let files = []

  //     // Handle uploaded files (binary)
  //     if (req.file) {
  //       files = [{ file: req.file.path }]
  //     } else if (req.files && req.files.length > 0) {
  //       files = req.files.map((f) => ({ file: f.path }))
  //     }

  //     // Handle file paths/strings in request body
  //     if (body.file) {
  //       // If body.file is an array, merge; if string, convert to array
  //       const bodyFiles = Array.isArray(body.file)
  //         ? body.file.map((f) => ({ file: f }))
  //         : [{ file: body.file }]
  //       files = [...files, ...bodyFiles]
  //     }

  //     // Only set files if we have something
  //     if (files.length > 0) {
  //       body.file = files
  //     }

  //     const data = await MediaSection.findByIdAndUpdate(req.params.id, body, {
  //       new: true
  //     }).lean()

  //     if (!data) {
  //       return res.status(404).json({ success: false, message: 'Not found' })
  //     }

  //     res.json({ success: true, data, message: 'Updated Successfully' })
  //   } catch (err) {
  //     res.status(500).json({ success: false, message: err.message })
  //   }
  // }

  // static create = async (req, res) => {
  //   try {
  //     const body = req.body
  //     let images = []
  //     let videos = []

  //     const processFile = (filePath, mimeOrName) => {
  //       const isVideo = mimeOrName.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(mimeOrName)
  //       const obj = { file: filePath, type: isVideo ? 'video' : 'image' }
  //       if (isVideo) videos.push(obj)
  //       else images.push(obj)
  //     }

  //     // Handle uploaded files
  //     if (req.files && req.files.length > 0) {
  //       req.files.forEach(f => processFile(f.path, f.mimetype))
  //     }

  //     // Handle file URLs in body
  //     if (body.file) {
  //       const bodyFiles = Array.isArray(body.file) ? body.file : [body.file]
  //       bodyFiles.forEach(f => processFile(f, f))
  //     }

  //     const data = await MediaSection.create({
  //       ...body,
  //       images,
  //       videos
  //     })

  //     res.json({ success: true, data, message: 'Created Successfully' })
  //   } catch (err) {
  //     res.status(500).json({ success: false, message: err.message })
  //   }
  // }

  // static update = async (req, res) => {
  //   try {
  //     const body = req.body
  //     let images = []
  //     let videos = []

  //     const processFile = (filePath, mimeOrName) => {
  //       const isVideo = mimeOrName.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(mimeOrName)
  //       const obj = { file: filePath, type: isVideo ? 'video' : 'image' }
  //       if (isVideo) videos.push(obj)
  //       else images.push(obj)
  //     }

  //     if (req.files && req.files.length > 0) {
  //       req.files.forEach(f => processFile(f.path, f.mimetype))
  //     }

  //     if (body.file) {
  //       const bodyFiles = Array.isArray(body.file) ? body.file : [body.file]
  //       bodyFiles.forEach(f => processFile(f, f))
  //     }

  //     if (images.length > 0) body.images = images
  //     if (videos.length > 0) body.videos = videos

  //     const data = await MediaSection.findByIdAndUpdate(req.params.id, body, { new: true }).lean()

  //     if (!data) return res.status(404).json({ success: false, message: 'Not found' })

  //     res.json({ success: true, data, message: 'Updated Successfully' })
  //   } catch (err) {
  //     res.status(500).json({ success: false, message: err.message })
  //   }
  // }

  static create = async (req, res) => {
    try {
      const body = req.body
      const images = []
      const videos = []

      const processFile = (filePath, mimeOrName) => {
        const isVideo = mimeOrName.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(mimeOrName)
        const obj = { filePath, type: isVideo ? 'video' : 'image' }
        if (isVideo) videos.push(obj)
        else images.push(obj)
      }

      // Handle uploaded files
      if (req.files && req.files.length > 0) {
        req.files.forEach((f) => processFile(f.path, f.mimetype))
      }

      // Handle file URLs from request body
      if (body.file) {
        const bodyFiles = Array.isArray(body.file) ? body.file : [body.file]
        bodyFiles.forEach((f) => processFile(f, f))
      }

      // Combine old arrays to match new schema
      const files = [...images, ...videos]

      const data = await MediaSection.create({
        ...body,
        files // store under new 'files' field
      })

      res.json({ success: true, data, message: 'Created Successfully' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static update = async (req, res) => {
    try {
      const body = req.body
      const images = []
      const videos = []

      const processFile = (filePath, mimeOrName) => {
        const isVideo = mimeOrName.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(mimeOrName)
        const obj = { filePath, type: isVideo ? 'video' : 'image' }
        if (isVideo) videos.push(obj)
        else images.push(obj)
      }

      if (req.files && req.files.length > 0) {
        req.files.forEach((f) => processFile(f.path, f.mimetype))
      }

      if (body.file) {
        const bodyFiles = Array.isArray(body.file) ? body.file : [body.file]
        bodyFiles.forEach((f) => processFile(f, f))
      }

      const files = [...images, ...videos]

      // Only update 'files' if new uploads exist
      if (files.length > 0) body.files = files

      const data = await MediaSection.findByIdAndUpdate(req.params.id, body, { new: true }).lean()

      if (!data) return res.status(404).json({ success: false, message: 'Not found' })

      res.json({ success: true, data, message: 'Updated Successfully' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static remove = async (req, res) => {
    try {
      const data = await MediaSection.findByIdAndDelete(req.params.id).lean()
      if (!data) return res.status(404).json({ success: false, message: 'Not found' })
      res.json({ success: true, data, message: 'Deleted Successfully' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export default MediaSectionController
