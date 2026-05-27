/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Config } from '../config/AppConfig.js'
import { ServiceAccount } from '../config/ServiceAccount.js'
import { MailConfig } from '../config/MailConfig.js'
import { SmsConfig } from '../config/SmsConfig.js'
import { PaymentConfig } from '../config/PaymentConfig.js'
import fs from 'fs'
import path from 'path'
import { BaseService } from './BaseService.js'

class ConfigService extends BaseService {
  static getInstallationFields() {
    try {
      // const configObj = Config;
      const appDataValid = Config.app.baseurl
      const mapConfigData = Object.values(Config.mapConfig).every(
        (value) => value !== undefined && value !== null && value !== ''
      )
      const productData = Object.values(Config.productLinks).every(
        (value) => value !== undefined && value !== null && value !== ''
      )
      const firebaseConfigData = Object.values(ServiceAccount).every(
        (value) => value !== undefined && value !== null && value !== ''
      )
      const mailConfigData = Object.values(MailConfig.gateway).some((gateway) => gateway.status === true)
      const smsConfigData = Object.values(SmsConfig.gateway).some((gateway) => gateway.status === true)
      const paymentConfigData = Object.values(PaymentConfig.gateway).some(
        (gateway) => gateway.status === true
      )

      const newInstallationValue =
        appDataValid &&
        mapConfigData &&
        productData &&
        firebaseConfigData &&
        mailConfigData &&
        smsConfigData &&
        paymentConfigData
          ? 1
          : 0

      console.log(newInstallationValue, '==============')

      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/AppConfig.js`
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const updatedContent = fileContent.replace(/("installation"\s*:\s*)\d+/, `$1${newInstallationValue}`)
      // let updatedContent = fileContent.replace(/installation:\s*\d+/, `installation: ${newInstallationValue}`);
      fs.writeFileSync(filePath, updatedContent, 'utf-8')

      console.log(`Installation status updated to: ${newInstallationValue}`)
      return newInstallationValue
    } catch (error) {
      console.log('Error updating installation status')
      console.error(`Error updating installation status: ${error}`)
    }
  }
}
export { ConfigService }
