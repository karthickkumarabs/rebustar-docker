/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import App from './../../server/App.js'
import { Server } from 'socket.io'
import { createClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'

// To handle pm2 multiple cluster mode
const pubClient = createClient({ url: 'redis://redis:6379' })
const subClient = pubClient.duplicate()
await Promise.all([pubClient.connect(), subClient.connect()])

const SocketIO = new Server(App)
SocketIO.adapter(createAdapter(pubClient, subClient))

SocketIO.on('connection', async (socket) => {
  try {
    console.log('iam joined')
  } catch (error) {
    console.log('Connection error:', error)
    socket.disconnect(error.message)
  }
})

export { SocketIO }
