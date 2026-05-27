/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as http from 'http'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import compression from 'compression'
import { Router } from '../routes/index.js'
import { Mongo } from './Mongo.js'
import path from 'path'
import i18n from 'i18n'
import { Config } from '../config/AppConfig.js'
import { initEncryption } from './encryption.js'

import { RequestHandler } from '../utils/RequestHandler.js'
import { Logger } from '../utils/Logger.js'

// eslint-disable-next-line no-unused-vars
import * as Cron from './Cron.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

const expressApp = express()
const __dirname = path.resolve()

const shouldCompress = (req, res) => {
  if (req.headers['x-no-compression']) {
    return false
  }
  return compression.filter(req, res)
}

const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
}
const compressionOptions = {
  filter: shouldCompress,
  threshold: 0
}

i18n.configure({
  locales: ['en', 'fr', 'ta'],
  directory: __dirname + '/locale'
})

expressApp.use(bodyParser.json({ limit: '50mb' }))
expressApp.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
expressApp.use(cors(corsOptions))
expressApp.use(compression(compressionOptions))
expressApp.use('/public', express.static(path.join(__dirname, 'public')))

expressApp.use((req, res, next) => {
  if (req.headers['accept-language'] && Config.locale.includes(req.headers['accept-language'])) {
    const lang = req.headers['accept-language'] ? req.headers['accept-language'] : 'en'
    i18n.setLocale(lang)
  } else {
    i18n.setLocale('en')
  }
  next()
})

Mongo()
if (Config.isEncrypt) initEncryption()

expressApp.use(Router)

expressApp.get('/', function (req, res) {
  res.sendFile('./public/static-html/response.html', { root: '.' })
})

expressApp.use((error, req, res, next) => {
  return requestHandler.sendError(req, res, error)
})

const App = http.createServer(expressApp)

export default App
