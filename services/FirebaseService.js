/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { initializeApp, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { getAuth } from 'firebase-admin/auth'
// import { getFirestore } from 'firebase-admin/firestore';
import { ServiceAccount } from '../config/ServiceAccount.js'
import { BaseService } from '../services/BaseService.js'

import { Config } from '../config/AppConfig.js'
import { ServiceConfig } from '../config/ServiceConfig.js'

const app = initializeApp({
  ...Config.firebasekey,
  credential: cert(ServiceAccount)
})
const db = getDatabase(app)
// const firebasedb = getFirestore(app);

class FirebaseServices extends BaseService {
  static createPartnerExpiredCampaign = async (partnerId) => {
    try {
      const path = `Partner_Campaigns/${partnerId}`
      const databaseRef = db.ref(path)

      const campaignData = {
        expired: true,
        partnerId: partnerId.toString()
      }

      await databaseRef.set(campaignData)
    } catch (error) {
      console.error(`Error adding partner ${partnerId} to Firebase:`, error)
    }
  }

  static createCampaign = async (action, partnerId, data) => {
    try {
      const id = partnerId.toString()

      const path = 'campaigns/' + id
      const databaseRef = db.ref(path)
      switch (action) {
        case 'ADD': {
          const partnerData = {
            status: data.online
          }
          await databaseRef.set(partnerData)
          break
        }
        case 'UPDATE': {
          const partnerData = await databaseRef.get()
          const partnerDataVal = partnerData.val()
          if (partnerDataVal) {
            partnerDataVal.online = data.online
            await databaseRef.update(partnerDataVal)
          } else {
            console.log('Partner data not found for the given user ID:', id)
          }
          break
        }
        default: {
          console.log('Unsupported action:', action)
          break
        }
      }
      return {
        status: true,
        message: 'PROCESS',
        data: {}
      }
    } catch (error) {
      console.error('customerFbStatus', error)
      return {
        status: false,
        message: 'UNPROCESSABLE_ENTITY',
        data: {}
      }
    }
  }

  static customerFbStatus = async (action, userId, data) => {
    try {
      console.log('customerFbStatus', action, userId, data)
      const id = userId.toString()
      const trips = data.referenceNo || 0
      const tripid = trips.toString()

      const path = 'customers_data/' + id
      const databaseRef = db.ref(path)
      switch (action) {
        case 'ADD': {
          const customerData = {
            status: data.status
          }
          await databaseRef.set(customerData)
          break
        }
        case 'UPDATE': {
          const customersData = await databaseRef.get()
          const customerDataVal = customersData.val()
          if (customerDataVal) {
            customerDataVal.status = data.status
            await databaseRef.update(customerDataVal)
          } else {
            console.log('Customer data not found for the given user ID:', id)
          }
          break
        }
        case 'REQUEST': {
          const requestRef = databaseRef.child('/request')
          const requestData = {
            requestStatus: data.status,
            requestId: tripid
          }
          await requestRef.update(requestData)
          break
        }
        default: {
          console.log('Unsupported action:', action)
          break
        }
      }
      return {
        status: true,
        message: 'PROCESS',
        data: {}
      }
    } catch (error) {
      console.error('customerFbStatus', error)
      return {
        status: false,
        message: 'UNPROCESSABLE_ENTITY',
        data: {}
      }
    }
  }

  static partnerFbStatus = async (action, userId, data) => {
    try {
      console.log('partnerFbStatus', action, userId, data)
      const id = userId.toString()
      const trips = data.referenceNo || 0
      const tripid = trips.toString()

      const path = 'partners_data/' + id
      const databaseRef = db.ref(path)
      switch (action) {
        case 'ADD': {
          const partnerData = {
            status: data.status
          }
          await databaseRef.set(partnerData)
          break
        }
        case 'UPDATE': {
          const partnersData = await databaseRef.get()
          const partnerDataVal = partnersData.val()
          let status = data.status
          if (ServiceConfig.basics.allowMultipleRequestToPartner && status == 'free') {
            const requestsSnapshot = await db.ref(`/partners_data/${id}/request`).once('value')
            const requests = requestsSnapshot.val()
            if (requests) {
              console.log('requests exists', requests)
              // Filter out invalid or deleted requests
              const validRequests = Object.values(requests).filter(
                (req) => typeof req === 'object' && req !== null && req.requestId && req.requestStatus
              )

              status = validRequests.length > 0 ? 'Requested' : 'free'
              console.log('final status', status)
            } else {
              if (partnerDataVal) {
                partnerDataVal.status = status
                await databaseRef.update(partnerDataVal)
              }
            }
          }
          console.log('final status 2', status)

          if (partnerDataVal) {
            partnerDataVal.status = status
            await databaseRef.update(partnerDataVal)
          } else {
            if (partnerDataVal) {
              partnerDataVal.status = status
              await databaseRef.update(partnerDataVal)
            }
          }
          break
        }
        case 'REQUEST': {
          const requestRef = databaseRef.child('/request')
          const requestData = {
            requestStatus: data.status,
            requestId: tripid
          }
          await requestRef.update(requestData)
          break
        }
        case 'REMOVE': {
          const requestRef = databaseRef.child('/request')
          const snapshot = await requestRef.once('value')
          const requests = snapshot.val()

          if (requests) {
            Object.entries(requests).forEach(([key, value]) => {
              if (value.requestId === tripid) {
                // Remove the matching request node
                requestRef.child(key).remove()
              }
            })
          }
          break
        }
        default: {
          console.log('Unsupported action:', action)
          break
        }
      }
      return {
        status: true,
        message: 'PROCESS',
        data: {}
      }
    } catch (error) {
      console.error('partnerFbStatus', error)
      return {
        status: false,
        message: 'UNPROCESSABLE_ENTITY',
        data: {}
      }
    }
  }

  static bulkFbStatus = async (data) => {
    console.log('bulkFbStatus', data)
    let response = {
      status: false,
      message: 'UNPROCESSABLE_ENTITY',
      data: {}
    }
    try {
      if (!Object.keys(data) || Object.keys(data).length <= 0) throw new Error('UNPROCESSABLE_ENTITY')
      switch (data.action) {
        case 'PARTNERS_DATA':
          const updates = data.partnerIds.reduce((acc, partnerId) => {
            acc[`/partners_data/${partnerId}/status`] = data.status
            if (data.referenceNo) {
              if (ServiceConfig.basics.allowMultipleRequestToPartner) {
                acc[`/partners_data/${partnerId}/request/${data.referenceNo}/requestStatus`] = data.status
                acc[`/partners_data/${partnerId}/request/${data.referenceNo}/requestId`] = data.referenceNo
              } else {
                acc[`/partners_data/${partnerId}/request/requestStatus`] = data.status
                acc[`/partners_data/${partnerId}/request/requestId`] = data.referenceNo
              }
            }
            return acc
          }, {})
          await db.ref().update(updates)
          // await update(ref(db), updates)
          break
        case 'REMOVE_PARTNERS_DATA':
          const updateData = {}

          for (const partnerId of data.partnerIds) {
            const requestsRef = db.ref(`/partners_data/${partnerId}/request`)
            const snapshot = await requestsRef.once('value')
            const requests = snapshot.val()
            const requestKeysToDelete = []

            if (requests) {
              Object.entries(requests).forEach(([key, value]) => {
                console.log(
                  'requestId',
                  value.requestId,
                  'referenceNo',
                  data.referenceNo.toString(),
                  value.requestId === data.referenceNo.toString()
                )
                if (value.requestId === data.referenceNo.toString()) {
                  updateData[`/partners_data/${partnerId}/request/${key}`] = null // Mark node for deletion
                  requestKeysToDelete.push(key)
                }
              })

              const remainingRequests = Object.entries(requests).filter(([key, value]) => {
                // Skip ones we're deleting
                if (requestKeysToDelete.includes(key)) return false

                // Keep only valid request objects
                return typeof value === 'object' && value !== null && value.requestId && value.requestStatus
              })
              console.log('remainingRequests', remainingRequests)
              if (remainingRequests.length == 0) {
                const statusSnapshot = await db.ref(`/partners_data/${partnerId}/status`).once('value')
                const currentStatus = statusSnapshot.val()
                if (currentStatus !== 'inTrip') {
                  updateData[`/partners_data/${partnerId}/status`] = 'free'
                }
              }
            } else {
              // No requests at all, update status
              const statusSnapshot = await db.ref(`/partners_data/${partnerId}/status`).once('value')
              const currentStatus = statusSnapshot.val()
              if (currentStatus !== 'inTrip') {
                updateData[`/partners_data/${partnerId}/status`] = 'free'
              }
            }
          }
          console.log('updateData', updateData)
          if (Object.keys(updateData).length > 0) {
            await db.ref().update(updateData)
          }
          break
        default:
          action = 'ACTION_NOT_FOUND'
      }
    } catch (error) {
      console.error('partnerFbStatus', error)
      response = {
        status: false,
        message: 'UNPROCESSABLE_ENTITY',
        data: {}
      }
    }
    return response
  }

  static tripFbStatus = async (action, tripId, data) => {
    try {
      console.log('tripFbStatus', action, tripId, data)
      const id = tripId.toString()
      const path = 'trips_data/' + id
      const databaseRef = db.ref(path)
      switch (action) {
        case 'ADD': {
          const tripData = {
            referenceNo: id,
            status: data.status,
            destinationChanged: 0
          }
          await databaseRef.set(tripData)
          break
        }
        case 'UPDATE': {
          const tripsData = await databaseRef.get()
          const tripDataVal = tripsData.val()
          if (tripDataVal) {
            tripDataVal.referenceNo = id
            tripDataVal.status = data.status
            if (data.destinationChanged) {
              tripDataVal.destinationChanged = (tripDataVal.destinationChanged || 0) + 1
            }
            await databaseRef.update(tripDataVal)
          } else {
            console.log('Partner data not found for the given user ID:', id)
          }
          break
        }
        default: {
          console.log('Unsupported action:', action)
          break
        }
      }
      return {
        status: true,
        message: 'PROCESS',
        data: {}
      }
    } catch (error) {
      console.error('tripFbStatus', error)
      return {
        status: false,
        message: 'UNPROCESSABLE_ENTITY',
        data: {}
      }
    }
  }

  static alertSettings = async (action, data) => {
    try {
      const path = 'AlertSettings'
      const databaseRef = db.ref(path)
      let alertdata
      switch (action) {
        case 'ADD': {
          const settingsData = {
            isEnable: data.isEnable,
            minimumBalance: data.minimumBalance,
            minimumBalanceDriverAlert: data.minimumBalanceDriverAlert,
            lowBalanceAlert: data.lowBalanceAlert,
            lowBalanceDriverAlert: data.lowBalanceDriverAlert
          }
          await databaseRef.set(settingsData)
          break
        }
        case 'UPDATE': {
          const settingsData = await databaseRef.get()
          const settingsDataVal = settingsData.val()
          if (settingsDataVal) {
            settingsDataVal.isEnable = data.isEnable
            settingsDataVal.minimumBalance = data.minimumBalance
            settingsDataVal.minimumBalanceDriverAlert = data.minimumBalanceDriverAlert
            settingsDataVal.lowBalanceAlert = data.lowBalanceAlert
            settingsDataVal.lowBalanceDriverAlert = data.lowBalanceDriverAlert
            alertdata = await databaseRef.update(settingsDataVal)
          } else {
            console.log('Alert Settings not found')
          }
          break
        }
        case 'GET': {
          alertdata = await databaseRef.once('value')
        }
        default: {
          console.log('Unsupported action:', action)
          break
        }
      }
      return {
        status: true,
        message: 'PROCESS',
        data: alertdata
      }
    } catch (error) {
      console.error('alertSettings', error)
      return {
        status: false,
        message: 'UNPROCESSABLE_ENTITY',
        data: {}
      }
    }
  }

  static authToken = (userId) => {
    return new Promise((resolve, reject) => {
      try {
        const authObject = getAuth(app)
        authObject
          .createCustomToken(userId.toString())
          .then((customToken) => {
            resolve(customToken)
          })
          .catch((error) => {
            reject(error)
          })
      } catch (error) {
        reject(error)
      }
    })
  }
}

export { FirebaseServices }
