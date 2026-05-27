/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { BaseController } from '../BaseController.js'
import { ServiceModuleError } from '../../utils/ErrorHandler.js'
import { NotifcationController } from '../Notification/Index.js'
import { Helpers } from '../../helpers/Function.js'
import { ServiceConfig } from '../../config/ServiceConfig.js'

import Partner from '../../models/Auth/Partner.js'
import Trip from '../../models/ServiceModule/Trip.js'
import ServiceType from '../../models/Creteria/ServiceType.js'
import Customer from '../../models/Auth/Customer.js'
import { Enum } from '../../utils/Enum.js'

class BulkAssignController extends BaseController {
  static findPartners = async (tripData) => {
    const requestRadius = ServiceConfig.basics.requestRadius
    const requestLimit = ServiceConfig.basics.requestLimit
    const retryInterval = ServiceConfig.basics.partnerSearchRetryInterval
    const startTime = Date.now()

    const serviceTypeData = await ServiceType.findById(tripData.serviceType).select('gender').lean()
    if (!serviceTypeData) throw new ServiceModuleError('SERVICE_TYPE_NOT_FOUND')

    console.log('ServiceTypeData:', serviceTypeData)

    const retry = async () => {
      try {
        let availablePartners = []
        const isManual = tripData.assignmentType === Enum.TRIP.ASSIGNMENT_TYPE.MANUAL

        const findQuery = [
          {
            $geoNear: {
              near: {
                type: 'Point',
                key: 'location',
                coordinates: [
                  parseFloat(tripData.estimation.startcoords[0]),
                  parseFloat(tripData.estimation.startcoords[1])
                ]
              },
              spherical: true,
              distanceField: 'distance',
              ...(isManual ? {} : { maxDistance: requestRadius })
            }
          },
          {
            $match: isManual
              ? { _id: mongoose.Types.ObjectId(tripData.PartnerId) }
              : {
                  status: 'Active',
                  online: true,
                  curStatus: 'free',
                  curService: mongoose.Types.ObjectId(tripData.serviceType),
                  ...(serviceTypeData.gender !== 'All' ? { gender: serviceTypeData.gender } : {})
                }
          },
          { $sort: { distance: 1 } }
        ]

        console.log('Find Query:', JSON.stringify(findQuery))
        const serviceTypeLookup = {
          $lookup: {
            from: 'servicetypes',
            let: {
              serviceType: isManual ? mongoose.Types.ObjectId(tripData.serviceType) : '$curService'
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
        }
        findQuery.push(serviceTypeLookup)
        findQuery.push({ $unwind: { path: '$serviceType', preserveNullAndEmptyArrays: true } })
        availablePartners = await Partner.aggregate(findQuery).limit(requestLimit).exec()
        console.log('availablePartners count:', availablePartners.length)

        // 1. Re-fetch latest trip data to get updated partnerList
        const latestTripData = await Trip.findById(tripData._id).lean()
        console.log(
          'Already requested partners (partnerList):',
          JSON.stringify(latestTripData?.partnerList || [], null, 2)
        )
        const alreadyRequestedPartnerIds =
          latestTripData?.partnerList?.map((p) => p.partnerId.toString()) || []
        // 5. Filter out already requested partners
        availablePartners = availablePartners.filter(
          (partner) => !alreadyRequestedPartnerIds.includes(partner._id.toString())
        )

        console.log('Filtered availablePartners count:', availablePartners.length)
        if (availablePartners.length > 0) {
          const partnerList = availablePartners.map((data) => ({
            partnerId: data._id,
            partnerUniCode: data.uniCode,
            serviceTypeName: data.serviceType?.name || '',
            status: Enum.TRIP.STATUS.ASSIGNED,
            distance: data.distance ?? 0,
            ETA: Math.ceil((data.distance / 1000 / ServiceConfig.basics.averageSpeed) * 60),
            requestTime: Helpers.getISODate()
          }))

          const updatePayload = {
            $set: { status: Enum.TRIP.STATUS.PROCESSING },
            $push: { partnerList: { $each: partnerList } }
          }

          const updatedTrip = await Trip.findOneAndUpdate(
            {
              _id: tripData._id,
              status: { $in: [Enum.TRIP.STATUS.REQUESTED, Enum.TRIP.STATUS.PROCESSING] }
            },
            updatePayload,
            { new: true }
          )

          if (updatedTrip) {
            await this.callTheBALoop(updatedTrip._id)
          }
        }
        // === Retry condition for auto assignment only ===
        if (tripData.assignmentType !== Enum.TRIP.ASSIGNMENT_TYPE.MANUAL) {
          const elapsed = Date.now() - startTime
          console.log(`No partners found. Elapsed time: ${elapsed}ms`)
          if (elapsed >= ServiceConfig.basics.serviceDuration) {
            console.log('Service duration expired. Clearing trip.')
            await this.clearTheTripBAFlow(tripData._id)
          }

          if ([Enum.TRIP.STATUS.REQUESTED, Enum.TRIP.STATUS.PROCESSING].includes(latestTripData?.status)) {
            console.log(`Retrying in ${retryInterval}ms...`)
            await new Promise((resolve) => setTimeout(resolve, retryInterval))
            await retry()
          } else {
            console.log('Trip status is no longer eligible for retry. Stopping retry loop.')
          }
        } else {
          // Manual case: no retry
          throw new ServiceModuleError('PARTNERS_NOT_AVAILABLE')
        }
      } catch (error) {
        console.log('FIND_PARTNERS_ERROR', error)
        await this.clearTheTripBAFlow(tripData._id)
      }
    }

    await retry()
  }

  static findNewNearByPartners = async (tripData, requestedPartnerIds) => {
    try {
      console.log('tripData.status', tripData.status, 'requestedPartnerIds', requestedPartnerIds)
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
          _id: { $nin: requestedPartnerIds },
          // curService: new RegExp( mongoose.Types.ObjectId(tripData.partner.vehicleId), 'i'),
          curStatus: 'free',
          curService: mongoose.Types.ObjectId(tripData.serviceType)
        }
      })
      findQuery.push({ $sort: { distance: 1 } })
      findQuery.push(
        {
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
        },
        {
          $unwind: { path: '$serviceType' }
        }
      )
      const availablePartners = await Partner.aggregate(findQuery).limit(requestLimit).exec()
      console.log('availablePartners', availablePartners)
      if (!availablePartners || availablePartners.length <= 0) {
        if (Number(tripData.noOfCompletedPartnerSearch) < Number(ServiceConfig.basics.noOfPartnerSearch)) {
          const noOfCompletedPartnerSearch = tripData.noOfCompletedPartnerSearch + 1
          const updatePartnerSearch = await Trip.findOneAndUpdate(
            { _id: tripData._id, status: { $in: [Enum.TRIP.STATUS.REQUESTED, Enum.TRIP.STATUS.PROCESSING] } },
            { noOfCompletedPartnerSearch: noOfCompletedPartnerSearch }
          )
          if (updatePartnerSearch) {
            this.findNewNearByPartners(tripData, requestedPartnerIds)
          } else throw new ServiceModuleError('PARTNERS_NOT_AVAILABLE')
        } else throw new ServiceModuleError('PARTNERS_NOT_AVAILABLE')
      }

      const partnerList = availablePartners.map((data) => ({
        partnerId: data._id,
        partnerUniCode: data.uniCode,
        serviceTypeName: data.serviceType?.name,
        status: Enum.TRIP.STATUS.ASSIGNED,
        distance: data.distance,
        ETA: Math.ceil((data.distance / 1000 / ServiceConfig.basics.averageSpeed) * 60),
        requestTime: Helpers.getISODate()
      }))
      console.log('partnerList______', partnerList)
      const tripUpdate = await Trip.findOneAndUpdate(
        { _id: tripData._id, status: { $in: [Enum.TRIP.STATUS.REQUESTED, Enum.TRIP.STATUS.PROCESSING] } },
        { $push: { partnerList: partnerList } }
      )
      this.callTheBALoop(tripUpdate._id)
    } catch (error) {
      // Call No Response
      console.log('FIND_PARTNERS_ERROR', error)
      this.clearTheTripBAFlow(tripData._id)
    }
  }

  static callTheBALoop = async (tripId, status = Enum.TRIP.STATUS.NORESPONSE) => {
    try {
      const tripData = await Trip.findOne({
        _id: tripId,
        $or: [{ needClear: true }, { status: { $in: ['Noresponse', 'Processing'] } }]
      }).exec()
      if (!tripData) throw new ServiceModuleError('NOT_FOUND|TRIP')

      const takePartners = tripData.partnerList.filter((data) => data.status == Enum.TRIP.STATUS.ASSIGNED)
      if (!takePartners || takePartners.length <= 0) throw new ServiceModuleError('NOT_FOUND|PARTNER')

      // Choosing Partners
      const takePartnerIds = takePartners.map((p) => p.partnerId)
      const partnersData = await Partner.find({ _id: { $in: takePartnerIds }, curStatus: 'free' }).exec()
      const [selectPartnerIds, selectPartnerFcms] = partnersData.reduce(
        ([partnerIds, partnerFcms], item) => {
          return [
            [...partnerIds, item._id],
            [...partnerFcms, item.fcmId]
          ]
        },
        [[], []]
      )

      // console.log('selectPartnerIds', selectPartnerIds)
      // console.log('lenth', partnersData.length, takePartnerIds.length)

      // if (partnersData.length != takePartnerIds.length) {
      //   // Need to do HOLD driver
      //   console.log('Need to do HOLD driver')
      //   const busyPartnersIds = takePartnerIds.reduce((r, e) => {
      //     if (selectPartnerIds.indexOf(e) === -1) {
      //       r.push(e)
      //     }
      //     return r
      //   }, [])
      //   await this.updatePartnerListStatus({
      //     tripId: tripData._id,
      //     listIds: busyPartnersIds,
      //     callStatus: Enum.TRIP.STATUS.HOLD
      //   })
      //   this.callTheOBOLoop(tripData._id)
      // }

      // Assigning Partners
      let assignPartners = null
      if (!ServiceConfig.basics.allowMultipleRequestToPartner) {
        assignPartners = await Partner.updateMany(
          {
            _id: { $in: selectPartnerIds }
          },
          { curStatus: Enum.TRIP.STATUS.REQUESTED, curTrip: tripData._id }
        ).exec()
      } else {
        assignPartners = await Partner.updateMany(
          {
            _id: { $in: selectPartnerIds }
          },
          {
            $push: {
              tripRequests: {
                tripId: tripData._id,
                status: Enum.TRIP.STATUS.REQUESTED,
                requestTime: Helpers.getISODate()
              }
            }
          }
        ).exec()
      }
      console.log('assignPartners', assignPartners)
      await Helpers.tripFlowHandlerFB({
        flow: '12',

        tripId: tripData._id,
        referenceNo: tripData.referenceNo,
        tripStatus: tripData.status,

        partnerIds: selectPartnerIds,
        partnerStatus: Enum.TRIP.STATUS.REQUESTED
      })
      console.log('Before NotifcationController')
      await NotifcationController.createNotification({
        processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
        data: {
          pushToken: selectPartnerFcms,
          title: 'Ride',
          body: '',
          template: 'partnerRequest',
          templateData: {}
        }
      })
      console.log('Before updatePartnerListStatus')
      await this.updatePartnerListStatus({
        tripId: tripData._id,
        listIds: selectPartnerIds,
        callStatus: Enum.TRIP.STATUS.CALLED
      })

      setTimeout(() => {
        this.triggerTheOBOLoop(selectPartnerIds, tripId)
      }, ServiceConfig.basics.acceptDuration)

      console.log('ASSIGN_PARTNERS', JSON.stringify(assignPartners))
    } catch (error) {
      console.log('CALL_THE_OBO_FLOW_ERROR: ', error, tripId)
      if (error.message != 'NOT_FOUND|TRIP') {
        this.clearTheTripBAFlow(tripId)
      }
    }
  }

  static updatePartnerListStatus = async (partnerData) => {
    try {
      console.log('updatePartnerListStatus', partnerData)
      const updateTripStatus = await Trip.updateMany(
        {
          _id: partnerData.tripId
        },
        {
          $set: {
            'partnerList.$[elem].status': partnerData.callStatus,
            'partnerList.$[elem].requestTime': Helpers.getISODate()
          }
        },
        {
          arrayFilters: [{ 'elem.partnerId': { $in: partnerData.listIds } }]
          // new: true+
        }
      )
      console.log('______updateTripStatus___', updateTripStatus)
    } catch (error) {
      console.log('UPDATE_PARTNER_LIST_STATUS_ERROR: ', error)
    }
  }

  static clearTheTripBAFlow = async (tripId, status = Enum.TRIP.STATUS.NORESPONSE) => {
    try {
      console.log('CLEAR_THE_TRIP_FLOW', tripId, status)

      // Free all partners still holding this trip before marking it NORESPONSE
      let freedPartnerIds = []
      if (!ServiceConfig.basics.allowMultipleRequestToPartner) {
        const partnersToFree = await Partner.find(
          { curTrip: tripId.toString(), curStatus: Enum.TRIP.STATUS.REQUESTED },
          { _id: 1 }
        ).lean()
        freedPartnerIds = partnersToFree.map((p) => p._id.toString())
        await Partner.updateMany(
          { curTrip: tripId.toString(), curStatus: Enum.TRIP.STATUS.REQUESTED },
          { $set: { curTrip: null, curStatus: 'free' } }
        )
      } else {
        const partnersToFree = await Partner.find(
          { 'tripRequests.tripId': mongoose.Types.ObjectId(tripId) },
          { _id: 1 }
        ).lean()
        freedPartnerIds = partnersToFree.map((p) => p._id.toString())
        await Partner.updateMany(
          { 'tripRequests.tripId': mongoose.Types.ObjectId(tripId) },
          { $pull: { tripRequests: { tripId: mongoose.Types.ObjectId(tripId) } } }
        )
      }

      if (freedPartnerIds.length > 0) {
        await Helpers.tripFlowHandlerFB({
          flow: '13',
          tripId: tripId,
          tripStatus: '',
          partnerIds: freedPartnerIds,
          partnerStatus: 'free'
        })
      }

      const tripInfo = await Trip.findOneAndUpdate(
        { _id: tripId, status: { $in: [Enum.TRIP.STATUS.REQUESTED, Enum.TRIP.STATUS.PROCESSING] } },
        {
          needClear: false,
          status: status
        },
        { new: true }
      )

      // console.log('trip info', tripInfo._id)

      if (status === Enum.TRIP.STATUS.NORESPONSE && tripInfo) {
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
            contentdata: { name: tripInfo.partner?.fname || '' },
            description: 'partnerWelcome'
          }
        })
      }
    } catch (error) {
      console.log('CLEAR_THE_OBO_FLOW_ERROR: ', tripId, error)
    }
  }

  static triggerTheOBOLoop = async (partnerIds, tripId) => {
    try {
      console.log('triggerTheOBOLoop', partnerIds, tripId)
      let checkrequestedStatus = []
      if (!ServiceConfig.basics.allowMultipleRequestToPartner) {
        checkrequestedStatus = await Partner.find({
          _id: { $in: partnerIds },
          curTrip: tripId.toString(),
          curStatus: Enum.TRIP.STATUS.REQUESTED
        }).lean()
      } else {
        checkrequestedStatus = await Partner.find(
          {
            _id: { $in: partnerIds },
            'tripRequests.tripId': mongoose.Types.ObjectId(tripId)
          },
          { _id: 1 }
        ).lean()
      }
      console.log('checkrequestedStatus', checkrequestedStatus)
      if (checkrequestedStatus.length) {
        partnerIds = checkrequestedStatus.reduce((acc, item) => {
          acc.push(item._id)
          return acc
        }, [])
        console.log('partnerIds', partnerIds)
        const firebaseUpdateData = {
          flow: '13',
          tripId: tripId,
          tripStatus: '',
          partnerIds: partnerIds,
          partnerStatus: 'free'
        }
        if (!ServiceConfig.basics.allowMultipleRequestToPartner) {
          const freePartner = await Partner.updateMany(
            {
              _id: { $in: partnerIds },
              curTrip: tripId.toString(),
              curStatus: Enum.TRIP.STATUS.REQUESTED
            },
            {
              $set: {
                curTrip: null,
                curStatus: 'free'
              }
            }
          )
          console.log('freePartner__', freePartner)
        } else {
          const freePartner = await Partner.updateMany(
            {
              _id: { $in: partnerIds }
            },
            {
              $pull: {
                tripRequests: {
                  tripId: tripId,
                  status: Enum.TRIP.STATUS.REQUESTED
                }
              }
            }
          )
          console.log('freePartner__', freePartner)
        }
        await Helpers.tripFlowHandlerFB(firebaseUpdateData)

        this.updatePartnerListStatus({
          tripId,
          listIds: partnerIds,
          callStatus: Enum.TRIP.STATUS.NORESPONSE
        })
      }
      // this.clearTheTripBAFlow(tripId, Enum.TRIP.STATUS.NORESPONSE)
      // this.callTheBALoop(tripId)
    } catch (error) {
      console.log(`TRIGGER_THE_OBO_LOOP_ERROR: ${partnerIds}, ${tripId}, \n ${error}`)
    }
  }

  static updatePartnerbulkassignTripinDb = async (tripsData) => {
    console.log('tripsData.partnerList', JSON.stringify(tripsData.partnerList))
    const takePartner = tripsData.partnerList.filter(
      (data) => data.status == Enum.TRIP.STATUS.ASSIGNED || data.status == Enum.TRIP.STATUS.CALLED
    )
    console.log('takePartner--1', takePartner, takePartner.length)
    if (takePartner.length != 0) {
      const partnerIdList = takePartner.map((partner) => partner.partnerId)
      await this.updateBulkpartnerTripinDB(partnerIdList, tripsData._id)
      console.log('takePartner--', partnerIdList)
      const firebaseUpdateData = {
        flow: '12',

        tripId: '',
        referenceNo: 0,
        tripStatus: '',

        partnerIds: partnerIdList,
        partnerStatus: 'free'
      }
      if (ServiceConfig.basics.allowMultipleRequestToPartner) {
        firebaseUpdateData.flow = '13'
        firebaseUpdateData.tripId = tripsData._id
      }
      // await Helpers.tripFlowHandlerFB()
      await Helpers.tripFlowHandlerFB(firebaseUpdateData)
    }
  }

  static updatePartnerTripNoresponseinDb = async (tripsData, acceptedPartnerId) => {
    console.log('tripsData.partnerList', tripsData, tripsData.partnerList, acceptedPartnerId)
    acceptedPartnerId = new mongoose.Types.ObjectId(acceptedPartnerId)
    const takePartner = tripsData.partnerList.filter(
      (data) =>
        (data.status == Enum.TRIP.STATUS.ASSIGNED || data.status == Enum.TRIP.STATUS.CALLED) &&
        !data.partnerId.equals(acceptedPartnerId)
    )
    console.log('takePartner__', takePartner, takePartner.length)
    if (takePartner.length != 0) {
      const partnerIdList = takePartner.map((partner) => partner.partnerId)
      const firebaseUpdateData = {
        flow: '12',

        tripId: tripsData._id,
        referenceNo: 0,
        tripStatus: '',

        partnerIds: partnerIdList,
        partnerStatus: 'free'
      }
      if (ServiceConfig.basics.allowMultipleRequestToPartner) {
        firebaseUpdateData.flow = '13'
        firebaseUpdateData.tripId = tripsData._id
        const pushacceptedPartnerId = [...partnerIdList, acceptedPartnerId]
        console.log('pushacceptedPartnerId', pushacceptedPartnerId)
        await this.updateBulkpartnerTripinDB(pushacceptedPartnerId, tripsData._id)
      } else {
        await this.updateBulkpartnerTripinDB(partnerIdList, tripsData._id)
      }
      console.log('takePartner--', partnerIdList)
      await Helpers.tripFlowHandlerFB(firebaseUpdateData)
    }
  }

  static updateBulkpartnerTripinDB = async (partnerIds, curTrip = '', curStatus = 'free') => {
    try {
      const tripToUpdate = curStatus === 'free' ? '' : curTrip
      console.log(
        'partnerIds',
        partnerIds,
        'tripToUpdate',
        tripToUpdate,
        'curStatus',
        curStatus,
        'curTrip',
        curTrip
      )
      if (!ServiceConfig.basics.allowMultipleRequestToPartner) {
        const result = await Partner.updateMany(
          { _id: { $in: partnerIds } },
          {
            $set: {
              curTrip: tripToUpdate,
              curStatus: curStatus
            }
          }
        )
        console.log('Bulk update result:', result)
      } else {
        const result = await Partner.updateMany(
          {
            _id: { $in: partnerIds }
          },
          {
            $pull: {
              tripRequests: {
                tripId: curTrip
              }
            }
          }
        )
        console.log('Bulk update result:', result)
      }
    } catch (error) {
      console.error('UPDATE_BULK_PARTNER_TRIP_IN_DB', error)
    }
  }
}
export { BulkAssignController }
