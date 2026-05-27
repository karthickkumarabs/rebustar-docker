/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import moment from 'moment'
import mongoose from 'mongoose'

import { BaseController } from '../BaseController.js'
import { NotifcationController } from '../Notification/Index.js'

import { DocumentConfig } from '../../config/DocumentConfig.js'
import { Config } from '../../config/AppConfig.js'
import { Feature } from '../../config/FeatureConfig.js'

import { DocumentValidator } from '../../validators/Creteria/documentValidator.js'
import { CreteriaService } from '../../services/Creteria/CreteriaServices.js'

// import request from 'request'
import { AuthendicationError, ServiceModuleError, ValidationError } from '../../utils/ErrorHandler.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { Enum } from '../../utils/Enum.js'

import Partner from '../../models/Auth/Partner.js'
import Vehicle from '../../models/Creteria/Vehicle.js'
import DocumentModel from '../../modules/Document/models/DocumentModel.js'
import { SettingsConfig } from '../../config/SettingsConfig.js'
import { DocumentConfig as DynamicDocumentSettings } from '../../modules/Document/config.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)
const documentSettings = SettingsConfig.menulist.find((item) => item.value === Enum.SETTINGS.DOCUMENTSETTINGS)

class DocumentController extends BaseController {
  constructor() {
    super()
  }

  static parseDocument = async (documentType, partnerServiceArea = [], inputDocument, additionalData) => {
    let parseDocument = []
    let settings = DocumentConfig[documentType] ?? []
    try {
      if (documentSettings.enabled && DynamicDocumentSettings.isDynamic) {
        const docSettings = await DocumentModel.find({
          serviceCities: { $in: partnerServiceArea },
          type: documentType,
          deletedAt: null,
          status: true,
          mandatory: true
        })

        if (docSettings.length > 0) settings = docSettings
      }

      const documentData = JSON.parse(JSON.stringify(settings)) // Deep clone the array
      // console.log('documentData', documentData)

      for (const document of documentData) {
        document.dataType = documentType
        document.reason = ''
        const documentIndex = inputDocument.findIndex((i) => i.name === document.indexName)
        if (documentIndex != -1) {
          const actualDocument = inputDocument[documentIndex]
          const addPath = additionalData?.addPath ?? ''
          document.isUploaded = true
          document.status = actualDocument.status
          document.reason = actualDocument.reason || ''
          if (document.fields) {
            for (const field of document.fields) {
              field.value = ''
              if (actualDocument.fields) {
                const fieldIndex = actualDocument.fields.findIndex((i) => i.name == field.indexName)
                if (fieldIndex != -1) {
                  if (field.type == Enum.DOCUMENT.FILETYPE.IMAGE) {
                    field.value = `${Config.app.baseurl}/${DocumentConfig.STORAGE[documentType]}/${addPath}/${actualDocument.fields[fieldIndex].value}`
                  } else {
                    field.value = actualDocument.fields[fieldIndex].value
                  }
                }
              }
            }
          }
        } else {
          document.isUploaded = false
          document.status = 'needAction'
          document.reason = ''
        }
        parseDocument.push(document)
      }
    } catch (error) {
      console.error('PARSE_DOCUMENT_ERROR: ', error)
      parseDocument = []
    }
    return parseDocument
  }

  static uploadDocument = async (req, res) => {
    try {
      const body = req.body
      const authData = req.auth || {}
      const userId =
        authData.role == Enum.ROLES.PARTNER ? authData.userId : mongoose.Types.ObjectId(req.params.partnerId)

      const partnerData = await Partner.findOne({ _id: userId })
      if (!partnerData) throw new AuthendicationError('NOT_FOUND|PARTNER')

      const fieldName = body.fieldName
      const filePath = DocumentConfig.STORAGE[Enum.DOCUMENT.TYPE.PARTNER]
      let document = null

      // find the document details based on the driver service cities if driver document not found assign default document data to upload
      if (documentSettings.enabled && DynamicDocumentSettings.isDynamic) {
        document = await DocumentModel.findOne({
          serviceCities: { $in: partnerData.scId },
          type: Enum.DOCUMENT.TYPE.PARTNER,
          indexName: fieldName,
          status: true,
          deletedAt: null
        }).lean()
      }

      if (!document) {
        const docIndex = DocumentConfig[Enum.DOCUMENT.TYPE.PARTNER].findIndex(
          (elem) => elem.indexName == fieldName
        )
        if (document == -1) throw new ValidationError('NOT_FOUND|DOCUMENT')
        document = { ...DocumentConfig[Enum.DOCUMENT.TYPE.PARTNER][docIndex] }
      }

      const validation = await DocumentValidator.documentValidate(body, document)
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      body['files'] = req.files
      const resData = await CreteriaService.uploadDoc(
        document,
        `./${filePath}/${partnerData._id}/`,
        body,
        partnerData.document
      )
      if (!resData.status) throw new ValidationError('DOCUMENT_NOT_UPLOADED')
      const findFieldName = await Partner.findOne({
        _id: userId,
        document: { $elemMatch: { name: fieldName } }
      })

      let updateQuery = {}
      let findQuery = {}

      if (!findFieldName) {
        updateQuery = {
          $push: {
            document: {
              name: body.fieldName,
              // status: resData['data'].findFile.status,
              // reason: resData['data'].findFile.reason,
              fields: resData['data'].fieldArr
            }
          }
        }
        findQuery = {
          _id: userId
        }
      } else {
        updateQuery = {
          $set: {
            'document.$.name': fieldName,
            'document.$.status': resData['data'].findFile.status,
            'document.$.reason': resData['data'].findFile.reason,
            'document.$.fields': resData['data'].fieldArr
          }
        }
        findQuery = {
          _id: userId,
          'document.name': fieldName
        }
      }

      const updateData = await Partner.findOneAndUpdate(findQuery, updateQuery, { new: true })

      if (updateData) {
        if (resData['data'].removeOldFiles.length > 0) {
          resData['data'].removeOldFiles.forEach(async (e) => await CreteriaService.removeFile(e))
        }
      }

      const partnerDocs = updateData.document.length > 0 ? updateData.document : []
      const getParseDocument = await this.parseDocument(
        Enum.DOCUMENT.TYPE.PARTNER,
        partnerData.scId,
        partnerDocs,
        { addPath: userId }
      )

      return requestHandler.sendSuccess(
        req,
        res,
        'UPLOAD_DOCUMENT'
      )({ message: 'UPDATED|DOCUMENT', documents: getParseDocument })
    } catch (error) {
      console.error('UPLOAD_DOCUMENT_ERROR: ', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPartnerDocuments = async (req, res) => {
    try {
      const authData = req.auth || {}
      const userId =
        authData.role == Enum.ROLES.PARTNER ? authData.userId : mongoose.Types.ObjectId(req.params.partnerId)

      const partnerData = await Partner.findOne({ _id: userId }).lean().exec()
      if (!partnerData) throw new AuthendicationError('PARTNER_NOT_FOUND')
      const partnerDocs = partnerData.document.length > 0 ? partnerData.document : []
      const getParseDocument = await this.parseDocument(
        Enum.DOCUMENT.TYPE.PARTNER,
        partnerData.scId,
        partnerDocs,
        { addPath: userId }
      )

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PARTNER_DOCUMENTS'
      )({ message: 'SUCCESS', documents: getParseDocument })
    } catch (error) {
      console.error('GET_PARTNER_DOCUMENTS_ERROR: ', error)
      return requestHandler.sendError(req, res, Error)
    }
  }

  static uploadVehicleDocument = async (req, res) => {
    try {
      const body = req.body
      const params = req.params
      const authData = req.auth || {}

      const partnerId =
        authData.role == Enum.ROLES.PARTNER ? authData.userId : mongoose.Types.ObjectId(params.partnerId)
      const vehicleId = params.vehicleId

      const partnerData = await Partner.findOne({ _id: partnerId })
      if (!partnerData) throw new ServiceModuleError('PARTNER_NOT_FOUND')

      const fieldName = body.fieldName
      const filePath = DocumentConfig.STORAGE[Enum.DOCUMENT.TYPE.VEHICLE]
      let document = null

      if (documentSettings.enabled && DynamicDocumentSettings.isDynamic) {
        document = await DocumentModel.findOne({
          serviceCities: { $in: partnerData.scId },
          indexName: fieldName,
          type: Enum.DOCUMENT.TYPE.VEHICLE,
          status: true,
          deletedAt: null
        })
        console.log('document', document)
      }

      if (!document) {
        const docIndex = DocumentConfig[Enum.DOCUMENT.TYPE.VEHICLE].findIndex(
          (elem) => elem.indexName == fieldName
        )
        if (document == -1) throw new ValidationError('NOT_FOUND|DOCUMENT')
        document = { ...DocumentConfig[Enum.DOCUMENT.TYPE.VEHICLE][docIndex] }
      }

      const validation = await DocumentValidator.vehicleDocumentValidate(body, document)
      if (!validation.status) return requestHandler.sendError(req, res, validation.data)

      const vehicleData = await Vehicle.findOne({
        _id: vehicleId,
        $or: [{ ownerId: partnerId }, { partnerId: partnerId }]
      })
      if (!vehicleData) throw new ValidationError('NOT_FOUND|VEHICLE')

      body['files'] = req.files
      const resData = await CreteriaService.uploadDoc(
        document,
        `./${filePath}/${vehicleData._id}/`,
        body,
        vehicleData.document
      )
      if (!resData.status) throw new ValidationError('DOCUMENT_NOT_UPLOADED')
      const findFieldName = await Vehicle.findOne({
        _id: vehicleId,
        $or: [{ ownerId: partnerId }, { partnerId: partnerId }],
        document: { $elemMatch: { name: fieldName } }
      })

      let updateQuery = {}
      const findQuery = {
        _id: vehicleId,
        $or: [{ ownerId: partnerId }, { partnerId: partnerId }]
      }

      if (!findFieldName) {
        updateQuery = {
          $push: {
            document: {
              name: body.fieldName,
              // status: resData['data'].findFile.status,
              // reason: resData['data'].findFile.reason,
              fields: resData['data'].fieldArr
            }
          }
        }
      } else {
        updateQuery = {
          $set: {
            'document.$.name': fieldName,
            'document.$.status': resData['data'].findFile.status,
            'document.$.reason': resData['data'].findFile.reason,
            'document.$.fields': resData['data'].fieldArr
          }
        }
        findQuery['document.name'] = fieldName
      }

      const updateData = await Vehicle.findOneAndUpdate(findQuery, updateQuery, { new: true })
      if (updateData) {
        if (resData['data'].removeOldFiles.length > 0) {
          resData['data'].removeOldFiles.forEach(async (e) => await CreteriaService.removeFile(e))
        }
      }
      const vehicleDocs = updateData.document.length > 0 ? updateData.document : []
      const getParseDocument = await this.parseDocument(
        Enum.DOCUMENT.TYPE.VEHICLE,
        partnerData.scId,
        vehicleDocs,
        { addPath: vehicleId }
      )

      return requestHandler.sendSuccess(
        req,
        res,
        'UPLOAD_VEHICLE_DOCUMENT'
      )({ message: 'UPDATED|DOCUMENT', documents: getParseDocument })
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getvehicleDocuments = async (req, res) => {
    try {
      const authData = req.auth || {}
      const params = req.params

      const userId =
        authData.role == Enum.ROLES.PARTNER ? authData.userId : mongoose.Types.ObjectId(params.partnerId)

      const partnerData = await Partner.findOne({ _id: userId })
      if (!partnerData) throw new ServiceModuleError('PARTNER_NOT_FOUND')

      const vehicleId = params.vehicleId
      const vehicleData = await Vehicle.findOne({
        _id: vehicleId,
        $or: [{ ownerId: userId }, { partnerId: userId }]
      })
        .lean()
        .exec()
      if (!vehicleData) throw new ValidationError('NOT_FOUND|VEHICLE')
      const vehicleDocs = vehicleData.document.length > 0 ? vehicleData.document : []
      const getParseDocument = await this.parseDocument(
        Enum.DOCUMENT.TYPE.VEHICLE,
        partnerData.scId,
        vehicleDocs,
        { addPath: vehicleId }
      )
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_VEHICLE_DOCUMENT'
      )({ message: 'SUCCESS', documents: getParseDocument })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getExpiredPartners = async (req, res) => {
    try {
      const queryData = req.query || {}
      const perPage = Number(queryData.limit) || 10
      const page = Number(queryData.page) || 1
      const skip = perPage * (page - 1)

      const nameFilters = []
      let dateFieldFilters = []

      for (const data of DocumentConfig.partner) {
        const addItems = data.fields.reduce((acc, cur) => {
          if (cur.type === 'date') {
            acc = [...acc, cur.indexName]
          }
          return acc
        }, [])
        if (addItems.length > 0) {
          nameFilters.push(data.indexName)
          dateFieldFilters = [...dateFieldFilters, ...addItems]
        }
      }

      const matchQuery = {
        document: {
          $elemMatch: {
            name: { $in: nameFilters },
            status: 'approved',
            fields: {
              $elemMatch: {
                name: { $in: dateFieldFilters }
              }
            }
          }
        }
      }

      //  ADDITION: Add filters based on query params
      if (queryData.uniCode) {
        matchQuery.uniCode = { $regex: queryData.uniCode, $options: 'i' }
      }
      if (queryData.fname) {
        matchQuery.fname = { $regex: queryData.fname, $options: 'i' }
      }
      if (queryData.phone) {
        matchQuery.phone = { $regex: queryData.phone, $options: 'i' }
      }

      const partnerList = await Partner.aggregate([
        { $match: matchQuery },

        {
          $addFields: {
            document: {
              $map: {
                input: '$document',
                as: 'doc',
                in: {
                  $mergeObjects: [
                    '$$doc',
                    {
                      fields: {
                        $map: {
                          input: '$$doc.fields',
                          as: 'field',
                          in: {
                            $mergeObjects: [
                              '$$field',
                              {
                                convertedDate: {
                                  $convert: {
                                    input: '$$field.value',
                                    to: 'date',
                                    onError: null
                                  }
                                }
                              }
                            ]
                            // $cond: {
                            //   if: {
                            //     $setIsSubset: [['$$field.name'], dateFieldFilters]
                            //   },
                            //   then: {
                            //     $mergeObjects: [
                            //       '$$field',
                            //       {
                            //         convertedDate: {
                            //           $convert: {
                            //             input: '$$field.value',
                            //             to: 'date',
                            //             onError: null
                            //           }
                            //         }
                            //       }
                            //     ]
                            //   },
                            //   else: '$$field'
                            // }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        },

        {
          $match: {
            document: {
              $elemMatch: {
                name: { $in: nameFilters },
                status: 'approved',
                fields: {
                  $elemMatch: {
                    $and: [
                      { name: { $in: dateFieldFilters } },
                      { convertedDate: { $lt: new Date() } }
                      // { $or: [{ convertedDate: { $ne: null } }, { convertedDate: { $lt: new Date() } }] }
                    ]
                  }
                }
              }
            }
          }
        },

        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $sort: { _id: -1 } },
              { $skip: skip },
              { $limit: perPage },
              {
                $project: {
                  fname: 1,
                  email: 1,
                  phone: 1,
                  phoneCode: 1,
                  uniCode: 1
                }
              }
            ]
          }
        }
      ])

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PARTNER_DOCUMENT_EXPIRY_NOTIFY'
      )({
        partnerList: partnerList[0]?.data || [],
        total: partnerList[0]?.metadata[0]?.total || 0
      })
    } catch (error) {
      console.log(error)
      return requestHandler.sendError(req, res, error) // 🔁 Fixed from `Error` to `error`
    }
  }

  static getExpiredVehicles = async (req, res) => {
    try {
      const queryData = req.query || {}
      const perPage = Number(queryData.limit) || 10
      const page = Number(queryData.page) || 1
      const skip = perPage * (page - 1)

      const nameFilters = []
      let dateFieldFilters = []

      for (const data of DocumentConfig.vehicle) {
        const addItems = data.fields.reduce((acc, cur) => {
          if (cur.type === 'date') {
            acc = [...acc, cur.indexName]
          }
          return acc
        }, [])
        if (addItems.length > 0) {
          nameFilters.push(data.indexName)
          dateFieldFilters = [...dateFieldFilters, ...addItems]
        }
      }

      const vehicleList = await Vehicle.aggregate([
        {
          $match: {
            document: {
              $elemMatch: {
                name: { $in: nameFilters },
                status: 'approved',
                fields: {
                  $elemMatch: {
                    name: { $in: dateFieldFilters }
                  }
                }
              }
            }
          }
        },
        {
          $addFields: {
            document: {
              $map: {
                input: '$document',
                as: 'doc',
                in: {
                  $mergeObjects: [
                    '$$doc',
                    {
                      fields: {
                        $map: {
                          input: '$$doc.fields',
                          as: 'field',
                          in: {
                            $mergeObjects: [
                              '$$field',
                              {
                                convertedDate: {
                                  $convert: {
                                    input: '$$field.value',
                                    to: 'date',
                                    onError: null
                                  }
                                }
                              }
                            ]
                            // $cond: {
                            //   if: {
                            //     $setIsSubset: [['$$field.name'], dateFieldFilters]
                            //   },
                            //   then: {
                            //     $mergeObjects: [
                            //       '$$field',
                            //       {
                            //         convertedDate: {
                            //           $convert: {
                            //             input: '$$field.value',
                            //             to: 'date',
                            //             onError: null
                            //           }
                            //         }
                            //       }
                            //     ]
                            //   },
                            //   else: '$$field'
                            // }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $match: {
            document: {
              $elemMatch: {
                name: { $in: nameFilters },
                status: 'approved',
                fields: {
                  $elemMatch: {
                    $and: [
                      { name: { $in: dateFieldFilters } },
                      { convertedDate: { $lt: new Date() } }
                      // { $or: [{ convertedDate: { $ne: null } }, { convertedDate: { $lt: new Date() } }] }
                    ]
                  }
                }
              }
            }
          }
        },
        {
          $lookup: {
            from: 'makes',
            localField: 'makeid',
            foreignField: '_id',
            as: 'makeInfo'
          }
        },
        {
          $unwind: {
            path: '$makeInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'models',
            localField: 'model',
            foreignField: '_id',
            as: 'modelInfo'
          }
        },
        {
          $unwind: {
            path: '$modelInfo',
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $match: {
            ...(queryData.registrationnumber && {
              registrationnumber: { $regex: queryData.registrationnumber, $options: 'i' }
            }),
            ...(queryData.makeName && {
              'makeInfo.name': { $regex: queryData.makeName, $options: 'i' }
            }),
            ...(queryData.modelName && {
              'modelInfo.name': { $regex: queryData.modelName, $options: 'i' }
            })
          }
        },

        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $sort: { _id: -1 } },
              { $skip: skip },
              { $limit: perPage },
              {
                $project: {
                  registrationnumber: 1,
                  makeName: { $ifNull: ['$makeInfo.name', ''] },
                  modelName: { $ifNull: ['$modelInfo.name', ''] }
                }
              }
            ]
          }
        }
      ])

      return requestHandler.sendSuccess(
        req,
        res,
        'GET_PARTNER_DOCUMENT_EXPIRY_NOTIFY'
      )({
        vehicleList: vehicleList[0]?.data || [],
        total: vehicleList[0]?.metadata[0]?.total || 0
      })
    } catch (error) {
      console.log(error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static notifyExpiredPartners = async (req, res) => {
    try {
      const dateAfterCurrent = 3
      const checkDate = moment().add(dateAfterCurrent, 'days').format('YYYY-MM-DDT00:00:00.000[Z]')

      const nameFilters = []
      let dateFieldFilters = []

      for (const data of DocumentConfig.partner) {
        const addItems = data.fields.reduce((acc, cur) => {
          if (cur.type === 'date') {
            acc = [...acc, cur.indexName]
          }
          return acc
        }, [])
        if (addItems.length > 0) {
          nameFilters.push(data.indexName)
          dateFieldFilters = [...dateFieldFilters, ...addItems]
        }
      }

      const partnerData = await Partner.aggregate([
        {
          $match: {
            document: {
              $elemMatch: {
                name: { $in: nameFilters },
                status: 'approved',
                fields: {
                  $elemMatch: {
                    name: { $in: dateFieldFilters }
                  }
                }
              }
            }
          }
        },
        {
          $addFields: {
            document: {
              $map: {
                input: '$document',
                as: 'doc',
                in: {
                  $mergeObjects: [
                    '$$doc',
                    {
                      fields: {
                        $map: {
                          input: '$$doc.fields',
                          as: 'field',
                          in: {
                            $mergeObjects: [
                              '$$field',
                              {
                                convertedDate: {
                                  $convert: {
                                    input: '$$field.value',
                                    to: 'date',
                                    onError: null
                                  }
                                }
                              }
                            ]
                            // $cond: {
                            //   if: {
                            //     $setIsSubset: [['$$field.name'], dateFieldFilters]
                            //   },
                            //   then: {
                            //     $mergeObjects: [
                            //       '$$field',
                            //       {
                            //         convertedDate: {
                            //           $convert: {
                            //             input: '$$field.value',
                            //             to: 'date',
                            //             onError: null
                            //           }
                            //         }
                            //       }
                            //     ]
                            //   },
                            //   else: '$$field'
                            // }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $match: {
            document: {
              $elemMatch: {
                name: { $in: nameFilters },
                status: 'approved',
                fields: {
                  $elemMatch: {
                    $and: [
                      { name: { $in: dateFieldFilters } },
                      { convertedDate: { $lt: new Date() } }
                      // { $or: [{ convertedDate: { $ne: null } }, { convertedDate: { $lt: new Date() } }] }
                    ]
                  }
                }
              }
            }
          }
        }
      ])

      for (const data of partnerData) {
        for (const doc of data.document) {
          if (nameFilters?.includes(doc.name)) {
            for (const field of doc.field) {
              if (
                dateFieldFilters?.includes(field.name) &&
                Date.parse(field.convertedDate) <= Date.parse(checkDate) &&
                Date.parse(field.convertedDate) > Date.parse(moment().format())
              ) {
                const fil = Feature.partnerDocumentExpiryReasons.find((r) => r.key === doc.name)
                field.reason = field.reason ? field.reason + ' ' + fil.value : fil.value
                await NotifcationController.createNotification({
                  processType: [Enum.NOTIFICATION.TYPE.MAIL],
                  data: {
                    email: data.email,
                    subject: 'Document Expiry',
                    contentdata: {
                      NAME: data.fname,
                      DOCUMENT_NAME: doc.name,
                      DOCUEMNT_EXPIRY_DATE: moment(field.value).format('YYYY-MM-DD'),
                      APP_NAME: Config.app.name,
                      APP_EMAIL: Config.app?.email || 'support@rebustar.com',
                      APP_LOGO: Config.app.baseurl + '/public/logo.png'
                    }
                  }
                })
              } else {
                field.value = ''
              }
            }
          } else {
            throw new ValidationError('NOT_FOUND|DOCUMENT')
          }
        }
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'PARTNER_DOCUMENT_EXPIRY_NOTIFY'
      )({
        message: 'PARTNER_DOCUMENT_EXPIRY_NOTIFY',
        partners: partnerData,
        count: partnerData.length
      })
      // res.json({ msg: 'Success', partnerData, count: partnerData.length })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static notifyExpiredVehicles = async (req, res) => {
    try {
      const dateAfterCurrent = 3
      const checkDate = moment().add(dateAfterCurrent, 'days').format('YYYY-MM-DDT00:00:00.000[Z]')

      const nameFilters = []
      let dateFieldFilters = []

      for (const data of DocumentConfig.vehicle) {
        const addItems = data.fields.reduce((acc, cur) => {
          if (cur.type === 'date') {
            acc = [...acc, cur.indexName]
          }
          return acc
        }, [])
        if (addItems.length > 0) {
          nameFilters.push(data.indexName)
          dateFieldFilters = [...dateFieldFilters, ...addItems]
        }
      }

      const vehicleData = await Vehicle.aggregate([
        {
          $match: {
            document: {
              $elemMatch: {
                name: { $in: nameFilters },
                status: 'approved',
                fields: {
                  $elemMatch: {
                    name: { $in: dateFieldFilters }
                  }
                }
              }
            }
          }
        },
        {
          $addFields: {
            document: {
              $map: {
                input: '$document',
                as: 'doc',
                in: {
                  $mergeObjects: [
                    '$$doc',
                    {
                      fields: {
                        $map: {
                          input: '$$doc.fields',
                          as: 'field',
                          in: {
                            $mergeObjects: [
                              '$$field',
                              {
                                convertedDate: {
                                  $convert: {
                                    input: '$$field.value',
                                    to: 'date',
                                    onError: null
                                  }
                                }
                              }
                            ]
                            // $cond: {
                            //   if: {
                            //     $setIsSubset: [['$$field.name'], dateFieldFilters]
                            //   },
                            //   then: {
                            //     $mergeObjects: [
                            //       '$$field',
                            //       {
                            //         convertedDate: {
                            //           $convert: {
                            //             input: '$$field.value',
                            //             to: 'date',
                            //             onError: null
                            //           }
                            //         }
                            //       }
                            //     ]
                            //   },
                            //   else: '$$field'
                            // }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $match: {
            document: {
              $elemMatch: {
                name: { $in: nameFilters },
                status: 'approved',
                fields: {
                  $elemMatch: {
                    $and: [
                      { name: { $in: dateFieldFilters } },
                      { convertedDate: { $lt: new Date() } }
                      // { $or: [{ convertedDate: { $ne: null } }, { convertedDate: { $lt: new Date() } }] }
                    ]
                  }
                }
              }
            }
          }
        }
      ])

      for (const data of vehicleData) {
        for (const doc of data.document) {
          if (nameFilters?.includes(doc.name)) {
            for (const field of doc.field) {
              if (
                dateFieldFilters?.includes(field.name) &&
                Date.parse(field.convertedDate) <= Date.parse(checkDate) &&
                Date.parse(field.convertedDate) > Date.parse(moment().format())
              ) {
                const fil = Feature.vehicleDocumentExpiryReasons.find((r) => r.key === doc.name)
                console.log(fil, 'fil')
                field.reason = field.reason ? field.reason + ' ' + fil.value : fil.value
                await NotifcationController.createNotification({
                  processType: [Enum.NOTIFICATION.TYPE.MAIL],
                  data: {
                    email: 'absyogaasri@gmail.com',
                    contentdata: {
                      name: data.fname,
                      email: data.email,
                      ExpName: doc.name,
                      date: moment(field.value).format('YYYY-MM-DD'),
                      additionalDetail:
                        'Your Document is on Expiration, please upload new document to avoid deactivation of your account.'
                    },
                    description: 'vehicleDocumentExpiry'
                  }
                })
              } else {
                field.value = ''
              }
            }
          } else {
            throw new ValidationError('NOT_FOUND|DOCUMENT')
          }
        }
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'VEHICLE_DOCUMENT_EXPIRY_NOTIFY'
      )({
        message: 'VEHICLE_DOCUMENT_EXPIRY_NOTIFY',
        vehicles: vehicleData,
        count: vehicleData.length
      })
      // res.json({ msg: 'Success', partnerData, count: partnerData.length })
    } catch (error) {
      console.log(error)
    }
  }

  static updateStatus = async (req, res) => {
    try {
      const { partnerId = '', name = '', docFor = '', vehicleId = '', status = '', reason = '' } = req.body

      let docsData = []
      if (docFor == 'vehicleDocs') {
        const vehicle = await Vehicle.findOne({ _id: mongoose.Types.ObjectId(vehicleId) }).exec()
        if (!vehicle) throw new ValidationError('VEHICLE_NOT_FOUND')
        const updateVehicleDocs = await Vehicle.findOneAndUpdate(
          { _id: vehicleId, document: { $elemMatch: { name: name } } },
          {
            $set: {
              'document.$.status': status,
              'document.$.reason': reason
            }
          },
          { new: true }
        ).exec()

        if (!updateVehicleDocs) throw new ValidationError('VEHICLE_HAS_SOME_ISSUE_TO_UPDATE_THIS_STATUS')
        docsData = updateVehicleDocs.document || []
      } else {
        const partner = await Partner.findOne({ _id: mongoose.Types.ObjectId(partnerId) }).exec()
        if (!partner) throw new AuthendicationError('NOT_FOUND|PARTNER')
        const updateDocs = await Partner.findOneAndUpdate(
          { _id: partnerId, document: { $elemMatch: { name: name } } },
          {
            $set: {
              'document.$.status': status,
              'document.$.reason': reason
            }
          },
          { new: true }
        ).exec()

        if (!updateDocs) throw new AuthendicationError('PARTNER_HAS_SOME_ISSUE_TO_UPDATE_THIS_STATUS')

        docsData = updateDocs.document || []
      }
      return requestHandler.sendSuccess(req, res, 'UPDATE_STATUS')({ documents: docsData })
    } catch (error) {
      return requestHandler.sendError(req, res, Error)
    }
  }
}

export { DocumentController }
