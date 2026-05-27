/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import ContactUs from '../models/ContactUs.js'
import { ValidationError } from '../../../utils/ErrorHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class CmsPageController {
  static htmlDir = path.resolve(__dirname, '../../../public')

  static getSubjectFromKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
  }

  static getDynamicPages = (req, res) => {
    try {
      const { limit = 10, page = 1, key: filterKey } = req.query
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const start = (pageNum - 1) * limitNum
      const end = pageNum * limitNum

      const allPages = fs
        .readdirSync(CmsPageController.htmlDir)
        .filter((file) => file.endsWith('.html'))
        .map((file) => {
          const key = path.basename(file, '.html')
          if (filterKey && key !== filterKey) return null

          const doc = fs.readFileSync(path.join(CmsPageController.htmlDir, file), 'utf8')
          const subject = CmsPageController.getSubjectFromKey(key)

          return {
            key,
            subject,
            description: `This page is for ${subject}.`,
            doc
          }
        })
        .filter(Boolean)

      const paginatedData = allPages.slice(start, end)

      return requestHandler.sendSuccess(
        req,
        res
      )({
        message: 'Fetched successfully',
        total: allPages.length,
        data: paginatedData
      })
    } catch (err) {
      requestHandler.sendError(req, res, err)
    }
  }

  static createDynamicPages = (req, res) => {
    try {
      const { body: html, subject } = req.body

      if (!html || !subject) {
        throw new ValidationError('Missing required fields: body and subject')
      }

      const key = subject.toLowerCase().replace(/\s+/g, '')
      const filePath = path.join(CmsPageController.htmlDir, `${key}.html`)

      if (fs.existsSync(filePath)) {
        throw new ValidationError(`Key '${key}' already exists. Key must be unique.`)
      }

      fs.writeFileSync(filePath, html, 'utf8')

      return requestHandler.sendSuccess(
        req,
        res
      )({
        message: 'Created successfully',
        key
      })
    } catch (err) {
      requestHandler.sendError(req, res, err)
    }
  }

  static updateDynamicPages = (req, res) => {
    try {
      const { key, body: html } = req.body

      if (!key || !html) {
        throw new ValidationError('Missing required fields: key and body')
      }

      const filePath = path.join(CmsPageController.htmlDir, `${key}.html`)

      if (!fs.existsSync(filePath)) {
        throw new ValidationError(`Cannot update. Key '${key}' does not exist.`)
      }

      fs.writeFileSync(filePath, html, 'utf8')

      return requestHandler.sendSuccess(
        req,
        res
      )({
        message: 'Updated successfully'
      })
    } catch (err) {
      requestHandler.sendError(req, res, err)
    }
  }

  // contact us

  static createContactRequest = async (req, res) => {
    try {
      const { firstName, lastName, email, phone, subject, detail, city } = req.body

      // validation
      if (!firstName || !email || !phone || !subject || !detail) {
        throw new ValidationError('Missing required fields')
      }

      const newContact = new ContactUs({
        firstName,
        lastName,
        email,
        phone,
        subject,
        detail,
        city
      })

      await newContact.save()

      return requestHandler.sendSuccess(
        req,
        res
      )({
        message: 'Submitted successfully',
        data: newContact
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getDynamicPagesForApp = (req, res) => {
    try {
      const { limit = 10, page = 1, key: filterKey } = req.query
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const start = (pageNum - 1) * limitNum
      const end = pageNum * limitNum

      const allPages = fs
        .readdirSync(CmsPageController.htmlDir)
        .filter((file) => file.endsWith('.html'))
        .map((file) => {
          const key = path.basename(file, '.html')
          if (filterKey && key !== filterKey) return null

          const doc = fs.readFileSync(path.join(CmsPageController.htmlDir, file), 'utf8')
          const subject = CmsPageController.getSubjectFromKey(key)

          return {
            key,
            subject,
            description: `This page is for ${subject}.`,
            doc
          }
        })
        .filter(Boolean)

      const paginatedData = allPages.slice(start, end)

      return requestHandler.sendSuccess(
        req,
        res
      )({
        message: 'Fetched successfully',
        total: allPages.length,
        data: paginatedData
      })
    } catch (err) {
      requestHandler.sendError(req, res, err)
    }
  }
}

export { CmsPageController }
