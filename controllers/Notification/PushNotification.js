/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import { GoogleAuth } from 'google-auth-library'
import axios from 'axios'
import { ServiceAccount } from '../../config/ServiceAccount.js'
class PushNotification {
  constructor() {
    if (!PushNotification.instance) {
      // If instance doesn't exist, create it
      // Create Initial Date & Token
      // this.setDate()
      // this.setToken()
      this.token = null
      this.createdAt = null
      PushNotification.instance = this
    }

    // Return the existing instance
    // return PushNotification.instance
  }

  async init() {
    try {
      await this.getToken()
    } catch (error) {
      console.error('INITIALIZATION_ERROR:', error.message)
    }
  }

  getToken = async () => {
    try {
      let presentToken = this.token
      const lastDate = this.getCreatedAt()
      const nowDate = new Date().getTime()
      if (this.createdAt == null || presentToken == null || lastDate < nowDate) {
        presentToken = await this.setToken()
      }
      // console.log(`Token : ${presentToken},\n,Created At : ${lastDate},\n,Now Date : ${nowDate},\n`)
      return presentToken
    } catch (error) {
      console.error('GET_TOKEN_ERROR: ', error)
      return null
    }
  }

  generateToken = async () => {
    try {
      const setAuth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        credentials: ServiceAccount
      })
      const getClient = await setAuth.getClient()
      const getAccessToken = await getClient.getAccessToken()
      return getAccessToken.token
    } catch (error) {
      console.error('GENERATE_TOKEN_ERROR: ', error)
      return null
    }
  }

  setToken = async () => {
    try {
      const getToken = await this.generateToken()
      this.setDate()
      this.token = getToken
    } catch (error) {
      console.error('SET_TOKEN_ERROR: ', error)
      this.token = null
    }
    return this.token
  }

  getCreatedAt = () => {
    return this.createdAt
  }

  setDate = () => {
    const currentDate = new Date()
    // Here we add 50 minutes interval for generating new token
    const addOneHour = currentDate.setTime(currentDate.getTime() + 50 * 60 * 1000)
    this.createdAt = addOneHour
  }

  sendNotification = async (notify) => {
    try {
      const { pushToken = null, data = {}, template = '' } = notify

      if (!pushToken) {
        console.warn('Missing pushToken, skipping notification.')
        return false
      }

      const endPoint = `https://fcm.googleapis.com/v1/projects/${ServiceAccount.project_id}/messages:send`

      const authToken = await this.getToken()
      if (!authToken) throw new Error('AUTHENTICATION_FAILED')

      const tokens = (Array.isArray(pushToken) ? pushToken : [pushToken]).filter(
        (token) => typeof token === 'string' && token.trim().length > 0
      ) // normalize to array
      console.log('tokens____', tokens)
      for (const token of tokens) {
        console.log('token', token)
        const message = {
          message: {
            token: token,
            notification: {
              body: data.body,
              title: data.title
            }
          }
        }

        if (template === 'partnerRequest') {
          message.message.android = {
            notification: {
              sound: 'requesting_tone.mp3'
            }
          }
          message.message.apns = {
            payload: {
              aps: {
                sound: 'requesting_tone.mp3'
              }
            }
          }
        }
        console.log('message', JSON.stringify(message))
        const headers = {
          Authorization: `Bearer ${authToken}`
        }
        try {
          const sendRequest = await axios.post(endPoint, message, { headers })
          console.log(
            `✅ Notification sent to token: ${token}`,
            JSON.stringify({ status: sendRequest?.status, body: sendRequest?.data })
          )
        } catch (err) {
          const errMsg = err.response?.data?.error?.message || err.message
          const status = err.response?.status

          if (status === 404) {
            console.warn(`Invalid or unregistered FCM token: ${notify.pushToken}`)
            // Optional: remove token from DB
          }
          console.warn(`❌ Failed to send to ${token}: ${errMsg}`)
        }
      }
      return true
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message
      console.error('SEND_NOTIFICATION_ERROR:', errMsg)
      return false
    }
  }
}

export const pushNotification = new PushNotification()
