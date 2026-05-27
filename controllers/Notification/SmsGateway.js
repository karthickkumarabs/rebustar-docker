/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../BaseController.js'
import { SmsConfig } from '../../config/SmsConfig.js'

import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'

import { ConfigService } from '../../services/ConfigService.js'
// import { Template } from './Template.js'
// import Twilio from 'twilio'
import axios from 'axios'

import fs from 'fs'
import path from 'path'
import Mustache from 'mustache'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class SmsController extends BaseController {
  constructor() {
    super()
  }

  static getConfig = async (req, res) => {
    try {
      const gateway = SmsConfig.gateway
      const enabledGateway = gateway.filter(function (e) {
        return e.status === true
      })
      return requestHandler.sendSuccess(req, res, 'GET_SMSCONFIG')({ enabledGateway: enabledGateway })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateConfig = async (req, res) => {
    try {
      const gateway = [...SmsConfig.gateway]
      const givenGateway = req.body.smsGateway

      const givenGatewayIndex = gateway.findIndex((data) => data.indexName == givenGateway)
      if (givenGatewayIndex == -1) throw new Error('GATEWAY|NOT_FOUND')
      const gatewayFields = gateway[givenGatewayIndex].fields
      for (const field of gatewayFields) {
        if (req.body.hasOwnProperty(field.indexName)) {
          field.value = req.body[field.indexName]
        }
      }
      gateway[givenGatewayIndex].fields = gatewayFields

      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/SmsConfig.js`
      const fileContent = `/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const SmsConfig = ${JSON.stringify(
        {
          gateway: gateway
        },
        null,
        2
      )};
export { SmsConfig }`

      await fs.writeFileSync(filePath, fileContent)
      const installation = ConfigService.getInstallationFields()
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({ message: 'CREATED', gateway: gateway, installation })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static activegateway = async (req, res) => {
    try {
      const gateway = [...SmsConfig.gateway]
      const givenGateway = req.body.smsGateway
      const gatewayStatus = req.body.status

      // await gateway.findIndex((data) => {
      //   if (data.indexName == givenGateway) {
      //     data.isActive = gatewayStatus
      //   } else {
      //     data.isActive = false
      //   }
      // })
      gateway.forEach((data) => {
        if (data.indexName == givenGateway) {
          data.isActive = gatewayStatus
        } else {
          data.isActive = false
        }
      })
      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/SmsConfig.js`
      const fileContent = `/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const SmsConfig = ${JSON.stringify(
        {
          gateway: gateway
        },
        null,
        2
      )};
export { SmsConfig }`
      await fs.writeFileSync(filePath, fileContent)

      return requestHandler.sendSuccess(
        req,
        res,
        'GATEWAY_ACTIVE'
      )({ message: 'ACTIVATED', gateway: gateway })
    } catch (error) {
      console.log(error, 'error')
    }
  }

  static getActive = async () => {
    const response = {
      status: false,
      message: 'UNPROCESSABLE',
      data: {}
    }
    try {
      console.log('getActive')
      const smsConfigData = JSON.parse(JSON.stringify(SmsConfig.gateway)) || null
      if (!smsConfigData) throw new Error('CONTACT_ADMIN')
      const activeGatewayIndex = smsConfigData.findIndex((m) => m.isActive)
      if (activeGatewayIndex == -1) throw new Error('SMS_GATEWAY_NOT_ACTIVATED')

      const activeGateway =
        smsConfigData[activeGatewayIndex].fields.reduce((acc, { indexName, value }) => {
          return { ...acc, [indexName]: value }
        }, {}) || null
      if (!activeGateway) throw new Error('GATEWAY_NOT_CONFIGURED')
      activeGateway['gateway'] = smsConfigData[activeGatewayIndex].indexName
      response.status = true
      response.message = 'ACTIVE_GATEWAY'
      response.data = activeGateway
    } catch (error) {
      console.error('GET_ACTIVE_SMS', error)
      response.status = false
      response.message = error.message
      response.data = {}
    }
    return response
  }

  static sendSms = async (smsData) => {
    const response = {
      status: false,
      data: {},
      message: 'UNPROCESSABLE_ENTITY'
    }
    try {
      if (smsData.template) {
        if (!Template.SMSNotification[smsData.template]) throw new Error('TEMPLATE_NOT_REGISTERED')
        const bodyContent = Template.SMSNotification[smsData.template]
        console.log('bodyContent', bodyContent)
        smsData.body = Mustache.render(bodyContent, smsData.templateData || {})
      }
      if (smsData.phone) {
        smsData.phone = smsData.phone.trim()
      }

      // phCode = '91';
      smsData.phCode = smsData.phCode.toString()
      const isphCode = smsData.phCode.startsWith('+')
      if (!isphCode) smsData.phCode = '+' + smsData.phCode

      const gatewayData = await this.getActive()
      if (!gatewayData.status) throw new Error(gatewayData.message)
      if (gatewayData.data.gateway == 'twilio') {
        console.log('inside')
        const accountSid = gatewayData.data.accountSid // Your Account SID from www.twilio.com/console
        const authToken = gatewayData.data.authToken // Your Auth Token from www.twilio.com/console
        const twilioNo = gatewayData.data.phoneNo // From a valid Twilio number
        const client = new Twilio(accountSid, authToken)
        client.messages
          .create({
            body: smsData.body,
            to: smsData.phCode + smsData.phone, // Text this number
            // body: 'Hello',
            // to: '+916385260362',
            from: twilioNo // From a valid Twilio number
          })
          .then((message) => console.log(message.body, '-----------')) // sid
          .catch((err) => console.log(err))
      } else if (gatewayData.data.gateway == 'msg91') {
        const authKey = gatewayData.data.authKey // MSG91 AuthKey
        // const senderId = gatewayData.data.senderId  // e.g. 'MSGIND'
        const templateId = gatewayData.data.templateId // MSG91 Template ID
        const phCode = smsData.phCode.replace(/^\+/, '')
        // if (phCode.startsWith('+')) {
        //   phCode = phCode.slice(1)
        // }
        const recipients = [
          {
            mobiles: phCode + smsData.phone,
            var1: smsData.templateData.otp
          }
        ]
        const payload = {
          template_id: templateId,
          short_url: 0,
          recipients: recipients
        }
        const headers = {
          accept: 'application/json',
          authkey: authKey,
          'Content-Type': 'application/json'
        }
        console.log('payload', JSON.stringify(payload))
        try {
          const msg91Response = await axios.post('https://control.msg91.com/api/v5/flow', payload, {
            headers
          })

          console.log('MSG91 response:', msg91Response.data)
        } catch (err) {
          console.error('MSG91 SMS Error:', err.response?.data || err.message)
          throw new Error('MSG91_SMS_FAILED')
        }
      }
      response.status = true
      response.data = {}
      response.message = 'SMS_PROCESSED'
    } catch (error) {
      response.status = false
      response.data = {}
      response.message = error.message || response.message
    }
    return response
  }

  static testSMS = async (req, res) => {
    const body = req.body
    const smsData = {
      template: 'OTP',
      templateData: { otp: body.otp },
      phone: body.phone,
      phCode: body.phoneCode
    }
    await this.sendSms(smsData)
    return res.json({ message: 'sent' })
  }
}

export { SmsController }
