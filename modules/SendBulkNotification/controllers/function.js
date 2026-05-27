/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import axios from 'axios'
import { GoogleAuth } from 'google-auth-library'

import { BaseController } from '../../../controllers/BaseController.js'
import { ServiceAccount } from '../../../config/ServiceAccount.js'
import BulkpushNotificationSchema from '../models/BulkPushNotification.js'
import { getMessaging } from 'firebase-admin/messaging'

class FCMController extends BaseController {
  constructor() {
    super()
    if (!PushNotification.instance) {
      // If instance doesn't exist, create it
      // Create Initial Date & Token
      // this.setDate()
      // this.setToken()
      this.token = null
      this.createdAt = null
      PushNotification.instance = this
    }
  }
  async init() {
    try {
      await this.getToken()
    } catch (error) {
      console.error('INITIALIZATION_ERROR:', error.message)
    }
  }

  static async getToken() {
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
  static async getCreatedAt() {
    return this.createdAt
  }

  static async setToken() {
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
  static async setDate() {
    const currentDate = new Date()
    // Here we add 50 minutes interval for generating new token
    const addOneHour = currentDate.setTime(currentDate.getTime() + 50 * 60 * 1000)
    this.createdAt = addOneHour
  }

  static async generateToken() {
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

  static async sendBulkFCMMsg(pushToken, msg, title, imageUrl) {
    try {
      const endPoint = `https://fcm.googleapis.com/v1/projects/${ServiceAccount.project_id}/messages:send`
      const authToken = await this.getToken()
      if (!authToken) throw new Error('AUTHENDICATION_FAILED')
      const message = {
        message: {
          token: pushToken,
          notification: {
            body: title,
            title: msg
          },
          data: {
            imageUrl: imageUrl
          }
        }
      }

      const headers = {
        Authorization: `Bearer ${authToken}`
      }
      console.log('authToken', authToken, message, endPoint)

      const sendRequest = await axios.post(endPoint, message, { headers })
      console.log(
        'sendNotification Success: ',
        JSON.stringify({ status: sendRequest?.status, body: sendRequest?.data })
      )
      return true
    } catch (error) {
      console.error('SEND_NOTIFICATION_ERROR:', error)
      return false
    }
  }
  // take multiple token and send notification
  static async SendOneTimeBulkPush(pushToken, msg, title, imageUrl) {
    try {
      const message = {
        message: {
          notification: {
            body: title,
            title: msg
          },
          data: {
            imageUrl: imageUrl
          }
        },
        tokens: pushToken
      }

      getMessaging()
        .sendEachForMulticast(message)
        .then((response) => {
          console.log(response.successCount + ' messages were sent successfully')
        })
        .catch((err) => {
          console.log('bulk message error', err)
        })

      return true
    } catch (error) {
      console.error('SEND_NOTIFICATION_ERROR:', error)
      return false
    }
  }

  static backupdata(data) {
    console.log(data)
    const newDoc = new BulkpushNotificationSchema(data)
    return newDoc.save()
  }

  // sms
  static sendSMS(docs, message, isPartner) {
    docs.forEach((element) => {
      const name = element.name || 'Unknown'
      const id = element._id?.toString() || 'N/A'

      console.log(
        `[SMS Notification] Sending to ${
          isPartner ? 'Partner' : 'Customer'
        } - Name: ${name}, ID: ${id}, Phone: ${element.phone}`
      )

      smsGateway.sendSmsMsg(element.phone, message, element.phCode, '')
    })
  }
}

export default FCMController
