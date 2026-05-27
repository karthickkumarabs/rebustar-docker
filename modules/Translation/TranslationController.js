/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Worker } from 'worker_threads'
import { readFileSync, readdir } from 'node:fs'
import { BaseController } from '../../controllers/BaseController.js'

import Translation from './models/Translation.js'
import Transcribe from './models/Transcribe.js'
import Language from './models/Language.js'

import { CreteriaService } from '../../services/Creteria/CreteriaServices.js'
import { TranslationValidator } from '../../validators/Module/TranslationValidator.js'

import { QueryBuilder } from '../../helpers/QueryBuilder.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import mongoose from 'mongoose'
const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class TranslationController extends BaseController {
  constructor() {
    super()
  }

  static jsonParse = (buffer, { reviver } = {}) => {
    const data = new TextDecoder().decode(buffer)
    return JSON.parse(data, reviver)
  }

  static jsonLoad = async (filePath, options) => {
    const buffer = await readFileSync(filePath)
    return this.jsonParse(buffer, options)
  }

  static readFiles = (__dirname) => {
    return new Promise((resolve, reject) => {
      readdir(__dirname, async (err, __files) => {
        try {
          if (err) reject(err)
          else {
            const __fileData = {}
            for (const __file of __files) {
              __fileData[__file.split('.')[0] || __file] = await this.jsonLoad(__dirname + '/' + __file)
            }
            resolve(__fileData)
          }
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  static getTranslationJson = async (req, res) => {
    try {
      const translations = await this.readFiles('locale')
      return requestHandler.sendSuccess(req, res, 'GET_TRANSLATION')({ message: 'TRANSLATION', translations })
    } catch (error) {
      console.error('GET_TRANSLATION_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateTranslationFile = async (translations) => {
    try {
      const { language, fileData, group = null } = translations
      if (typeof fileData) {
        for (const key of Object.keys(fileData)) {
          const findQuery = { interpret: key }
          if (group) findQuery['group'] = group
          const getTranslation = await Translation.findOneAndUpdate(
            findQuery,
            {},
            { new: true, upsert: true }
          )
            .lean()
            .exec()

          if (typeof fileData[key] === 'object') {
            this.updateTranslationFile({
              language: language,
              fileData: fileData[key],
              group: getTranslation._id
            })
          } else {
            await Transcribe.findOneAndUpdate(
              { language: language, translation: getTranslation._id },
              { describe: fileData[key] },
              { upsert: true }
            )
              .lean()
              .exec()
          }
        }
      }
    } catch (error) {
      console.error('UPDATE_TRANSLATION_FILE_ERROR', error)
    }
  }

  static updateLanguage = async (req, res) => {
    try {
      const body = req.body
      const validation = await TranslationValidator.validateData(body, 'updateLanguage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      let fileData = null
      let filePath = ''
      if (req.file.path) {
        fileData = await this.jsonLoad(req.file.path)
        if (!fileData) throw new Error('DATA_NOT_PROCESSABLE')

        const hasNestedArrays = (obj) => {
          if (Array.isArray(obj)) {
            return true
          }
          for (const key in obj) {
            if (typeof obj[key] === 'object' && hasNestedArrays(obj[key])) {
              return true
            }
          }
          return false
        }

        if (typeof fileData != 'object' || Array.isArray(fileData) || hasNestedArrays(fileData))
          throw new Error('DATA_STRUCTURE_IS_NOT_PROCESSABLE')

        const pathUrl = 'public/locale'
        const fileName = body.indexName + '.json'
        filePath = pathUrl + '/' + fileName

        const getPath = await CreteriaService.makeDirectory(pathUrl)
        if (!getPath.status) throw new Error(getPath.message)
        const moveFile = await CreteriaService.moveFile(req.file.path, filePath)
        if (!moveFile.status) throw new Error(moveFile.message)
      }

      let getLanguage = await Language.findOne({ name: body.name, indexName: body.indexName }).exec()
      if (!getLanguage) {
        getLanguage = new Language()
      }
      getLanguage.name = body.name
      getLanguage.indexName = body.indexName
      getLanguage.file = filePath != '' ? filePath : getLanguage.file
      getLanguage.status = body.status || false
      const language = await getLanguage.save()

      if (fileData) {
        this.updateTranslationFile({
          fileData: fileData,
          language: language._id,
          group: null
        })
      }

      return requestHandler.sendSuccess(
        req,
        res,
        'ADD_LANGUAGE'
      )({ message: 'ADD_LANGUAGE', language: language })
    } catch (error) {
      console.error('ADD_LANGUAGE_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getLanguages = async (req, res) => {
    try {
      const queryData = req.query
      const paramData = req.params
      const perPage = parseInt(queryData.limit)
      const page = parseInt(queryData.page)
      const skip = perPage * page - perPage || 0

      const validation = await TranslationValidator.validateData(queryData, 'getLanguage')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      let queryObject = {}

      const queryBuilder = await QueryBuilder.getSearchable(Language, queryData)
      queryObject = queryBuilder.queryObject
      queryObject.deletedAt = null

      if (paramData.languageId) {
        queryObject['_id'] = mongoose.Types.ObjectId(paramData.languageId)
      }

      const languageCount = await Language.find(queryObject).countDocuments().exec()

      let languageQuery = Language.find(queryObject)

      // Apply pagination only if limit and page are present
      if (!isNaN(perPage) && !isNaN(page)) {
        languageQuery = languageQuery.skip(skip).limit(perPage)
      }

      const languageList = await languageQuery.exec()

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_LANGUAGE'
      )({
        message: 'LISTED|LANGUAGE',
        language: languageList,
        count: languageCount
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getTranslation = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(Translation, queryData)
      queryObject = queryBuilder.queryObject
      queryBuilder['deletedAt'] = null

      const groupIds = await Translation.distinct('group', { group: { $ne: null }, deletedAt: null }).exec()
      if (groupIds) queryObject['_id'] = { $nin: groupIds }
      const translationsCount = await Translation.find(queryObject).count().exec()
      let translations = await Translation.find(queryObject, { interpret: 1 })
        .populate('group', 'interpret')
        .skip(skip)
        .limit(perPage)
        .lean()
        .exec()

      if (queryData['group.interpret']) {
        const match = queryData['group.interpret'].toLowerCase()
        translations = translations.filter((item) => item.group?.interpret?.toLowerCase().includes(match))
      }

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_TRANSLATION'
      )({ message: 'GET_TRANSLATION', translations: translations, total: translationsCount })
    } catch (error) {
      console.error('GET_TRANSLATION_ERROR:', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getTranslationGroup = async (req, res) => {
    try {
      const queryData = req.query
      const perPage = queryData.limit || 10
      const page = queryData.page || 1
      const skip = perPage * page - perPage || 0

      let queryObject = {}
      const queryBuilder = await QueryBuilder.getSearchable(Language, queryData)
      queryObject = queryBuilder.queryObject

      const groupIds = await Translation.distinct('group', { group: { $ne: null } }).exec()
      if (groupIds) queryObject['_id'] = { $in: groupIds }
      const translationsCount = await Translation.find(queryObject).count().exec()
      const translations = await Translation.find(queryObject, { interpret: 1 })
        .populate('group', 'interpret')
        .skip(skip)
        .limit(perPage)
        .lean()
        .exec()
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_TRANSLATION_GROUPS'
      )({ message: 'GET_TRANSLATION_GROUPS', translations: translations, count: translationsCount })
    } catch (error) {
      console.error('GET_TRANSLATION_GROUPS_ERROR:', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getTranscribe = async (req, res) => {
    try {
      const paramData = req.params

      const validation = await TranslationValidator.validateData(paramData, 'getTranscribe')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const languages = await Language.aggregate([
        {
          $match: {
            status: true
          }
        },
        {
          $lookup: {
            from: 'transcribes',
            let: {
              languageId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$language', '$$languageId'] },
                      { $eq: ['$translation', mongoose.Types.ObjectId(paramData.translationId)] }
                    ]
                  }
                }
              }
            ],
            as: 'transcribe'
          }
        },
        {
          $unwind: {
            path: '$transcribe',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            'transcribe._id': { $ifNull: ['$transcribe._id', null] },
            'transcribe.translation': { $ifNull: ['$transcribe.translation', null] },
            'transcribe.describe': { $ifNull: ['$transcribe.describe', null] }
          }
        }
      ])
      if (languages.length <= 0) throw new Error('TRANSLATION_NOT_FOUND')

      return requestHandler.sendSuccess(req, res, 'GET_TRANSCRIBE')({ message: 'TRANSLATION', languages })
    } catch (error) {
      console.error('GET_TRANSCRIBE_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateTranscribe = async (req, res) => {
    try {
      const paramData = req.params
      const bodyData = req.body

      const validation = await TranslationValidator.validateData(bodyData, 'updateTranscribe')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const transcribeData = []
      const findQuery = {}
      if (bodyData.translationId || paramData.translationId)
        findQuery['_id'] = mongoose.Types.ObjectId(bodyData.translationId || paramData.translationId)
      else {
        findQuery['interpret'] = bodyData.interpret
        if (bodyData.group) findQuery['group'] = bodyData.group
      }
      const getTranslation = await Translation.findOneAndUpdate(findQuery, {}, { new: true, upsert: true })
        .lean()
        .exec()
      if (!getTranslation) throw new Error('TRANSLATION_NOT_ADDED')

      // Need to check it
      // if (!bodyData.isGroup) {
      for (const transcribe of bodyData.transcribe) {
        const transcribeUpdate = await Transcribe.findOneAndUpdate(
          { language: transcribe.language, translation: getTranslation._id },
          { describe: transcribe.describe },
          { new: true, upsert: true }
        )
          .lean()
          .exec()
        transcribeData.push({
          _id: transcribeUpdate._id,
          translation: transcribeUpdate.translation,
          language: transcribeUpdate.language,
          describe: transcribeUpdate.describe
        })
      }
      // }

      return requestHandler.sendSuccess(
        req,
        res,
        'UPDATE_TRANSCRIBE'
      )({
        message: 'UPDATE_TRANSCRIBE',
        translation: {
          _id: getTranslation._id,
          group: getTranslation.group,
          interpret: getTranslation.interpret
        },
        transcribe: transcribeData
      })
    } catch (error) {
      console.error('GET_TRANSCRIBE_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteTransaltion = async (req, res) => {
    try {
      const paramData = req.params

      const validation = await TranslationValidator.validateData(paramData, 'deleteTransaltion')
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const getTranslation = await Translation.findOne({
        _id: mongoose.Types.ObjectId(paramData.translationId),
        deletedAt: null
      })
        .lean()
        .exec()

      if (!getTranslation) throw new Error('TRANSLATION_NOT_FOUND')

      getTranslation.deletedAt = new Date()
      await getTranslation.save()

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_TRANSLATION'
      )({
        message: 'DELETE_TRANSLATION'
      })
    } catch (error) {
      console.error('GET_TRANSCRIBE_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static generateJson = async (req, res) => {
    try {
      const worker = new Worker('./utils/TranslationWorker.js')

      worker.on('message', (stream) => {
        if (stream?.error) {
          console.log(stream.error)
          if (!res.headersSent) {
            return requestHandler.sendError(req, res, new Error('Worker Error'))
          }
          return
        }
        if (!res.headersSent) {
          return requestHandler.sendSuccess(
            req,
            res,
            'FILE_GENERATED'
          )({
            message: 'FILE_GENERATED'
          })
        }
      })

      worker.on('error', (error) => {
        console.error('WORKER_ERROR:', error)
        if (!res.headersSent) return requestHandler.sendError(req, res, new Error('Worker Error'))
      })
    } catch (error) {
      console.error('GENERATE_JSON_ERROR: ', error)
      if (!res.headersSent) return requestHandler.sendError(req, res, error)
    }
  }
}

export { TranslationController }
