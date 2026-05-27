/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { ServiceConfig } from '../../config/ServiceConfig.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { BaseController } from '../BaseController.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const configPath = path.resolve(__dirname, '../../config/ServiceConfig.js')

export class PartnerServiceConfigController extends BaseController {
  constructor() {
    super()
  }

  // GET only basics & service
  static getServiceConfig = async (req, res) => {
    try {
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_SERVICE_CONFIG'
      )({
        message: 'Config fetched successfully',
        config: {
          basics: ServiceConfig.basics,
          service: ServiceConfig.service
        }
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateServiceConfig = async (req, res) => {
    try {
      const { basics, service } = req.body

      if (!basics && !service) {
        return requestHandler.sendError(req, res, 'Missing basics or service fields')
      }

      const currentConfig = ServiceConfig

      const updatedBasics = basics ? { ...currentConfig.basics, ...basics } : currentConfig.basics

      const updatedService =
        service && Array.isArray(service)
          ? currentConfig.service.map((s) => {
              const match = service.find(
                (incoming) => incoming.slug === s.slug && typeof incoming.status === 'boolean'
              )
              return match ? { ...s, status: match.status } : s
            })
          : currentConfig.service

      const updatedConfig = {
        ...currentConfig,
        basics: updatedBasics,
        service: updatedService
      }

      fs.writeFileSync(
        configPath,
        `export const ServiceConfig = ${JSON.stringify(updatedConfig, null, 2)};\n`
      )

      return requestHandler.sendSuccess(
        req,
        res,
        'CONFIG_UPDATED'
      )({
        message: 'Config updated successfully',
        config: {
          basics: updatedConfig.basics,
          service: updatedConfig.service
        }
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}
