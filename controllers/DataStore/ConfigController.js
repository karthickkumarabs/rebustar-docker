/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import { BaseController } from '../BaseController.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
import { Config } from '../../config/AppConfig.js'
import { ServiceConfig } from '../../config/ServiceConfig.js'
// import { ServiceAccount } from '../../config/ServiceAccount.js'
import { CreteriaService } from '../../services/Creteria/CreteriaServices.js'
import fs from 'fs'
import path from 'path'
import { Enum } from '../../utils/Enum.js'
import { ConfigService } from '../../services/ConfigService.js'
import { SettingsConfig } from '../../config/SettingsConfig.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ConfigController extends BaseController {
  constructor() {
    super()
  }

  static getConfiguration = async (req, res) => {
    try {
      const configData = {
        installation: Config.installation,
        app: {
          name: Config.app.name,
          language: Config.app.language,
          phoneCode: Config.app.phoneCode,
          currency: Config.app.currency,
          currencyCode: Config.app.currencyCode,
          utcOffset: Config.app.utcOffset,

          logo: Config.app.logo,
          favicon: Config.app.favicon,
          baseurl: Config.app.baseurl,
          distanceMetric: Config.app.distanceMetric
        },
        locale: Config.locale,
        mapConfig: {
          mapId: Config.mapConfig.mapId,
          websiteKey: Config.mapConfig.websiteKey,
          serverKey: Config.mapConfig.serverKey,
          androidKey: Config.mapConfig.androidKey,
          iosKey: Config.mapConfig.iosKey
        },
        productLinks: {
          shareTrip: Config.productLinks.shareTrip,
          androidCustomer: Config.productLinks.androidCustomer,
          androidPartner: Config.productLinks.androidPartner,
          iosCustomer: Config.productLinks.iosCustomer,
          iosPartner: Config.productLinks.iosPartner
        },
        socialLinks: [Config.socialLinks]
      }
      return requestHandler.sendSuccess(req, res, 'GET_ALL_CONFIG')({ message: 'SUCCESS', data: configData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateAppConfig = async (req, res) => {
    try {
      const body = req.body
      const configObj = Config

      const localeArr =
        body.locale && body.locale != '' ? configObj.locale.concat(body.locale.split(',')) : configObj.locale
      configObj.app.name = body.name || configObj.app.name
      configObj.app.language = body.language || configObj.app.language
      configObj.app.phoneCode = body.phoneCode || configObj.app.phoneCode
      configObj.app.currency = body.currency || configObj.app.currency
      configObj.app.currencyCode = body.currencyCode || configObj.app.currencyCode
      configObj.app.baseurl = body.baseurl || configObj.app.baseurl
      configObj.app.shareTrip = body.shareTrip || configObj.app.shareTrip
      configObj.app.logo = 'public/logo.png'
      configObj.app.favicon = 'public/favicon.ico'

      if (
        body.distanceMetric &&
        [
          Enum.TRIP.DISTANCEMETRIC.METER,
          Enum.TRIP.DISTANCEMETRIC.KILOMETER,
          Enum.TRIP.DISTANCEMETRIC.MILE
        ].includes(body.distanceMetric)
      )
        configObj.app.distanceMetric = body.distanceMetric || configObj.app.distanceMetric

      configObj.mapConfig.mapId = body.mapId || configObj.mapConfig.mapId
      configObj.mapConfig.websiteKey = body.websiteKey || configObj.mapConfig.websiteKey
      configObj.mapConfig.serverKey = body.serverKey || configObj.mapConfig.serverKey
      configObj.mapConfig.androidKey = body.androidKey || configObj.mapConfig.androidKey
      configObj.mapConfig.iosKey = body.iosKey || configObj.mapConfig.iosKey

      Config.productLinks.shareTrip = body.shareTrip || configObj.productLinks.shareTrip
      Config.productLinks.androidCustomer = body.androidCustomer || configObj.productLinks.androidCustomer
      Config.productLinks.androidPartner = body.androidPartner || configObj.productLinks.androidPartner
      Config.productLinks.iosCustomer = body.iosCustomer || configObj.productLinks.iosCustomer
      Config.productLinks.iosPartner = body.iosPartner || configObj.productLinks.iosPartner

      if (req.files && req.files.length > 0) {
        // Logo Update
        const logoPath = req.files.find((elem) => elem.fieldname == 'logoPath')
        if (logoPath) {
          console.log(' logoPath', logoPath)
          console.log(' logoPath.path', logoPath.path)

          await CreteriaService.moveFile(logoPath.path, '/public/logo.png')
          configObj.app.logo = '/public/logo.png'
        }
        // Logo Update
        const faviconPath = req.files.find((elem) => elem.fieldname == 'faviconPath')
        if (faviconPath) {
          await CreteriaService.moveFile(faviconPath.path, '/public/favicon.ico')
          configObj.app.favicon = '/public/favicon.ico'
        }
      }

      configObj.locale = localeArr
      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/AppConfig.js`
      const fileContent = `
      /* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
    const Config = ${JSON.stringify(configObj, null, 2)}
    export { Config }`

      await fs.writeFileSync(filePath, fileContent)
      const configData = {
        installation: ConfigService.getInstallationFields(),
        app: {
          name: Config.app.name,
          language: Config.app.language,
          phoneCode: Config.app.phoneCode,
          currency: Config.app.currency,
          currencyCode: Config.app.currencyCode,
          utcOffset: Config.app.utcOffset,

          logo: Config.app.logo,
          favicon: Config.app.favicon,
          baseurl: Config.app.baseurl,
          shareTrip: Config.app.shareTrip
        },
        locale: Config.locale,
        mapConfig: {
          mapId: Config.mapConfig.mapId,
          websiteKey: Config.mapConfig.websiteKey,
          serverKey: Config.mapConfig.serverKey,
          androidKey: Config.mapConfig.androidKey,
          iosKey: Config.mapConfig.iosKey
        },
        productLinks: {
          shareTrip: Config.productLinks.shareTrip,
          androidCustomer: Config.productLinks.androidCustomer,
          androidPartner: Config.productLinks.androidPartner,
          iosCustomer: Config.productLinks.iosCustomer,
          iosPartner: Config.productLinks.iosPartner
        }
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({ message: 'UPDATED', configuration: configData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getFirbaseConfig = async (req, res) => {
    try {
      // Need to Mask information
      // const serviceAccount = {
      //   type: ServiceAccount.type,
      //   project_id: ServiceAccount.project_id,
      //   private_key_id: ServiceAccount.private_key_id,
      //   private_key: ServiceAccount.private_key,
      //   client_email: ServiceAccount.client_email,
      //   client_id: ServiceAccount.client_id,
      //   auth_uri: ServiceAccount.auth_uri,
      //   token_uri: ServiceAccount.token_uri,
      //   auth_provider_x509_cert_url: ServiceAccount.auth_provider_x509_cert_url,
      //   client_x509_cert_url: ServiceAccount.client_x509_cert_url,
      //   universe_domain: ServiceAccount.universe_domain
      // }
      const serviceAccount = {
        type: '***',
        project_id: '***',
        private_key_id: '***',
        private_key: '***',
        client_email: '***',
        client_id: '***',
        auth_uri: '***',
        token_uri: '***',
        auth_provider_x509_cert_url: '***',
        client_x509_cert_url: '***',
        universe_domain: '***'
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_ALL_CONFIG'
      )({ message: 'SUCCESS', data: { serviceAccount } })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateFirbaseConfig = async (req, res) => {
    try {
      // throw new Error('DEMO_VERSION')

      const data = req.body

      if (!data.project_id || !data.private_key || !data.client_email) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Firebase service account payload'
        })
      }

      data.private_key = data.private_key.replace(/\\n/g, '\n')

      const filePath = path.join(process.cwd(), 'config', 'ServiceAccount.js')

      const content = `/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

export const ServiceAccount = ${JSON.stringify(data, null, 2)}
`

      fs.writeFileSync(filePath, content, { encoding: 'utf8' })

      return requestHandler.sendSuccess(req, res, 'UPDATED_FIREBASE_CONFIG')({ message: 'SUCCESS' })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getDatas = async (req, res) => {
    try {
      const queryData = req.query

      const responseData = {}
      if (!queryData.required || queryData.required?.includes('app')) {
        responseData['app'] = {
          name: Config.app.name,
          logo: Config.app.logo,
          favicon: Config.app.favicon,
          baseurl: Config.app.baseurl,
          distanceMetric: Config.app.distanceMetric
        }
      }

      if (!queryData.required || queryData.required?.includes('mapConfig')) {
        responseData['mapConfig'] = Config.mapConfig
      }

      if (!queryData.required || queryData.required?.includes('productLinks')) {
        responseData['productLinks'] = Config.productLinks
      }
      if (!queryData.required || queryData.required?.includes('socialLinks')) {
        responseData['socialLinks'] = Config.socialLinks
      }

      return requestHandler.sendSuccess(req, res, 'GET_ALL_CONFIG')({ message: 'SUCCESS', ...responseData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateServices = async (req, res) => {
    try {
      const body = req.body
      const servicedata = body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/ServiceConfig.js`
      const fileContent = `
      /* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
    const ServiceConfig = ${JSON.stringify(servicedata, null, 2)} 
    export { ServiceConfig }`

      await fs.writeFileSync(filePath, fileContent)
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({ message: 'UPDATED', servicedata: servicedata })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getServices = async (req, res) => {
    try {
      const ServiceObj = ServiceConfig
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({ message: 'UPDATED', servicedata: ServiceObj })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  // social links

  static addorupdateSocialLink = async (req, res) => {
    try {
      const body = JSON.parse(JSON.stringify(req.body))

      const configObj = Config // Use the config object directly
      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/AppConfig.js`

      // Asynchronously read the file content
      const fileContent = await fs.readFileSync(filePath, 'utf-8')

      if (req.files && req.files.length > 0) {
        body.icon = req.files[0].path
        const moveFile = await CreteriaService.moveFile(req.files[0].path, req.files[0].path)
        if (!moveFile.status) throw new Error(moveFile.message)
      }

      // Check if the social link exists and update or add it
      const existingLinkIndex = configObj.socialLinks.findIndex((link) => link.name === body.name)
      if (existingLinkIndex !== -1) {
        const existingContent = configObj.socialLinks[existingLinkIndex]
        configObj.socialLinks[existingLinkIndex] = {
          ...existingContent,
          ...body,
          icon: body.icon || existingContent.icon
        }
      } else {
        configObj.socialLinks.push(body)
      }

      console.log(configObj, '===========')

      const newContentJs = fileContent.replace(
        /const Config = {[\s\S]*?};/,
        `const Config = ${JSON.stringify(configObj, null, 2)};`
      )

      console.log('Updated Content:\n', newContentJs)

      // Asynchronously write the updated content to the file
      await fs.writeFileSync(filePath, newContentJs, 'utf-8')

      return requestHandler.sendSuccess(
        req,
        res,
        ''
      )({
        message:
          existingLinkIndex !== -1 ? 'SOCIAL_LINK_UPDATED_SUCCESSFULLY' : 'SOCIAL_LINK_ADDED_SUCCESSFULLY',
        socialLink: body
      })
    } catch (error) {
      console.log('==================error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static deleteSocialLink = async (req, res) => {
    try {
      const name = req.params.name || req.body.name

      const configObj = Config
      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/AppConfig.js`
      const fileContent = fs.readFileSync(filePath, 'utf-8')

      const existingLinkIndex = configObj.socialLinks.findIndex((link) => link.name === name)
      if (existingLinkIndex === -1) {
        throw new Error('Social link not found')
      }

      const removedLink = configObj.socialLinks.splice(existingLinkIndex, 1)
      const iconPath = removedLink[0].icon
      if (iconPath && fs.existsSync(iconPath)) {
        fs.unlinkSync(iconPath)
      }
      const updatedContent = fileContent.replace(
        /("socialLinks":\s*)\[[\s\S]*?\]/,
        `"socialLinks": ${JSON.stringify(configObj.socialLinks, null, 2)}`
      )
      fs.writeFileSync(filePath, updatedContent)

      return requestHandler.sendSuccess(
        req,
        res,
        'DELETE_SOCIAL_LINKS'
      )({ message: 'SOCIAL_LINK_DELETED_SUCCESSFULLY', deletedSocialLink: removedLink[0] })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getSettings = async (req, res) => {
    try {
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_SETTINGS_CONFIG'
      )({ message: 'SUCCESS', data: SettingsConfig })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { ConfigController }
