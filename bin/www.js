/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
// import * as http from 'http'
import App from '../server/App.js'
import { Config } from '../config/AppConfig.js'
import { Logger } from '../utils/Logger.js'

import '../modules/Socket/ServiceRequest.js'
import '../modules/Socket/ChatRequest.js'
import '../modules/Socket/BiddingRequest.js'

const logger = new Logger()

/**
 * Normalize Port Number.
 **/

function normalizePort(val) {
  const port = parseInt(val, 10)

  if (Number.isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}

/**
 * Event listener for HTTP server "error" event.
 **/

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.log(`${bind} requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      logger.log(`${bind} is already in use`)
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 **/

function onListening() {
  const addr = App.address()
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`

  logger.log(`the server started listining on port ${bind}`, 'info')
}

/**
 * Get port from environment and store in Express.
 **/

const port = normalizePort(process.env.DEV_APP_PORT || Config.app.port)
// App.set('port', port)

/**
 * Listen on provided port, on all network interfaces.
 **/

App.listen(port)
App.on('error', onError)
App.on('listening', onListening)
