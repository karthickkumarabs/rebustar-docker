/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../controllers/BaseController.js'
import { PlaceValidator } from './validators/PlaceValidator.js'
import { Logger } from '../../utils/Logger.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import XLSX from 'xlsx'
import Place from './Places.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class GooglePlaceController extends BaseController {
  constructor() {
    super()
  }

  static getPlaces = async (req, res) => {
    try {
      const { page, limit = 10 } = req.query

      if (page) {
        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)
        const skip = (pageNum - 1) * limitNum

        const [places, total] = await Promise.all([
          Place.find({}).skip(skip).limit(limitNum).lean(),
          Place.countDocuments()
        ])

        return requestHandler.sendSuccess(
          req,
          res,
          'GET_PLACES'
        )({
          data: places,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        })
      }

      const places = await Place.find({}).lean()
      return requestHandler.sendSuccess(req, res, 'GET_PLACES')({ data: places })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static addPlaces = async (req, res) => {
    try {
      const body = req.body
      const validation = await PlaceValidator.validateData(body, 'addPlaces')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const checkPlaceExist = await Place.findOne({
        title: body.title,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude
      })

      if (checkPlaceExist) {
        throw new Error('PLACE_ALREADY_ADDED')
      }

      const data = new Place(body)
      await data.save()

      return requestHandler.sendSuccess(req, res, 'PLACES_ADDED')({ data })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static bulkImportPlaces = async (req, res) => {
    try {
      if (!req.file) throw new Error('FILE_REQUIRED')

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (!rows.length) throw new Error('FILE_IS_EMPTY')

      const required = ['title', 'address', 'latitude', 'longitude']
      const firstRow = Object.keys(rows[0]).map((k) => k.toLowerCase().trim())
      const missing = required.filter((f) => !firstRow.includes(f))
      if (missing.length) throw new Error(`MISSING_COLUMNS: ${missing.join(', ')}`)

      const normalized = rows.map((row) => {
        const entry = {}
        Object.keys(row).forEach((k) => (entry[k.toLowerCase().trim()] = row[k]))
        return {
          title: String(entry.title).trim(),
          address: String(entry.address).trim(),
          latitude: parseFloat(entry.latitude),
          longitude: parseFloat(entry.longitude)
        }
      })

      const valid = normalized.filter(
        (r) => r.title && r.address && !isNaN(r.latitude) && !isNaN(r.longitude)
      )
      const invalidCount = normalized.length - valid.length

      if (!valid.length) throw new Error('NO_VALID_ROWS: All rows have missing or invalid data')

      const existingPlaces = await Place.find({}, { title: 1, address: 1, latitude: 1, longitude: 1 }).lean()

      const existingSet = new Set(
        existingPlaces.map((p) => `${p.title}|${p.address}|${p.latitude}|${p.longitude}`)
      )

      const toInsert = valid.filter(
        (r) => !existingSet.has(`${r.title}|${r.address}|${r.latitude}|${r.longitude}`)
      )

      if (!toInsert.length) {
        return requestHandler.sendSuccess(
          req,
          res,
          'BULK_IMPORT_PLACES'
        )({
          inserted: 0,
          skipped: valid.length,
          invalid: invalidCount,
          message: 'All records already exist'
        })
      }

      await Place.insertMany(toInsert)

      return requestHandler.sendSuccess(
        req,
        res,
        'BULK_IMPORT_PLACES'
      )({
        inserted: toInsert.length,
        skipped: valid.length - toInsert.length,
        invalid: invalidCount,
        total: normalized.length
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}
export { GooglePlaceController }
