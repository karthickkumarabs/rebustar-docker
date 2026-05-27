/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../BaseController.js'
// import { RequestHandler } from '../../utils/RequestHandler.js';
// import { Logger } from '../../utils/Logger.js'
import Partner from '../../models/Auth/Partner.js'
import { FirebaseServices } from '../../services/FirebaseService.js'

// const logger = new Logger()

class NotificationController extends BaseController {
  static getPartnerExpiredDocuments = async () => {
    try {
      const currentDate = new Date()
      console.log(currentDate, '============')

      const allPartners = await Partner.find()
      console.log(`${allPartners.length} partners found. Checking document expiry...`)

      if (allPartners.length === 0) {
        console.log('No partners found.')
        return
      }

      const expiredPartners = allPartners.filter((partner) =>
        partner.document.some((document) =>
          document.fields.some((field) => field.name === 'expDate' && new Date(field.value) <= currentDate)
        )
      )

      console.log(`${expiredPartners.length} partners have expired documents.`)

      await Promise.all(
        expiredPartners.map((partner) => {
          console.log(`Partner ${partner._id} has expired documents. Adding to Firebase...`)
          return FirebaseServices.createPartnerExpiredCampaign(partner._id)
        })
      )

      console.log('Expired document check completed.')
    } catch (error) {
      console.error('Error checking expired partners:', error)
    }
  }
}

export { NotificationController }
