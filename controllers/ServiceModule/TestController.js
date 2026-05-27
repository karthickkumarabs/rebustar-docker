/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Enum } from '../../utils/Enum.js'
import { BaseController } from '../BaseController.js'
import { FirebaseServices } from '../../services/FirebaseService.js'
import { NotifcationController } from '../Notification/Index.js'
import { AuthServices } from '../../services/Common/AuthService.js'
import moment from 'moment'
class TestController extends BaseController {
  static testfirebaseupdate = async (req, res) => {
    try {
      const action = req.body.action
      const id = req.body.id
      const data = req.body.data
      const actionassign = req.body.assignaction
      if (actionassign == 'customer') {
        await FirebaseServices.customerFbStatus(action, id, data)
      } else if (actionassign == 'partner') {
        await FirebaseServices.partnerFbStatus(action, id, data)
      } else {
        await FirebaseServices.tripFbStatus(action, id, data)
      }
      res.send({
        status: true,
        message: 'SUCCESS'
      })
    } catch (error) {
      console.error('TEST_FIREBASE_UPDATE_ERROR: ', error)
    }
  }

  static testemail = async (req, res) => {
    try {
      console.log('inside testmail function')
      // const emaildata = await NotifcationController.createNotification({
      //   processType: [Enum.NOTIFICATION.TYPE.MAIL],
      //   data: {
      //     email: 'absyogaasri@gmail.com',
      //     contentdata: { name: 'Yogaa' },
      //     description: 'Customer Welcome'
      //   }
      // })

      await NotifcationController.createNotification({
        processType: [Enum.NOTIFICATION.TYPE.MAIL],
        data: {
          email: 'absayyankalai31@gmail.com',
          subject: 'Trip Invoice',
          contentdata: {
            TOTAL_FARE: 100 || tripObj.getInvoice.data.invoiceData.totalFare,
            TRIP_NO: 1208 || tripObj.tripdata[0].tripno,
            TRIP_DATE: moment('2023-12-15T16:10:28.723Z').format('YYYY/MM/DD') || tripObj.tripdata[0].tripDT,
            ACTUAL_FARE: 80 || tripObj.getInvoice.data.invoiceData.actualFare,
            ADDITIONAL_FARE: 20 || tripObj.getInvoice.data.invoiceData.additionalFare,
            TRIP_ST:
              moment('2023-12-15T16:10:28.723Z').format('YYYY/MM/DD h:mm a') ||
              tripObj.tripdata[0].partner.startTime,
            TRIP_ET:
              moment('2023-12-15T16:10:28.723Z').format('YYYY/MM/DD h:mm a') ||
              tripObj.tripdata[0].partner.endTime,
            TRIP_START:
              '146-147, Vakkil New St, Simmakkal, Madurai Main, Madurai, Tamil Nadu ' ||
              tripObj.getInvoice.data.invoiceData.start,
            TRIP_END:
              'Central Periyar Bus Stand, Periyar, Madurai Main, Madurai, Tamil Nadu' ||
              tripObj.getInvoice.data.invoiceData.end,
            TRIP_DISTANCE: 15.3 || tripObj.getInvoice.data.invoiceData.distance,
            TRIP_TIME: 30 || tripObj.getInvoice.data.invoiceData.estTime
          }
        }
      })
      // return emaildata
      return res.send('success')
    } catch (error) {
      console.error('TEST_MAIL', error)
    }
  }

  static partnerAutoApproval = async (req, res) => {
    try {
      const auth = req.auth
      const bodyData = req.body

      let partnerId = null
      if (auth.role == Enum.ROLES.ADMIN) {
        partnerId = bodyData.partnerId
      } else {
        partnerId = auth.userId
      }
      if (!partnerId) throw new Error('PARTNER_IS_NOT_VALID')

      const { scopeOperation = [], vehicleId } = bodyData

      const response = await AuthServices.partnerAutoApproval({
        partnerId,
        scopeOperation,
        vehicleId
      })

      console.log(response)

      if (!response?.status) {
        throw new Error(response.message)
      }

      return res.status(200).json({ status: true, message: 'APPROVED' })
    } catch (error) {
      console.log('error', error)
      return res.status(400).json({ status: false, message: error.message })
    }
  }
}
export { TestController }
