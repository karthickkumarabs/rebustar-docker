/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import redis from 'redis'
class Redis {
  constructor() {
    this.host = process.env.REDIS_HOST || 'rebustar-redis'
    this.port = process.env.REDIS_PORT || '6379'
    this.connected = false
    this.connection = null
    this.client = null
  }

  async getConnection() {
    if (this.connected) return this.client
    else {
      this.client = redis.createClient({
        host: this.host,
        port: this.port
      })
      await this.client.connect()
      this.connected = true
      return this.client
    }
  }
}

// This will be a singleton class. After first connection npm will cache this object for whole runtime.
// Every time you will call this getConnection() you will get the same connection back
export default Redis
