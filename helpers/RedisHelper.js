/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import Redis from '../server/Redis.js'
import { Enum } from '../utils/Enum.js'

export class RedisHelper {
  constructor(key) {
    this.Redis = new Redis()
  }

  __addServiceRequestUser(data) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then((connectRedis) => {
          const keyIndex = `${Enum.SOCKET.SERVICE}:${data.userId}:${Enum.SOCKET.REQUEST}`
          return connectRedis.get(keyIndex).then((checkExist) => {
            if (!checkExist || checkExist !== data.socketId) {
              return connectRedis
                .del(keyIndex)
                .then(() => connectRedis.set(keyIndex, data.socketId))
                .then(() => data.socketId)
            }
            return checkExist
          })
        })
        .then((checkExist) => resolve(checkExist))
        .catch((error) => {
          console.log(error)
          reject(error.message)
        })
    })
  }

  __getServiceRequestUser(data) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then((connectRedis) => {
          const keyIndex = `${Enum.SOCKET.SERVICE}:${data.userId}:${Enum.SOCKET.REQUEST}`
          return connectRedis.get(keyIndex)
        })
        .then((checkExist) => {
          if (!checkExist) {
            checkExist = null // handle case where key doesn't exist
          }
          resolve(checkExist)
        })
        .catch((error) => {
          reject(error.message) // handle any error that occurs
        })
    })
  }

  __deleteServiceRequestUser(data) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then((connectRedis) => {
          const keyIndex = `${Enum.SOCKET.SERVICE}:${data.userId}:${Enum.SOCKET.REQUEST}`
          return connectRedis.get(keyIndex)
        })
        .then((checkExist) => {
          if (checkExist) {
            return this.Redis.getConnection().then((connectRedis) =>
              connectRedis.del(`${Enum.SOCKET.SERVICE}:${data.userId}:${Enum.SOCKET.REQUEST}`)
            )
          }
          return checkExist
        })
        .then(() => {
          resolve(null) // Resolve with null after deletion
        })
        .catch((error) => {
          reject(error.message)
        })
    })
  }

  __addChatUser(user) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then((connectRedis) => {
          const keyIndex = `users:${user.userId}:channel`
          return connectRedis.get(keyIndex)
        })
        .then((checkExist) => {
          if (!checkExist || checkExist !== user.socketId) {
            return this.Redis.getConnection().then((connectRedis) => {
              return connectRedis
                .del(`users:${user.userId}:channel`)
                .then(() => connectRedis.set(`users:${user.userId}:channel`, user.socketId))
                .then(() => user.socketId)
            })
          }
          return checkExist
        })
        .then((finalCheckExist) => {
          resolve(finalCheckExist)
        })
        .catch((error) => {
          console.log(error)
          reject(error.message)
        })
    })
  }

  __getChatUser(user) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then(async (connectRedis) => {
          try {
            const keyIndex = `users:${user.userId}:channel`
            let checkExist = await connectRedis.get(keyIndex)

            if (!checkExist) {
              checkExist = null
            }

            resolve(checkExist)
          } catch (error) {
            reject(error.message)
          }
        })
        .catch((error) => {
          reject(error.message)
        })
    })
  }

  __deleteChatUser(user) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then(async (connectRedis) => {
          try {
            const keyIndex = `users:${user.userId}:channel`
            let checkExist = await connectRedis.get(keyIndex)

            if (checkExist) {
              await connectRedis.del(keyIndex)
              checkExist = null
            }

            resolve(checkExist)
          } catch (error) {
            reject(error.message)
          }
        })
        .catch((error) => {
          reject(error.message)
        })
    })
  }

  __addLocation(data) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then(async (connectRedis) => {
          try {
            const keyIndex = `${Enum.SOCKET.SERVICE}:${data.userId}:${Enum.SOCKET.LOCATION}`
            let checkExist = await connectRedis.get(keyIndex)

            if (!checkExist || checkExist !== data.socketId) {
              await connectRedis.del(keyIndex)
              await connectRedis.set(keyIndex, data.socketId)
              checkExist = data.socketId
            }

            resolve(checkExist)
          } catch (error) {
            reject(error.message)
          }
        })
        .catch((error) => {
          reject(error.message)
        })
    })
  }

  __getLocation(data) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then(async (connectRedis) => {
          try {
            const keyIndex = `${Enum.SOCKET.SERVICE}:${data.userId}:${Enum.SOCKET.LOCATION}`
            let checkExist = await connectRedis.get(keyIndex)

            if (!checkExist) {
              checkExist = null
            }

            resolve(checkExist)
          } catch (error) {
            reject(error.message)
          }
        })
        .catch((error) => {
          reject(error.message)
        })
    })
  }

  __deleteLocation(data) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then(async (connectRedis) => {
          try {
            const keyIndex = `${Enum.SOCKET.SERVICE}:${data.userId}:${Enum.SOCKET.LOCATION}`
            let checkExist = connectRedis.get(keyIndex)
            if (checkExist) {
              await connectRedis.del(keyIndex)
              checkExist = null
            }
            return resolve(checkExist)
          } catch (error) {
            return reject(error.message)
          }
        })
        .catch((error) => {
          reject(error.message)
        })
    })
  }

  __setCache(key, data) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then(async (connectRedis) => {
          try {
            data = typeof data == 'object' ? JSON.stringify(data) : data
            const result = await connectRedis.set(key, data)
            return resolve(result)
          } catch (error) {
            return reject(error.message)
          }
        })
        .catch((error) => {
          reject(error.message)
        })
    })
  }

  __getCache(key) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then(async (connectRedis) => {
          try {
            let checkExist = connectRedis.get(key)
            if (!checkExist) {
              checkExist = null
            }
            return resolve(checkExist)
          } catch (error) {
            return reject(error.message)
          }
        })
        .catch((error) => {
          reject(error.message)
        })
    })
  }

  __delCache(key) {
    return new Promise((resolve, reject) => {
      this.Redis.getConnection()
        .then(async (connectRedis) => {
          try {
            const result = await connectRedis.del(key)
            return resolve(result)
          } catch (error) {
            return reject(error.message)
          }
        })
        .catch((error) => {
          reject(error.message)
        })
    })
  }

  async __acquireRequestLock(requestId, partnerId, lockDuration = 3000) {
    const lockKey = `REQUEST_LOCK:${requestId.toString()}`
    const lockValue = partnerId.toString()
    // Try to acquire the lock with a unique value and expiration
    const connectRedis = await this.Redis.getConnection()
    const success = await connectRedis.set(lockKey, lockValue, {
      NX: true, // Only set the key if it does not already exist
      PX: lockDuration // Lock expires after the specified duration (in milliseconds)
    })
    console.log('lockkey', lockKey, 'lockValue', lockValue, 'success', success)
    // const success = await connectRedis.set(lockKey, lockValue, 'NX', 'EX',lockDuration)
    return success ? true : false // Returns true if the lock was acquired
  }
}
