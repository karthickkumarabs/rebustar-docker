/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseController } from '../BaseController.js'
import { Enum } from '../../utils/Enum.js'
import { ServiceConfig } from '../../config/ServiceConfig.js'
import { NotifcationController } from '../Notification/Index.js'
import { Helpers } from '../../helpers/Function.js'
import { ServiceModuleError } from '../../utils/ErrorHandler.js'
// import { FirebaseServices } from '../../services/FirebaseService.js'

import Partner from '../../models/Auth/Partner.js'
import Trip from '../../models/ServiceModule/Trip.js'
import Customer from '../../models/Auth/Customer.js'

class OnebyoneController extends BaseController {
  static findPartners = async (tripData) => {
    try {
      const requestRadius = ServiceConfig.basics.requestRadius
      const requestLimit = ServiceConfig.basics.requestLimit

      const findQuery = []
      findQuery.push({
        $geoNear: {
          near: {
            type: 'Point',
            key: 'location',
            coordinates: [
              parseFloat(tripData.estimation.startcoords[0]),
              parseFloat(tripData.estimation.startcoords[1])
            ]
          },
          maxDistance: requestRadius,
          spherical: true,
          distanceField: 'distance'
        }
      })
      findQuery.push({
        $match: {
          status: 'Active',
          online: true,
          // curService: new RegExp( mongoose.Types.ObjectId(tripData.partner.vehicleId), 'i'),
          curStatus: 'free',
          curService: mongoose.Types.ObjectId(tripData.serviceType)
        }
      })
      findQuery.push({ $sort: { distance: 1 } })
      findQuery.push({
        $lookup: {
          from: 'servicetypes',
          let: {
            serviceType: '$curService'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$serviceType']
                }
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'serviceType'
        }
      })
      const availablePartners = await Partner.aggregate(findQuery).limit(requestLimit).exec()
      if (!availablePartners || availablePartners.length < 0)
        throw new ServiceModuleError('PARTNERS_NOT_AVAILABLE')

      const partnerList = availablePartners.map((data) => ({
        partnerId: data._id,
        partnerUniCode: data.uniCode,
        serviceTypeName: data.serviceType[0]?.name,
        status: Enum.TRIP.STATUS.ASSIGNED,
        distance: data.distance
      }))
      const tripUpdate = await Trip.findOneAndUpdate(
        { _id: tripData._id, status: Enum.TRIP.STATUS.REQUESTED },
        { partnerList: partnerList, status: Enum.TRIP.STATUS.PROCESSING }
      )

      this.callTheOBOLoop(tripUpdate._id)
    } catch (error) {
      // Call No Response
      console.log('FIND_PARTNERS_ERROR', error)
      this.clearTheTripOBOFlow(tripData._id)
    }
  }

  static callTheOBOLoop = async (tripId) => {
    try {
      let callStatus = ''
      const tripData = await Trip.findOne({
        _id: tripId,
        $or: [{ needClear: true }, { status: { $in: ['Noresponse', 'Processing'] } }]
      }).exec()
      if (!tripData) throw new ServiceModuleError('NOT_FOUND|TRIP')

      const takePartner = tripData.partnerList.find((data) => data.status == Enum.TRIP.STATUS.ASSIGNED)
      if (!takePartner) throw new ServiceModuleError('NOT_FOUND|PARTNER')

      const partnerData = await Partner.findOne({ _id: takePartner.partnerId }).exec()
      if (partnerData.curStatus == 'free') {
        partnerData.curStatus = Enum.TRIP.STATUS.REQUESTED
        partnerData.curTrip = tripData._id
        partnerData.save()

        await Helpers.tripFlowHandlerFB({
          flow: '1',

          tripId: tripData._id,
          referenceNo: tripData.referenceNo,
          tripStatus: tripData.status,

          partnerId: partnerData._id,
          partnerStatus: Enum.TRIP.STATUS.REQUESTED
        })
        await NotifcationController.createNotification({
          processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
          data: {
            pushToken: partnerData.fcmId,
            title: 'Ride',
            body: '',
            template: 'partnerRequest',
            templateData: {}
          }
        })
        callStatus = Enum.TRIP.STATUS.CALLED

        setTimeout(() => {
          this.triggerTheOBOLoop(partnerData._id, tripId)
        }, ServiceConfig.basics.acceptDuration)
      } else {
        callStatus = Enum.TRIP.STATUS.HOLD
      }

      await this.updatePartnerListStatus({
        tripId: tripData._id,
        listId: takePartner._id,
        callStatus: callStatus
      })
      if (callStatus == Enum.TRIP.STATUS.HOLD) this.callTheOBOLoop(tripId)
    } catch (error) {
      console.log('CALL_THE_OBO_FLOW_ERROR: ', error, tripId)
      if (error.message != 'NOT_FOUND|TRIP') {
        this.clearTheTripOBOFlow(tripId)
      }
    }
  }

  static updatePartnerListStatus = async (partnerData) => {
    try {
      await Trip.updateOne(
        {
          _id: partnerData.tripId,
          'partnerList._id': partnerData.listId
        },
        {
          $set: {
            'partnerList.$.status': partnerData.callStatus,
            'partnerList.$.requestTime': Helpers.getISODate()
          }
        },
        { new: true }
      )
    } catch (error) {
      console.log('UPDATE_PARTNER_LIST_STATUS_ERROR: ', error)
    }
  }

  static triggerTheOBOLoop = async (partnerId, tripId) => {
    try {
      const partnerData = await Partner.findOne({
        _id: partnerId,
        curTrip: tripId.toString(),
        curStatus: Enum.TRIP.STATUS.REQUESTED
      }).exec()
      if (!partnerData) throw new Error(`PARTNER_NOT_IN_THE_STATE: ${partnerId} , ${tripId}`)

      partnerData.curTrip = null
      partnerData.curStatus = 'free'
      await partnerData.save()

      Helpers.tripFlowHandlerFB({
        flow: '8',

        tripId: tripId,

        partnerId: partnerData._id,
        partnerStatus: 'free'
      })

      this.updatePartnerListStatus({
        tripId,
        listId: partnerData._id,
        callStatus: Enum.TRIP.STATUS.NORESPONSE
      })

      this.callTheOBOLoop(tripId)
    } catch (error) {
      console.log(`TRIGGER_THE_OBO_LOOP_ERROR: ${partnerId}, ${tripId}, \n ${error}`)
    }
  }

  static clearTheTripOBOFlow = async (tripId, status = Enum.TRIP.STATUS.NORESPONSE) => {
    try {
      console.log('CLEAR_THE_TRIP_OBO_FLOW', tripId, status)
      const tripInfo = await Trip.findOneAndUpdate(
        { _id: tripId },
        { needClear: false, status: status },
        { new: true }
      )
      if (status == Enum.TRIP.STATUS.NORESPONSE) {
        Helpers.tripFlowHandlerFB({
          flow: '9',

          tripId: tripInfo._id,
          referenceNo: tripInfo.referenceNo,

          customerId: tripInfo.customer.id,
          customerStatus: 'free',

          tripStatus: 'noResponse'
        })
        await Customer.findOneAndUpdate({ _id: tripInfo.customer.id }, { curStatus: 'free', curTrip: null })

        await NotifcationController.createNotification({
          module: Enum.NOTIFICATION.TYPE.INACCOUNT,
          severity: Enum.NOTIFICATION.SEVERITY.INFO,

          title: 'NORESPONSE',
          body: 'NORESPONSE_TRIP_ADDED',
          supplementary: {
            requestId: tripId,
            referenceNo: tripInfo.referenceNo
          },

          processType: [Enum.NOTIFICATION.TYPE.INACCOUNT],
          data: {
            contentdata: { name: tripInfo.partner.fname },
            description: 'partnerWelcome'
          }
        })
      }
    } catch (error) {
      console.log('CLEAR_THE_OBO_FLOW_ERROR: ', tripId, error)
    }
  }
}
export { OnebyoneController }
