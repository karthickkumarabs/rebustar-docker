/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import { Enum } from '../../utils/Enum.js'
import { SettingsConfig } from '../../config/SettingsConfig.js'
import { Config } from '../../config/AppConfig.js'
import axios from 'axios'
import { AuthServices } from '../../services/Common/AuthService.js'
import { FirebaseServices } from '../../services/FirebaseService.js'
import { NotifcationController } from '../../controllers/Notification/Index.js'
import Customer from '../../models/Auth/Customer.js'
import Partner from '../../models/Auth/Partner.js'
import { ServiceModuleError } from '../../utils/ErrorHandler.js'
import Wallet from '../../models/Creteria/Wallet.js'
import { BaseController } from '../../controllers/BaseController.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { Logger } from '../../utils/Logger.js'
const logger = new Logger()
const requestHandler = new RequestHandler(logger)
const socialLoginSettings = SettingsConfig.menulist.find(
  (item) => item.value === Enum.SETTINGS.SOCIALLOGINSETTINGS
)

class SocialLoginController extends BaseController {
  constructor() {
    super()
  }

  static initiateGoogleLogin = async (req, res) => {
    try {
      if (!socialLoginSettings.enabled) throw new Error('MODULE_NOT_ENABLED')

      const { role = Enum.ROLES.CUSTOMER, fcmId, clientId } = req.query

      // Encode multiple values into state (as JSON string then base64)
      const stateData = JSON.stringify({ role, fcmId, clientId })
      const encodedState = Buffer.from(stateData).toString('base64')

      const redirectUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${Config.socialLogin.google.clientId}` +
        `&redirect_uri=${Config.socialLogin.google.clientCallbackUrl}` +
        `&response_type=code&scope=profile email` +
        `&state=${encodeURIComponent(encodedState)}`

      return res.redirect(redirectUrl)
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }

  static getUserDetailsUsingGoogle = async (req, res) => {
    const { code, state } = req.query
    let response = {
      message: 'SUCCESS'
    }
    let responseMessage = 'SUCCESS'
    try {
      // Decode state
      const decodedState = Buffer.from(state, 'base64').toString('utf-8')
      const { role, fcmId, clientId } = JSON.parse(decodedState)
      const tokenRes = await axios.post(
        `https://oauth2.googleapis.com/token`,
        {
          code,
          client_id: Config.socialLogin.google.clientId,
          client_secret: Config.socialLogin.google.clientSecret,
          redirect_uri: Config.socialLogin.google.clientCallbackUrl,
          grant_type: 'authorization_code'
        },
        { headers: { 'Content-Type': 'application/json' } }
      )

      // const { access_token } = tokenRes.data;
      const accessToken = tokenRes.data.access_token

      const userRes = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!userRes) throw new ServiceModuleError('SOMETHING_WENT_WRONG')

      if (role == Enum.ROLES.PARTNER) {
        let firebaseToken
        let existPartner = await Partner.findOne({ email: userRes.data.email })

        if (!existPartner) {
          const module = await AuthServices.uniCodeGenerator('Partner')
          if (!module.status) throw new ValidationError('MODULE_CODE_NOT_GENERATED')
          const newPartner = new Partner({
            uniCode: module.data.code,
            fname: userRes.data.name,
            email: userRes.data.email,
            currency: Config.app.currency,
            emailVerified: true,
            phoneVerified: false,
            fcmId: fcmId,
            deviceId: clientId
          })
          existPartner = await newPartner.save()

          const pWallet = new Wallet({
            userId: existPartner._id
          })
          await pWallet.save()

          firebaseToken = await FirebaseServices.authToken(existPartner._id)
          const partnerObj = {
            status: 'free'
          }
          await FirebaseServices.partnerFbStatus('ADD', existPartner._id, partnerObj)
          await NotifcationController.createNotification({
            processType: [Enum.NOTIFICATION.TYPE.MAIL],
            data: {
              email: existPartner.email,
              contentdata: { name: existPartner.fname },
              subject: 'Partner Welcome'
            }
          })
        }

        const tokenData = {
          userId: existPartner._id,
          email: existPartner.email,
          name: existPartner.fname,
          role: Enum.ROLES.PARTNER,
          deviceId: existPartner.deviceId
        }
        const loginToken = await existPartner.generateJwt(tokenData)
        responseMessage = 'CREATE_PARTNER'
        response = {
          message: 'CREATED|PARTNER',
          partner: existPartner,
          Pwallet: wallet,
          token: loginToken,
          firebaseToken: firebaseToken
        }
      } else if (role == Enum.ROLES.CUSTOMER) {
        let existCustomer = await Customer.findOne({ email: userRes.data.email })
        let firebaseToken

        if (!existCustomer) {
          // AVOID DUPLICATE REGISTRATION
          const module = await AuthServices.uniCodeGenerator('Customer')
          if (!module.status) throw new ValidationError('MODULE_CODE_NOT_GENERATED')

          const newCustomer = new Customer({
            uniCode: module.data.code,
            fname: userRes.data.name,
            email: userRes.data.email,
            currency: Config.app.currency,
            emailVerified: true,
            phoneVerified: false,
            fcmId: fcmId,
            deviceId: clientId
          })
          existCustomer = await newCustomer.save()
          const customerObj = {
            status: 'free'
          }
          await FirebaseServices.customerFbStatus('ADD', existCustomer._id, customerObj)
          firebaseToken = await FirebaseServices.authToken(existCustomer._id)
          await NotifcationController.createNotification({
            processType: [Enum.NOTIFICATION.TYPE.MAIL],
            data: {
              email: existCustomer.email,
              contentdata: { name: existCustomer.fname },
              subject: 'Customer Welcome'
            }
          })
        }

        const tokenData = {
          userId: existCustomer._id,
          email: existCustomer.email,
          name: existCustomer.fname,
          role: Enum.ROLES.CUSTOMER,
          deviceId: existCustomer.deviceId
        }
        const loginToken = await existCustomer.generateJwt(tokenData)

        responseMessage = 'CREATE_CUSTOMER'
        response = {
          message: 'CREATED|CUSTOMER',
          customer: existCustomer,
          token: loginToken,
          firebaseToken: firebaseToken
        }
      }
      return requestHandler.sendSuccess(req, res, responseMessage)(response)
    } catch (error) {
      console.log('error', error)
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { SocialLoginController }
