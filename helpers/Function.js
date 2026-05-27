/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import { Config } from '../config/AppConfig.js'
import GoogleDistanceMatrix from 'google-distance-matrix'
import randomize from 'randomatic'
import moment from 'moment'
import { ServiceConfig } from '../config/ServiceConfig.js'

import { FirebaseServices } from '../services/FirebaseService.js'
GoogleDistanceMatrix.key(Config.mapConfig.serverKey)
class Helpers {
  // constructor() {
  //   super()
  // }

  static sendRandomizeCode = (type, no = 4) => {
    try {
      if (Config.mode == 'development') {
        return 1111
      } else {
        return randomize(type, no)
      }
    } catch (error) {
      return error
    }
  }

  /**
 ..* Send Formated Now Time
   * @input
   * @param
   * @return null
 * @response null
 */
  static sendFormatedTime = (timeformat = 'M-D-YYYY h:mm a', time = Date(), utcOffset = '+00:00') => {
    const t = moment(time).utcOffset(utcOffset).format(timeformat)
    return t
  }

  static getISODate = (timeformat = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]') => {
    // will return the current time in India.
    const t = moment().utcOffset(Config.app.utcOffset).format(timeformat)
    return t
  }

  static getISOStartDate = (date, timeformat = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]') => {
    // will return the current time in India.
    const t = moment(date).utcOffset(Config.app.utcOffset).startOf('day').format(timeformat)
    return t
  }

  static getISOEndDate = (date, timeformat = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]') => {
    // will return the current time in India.
    const t = moment(date).utcOffset(Config.app.utcOffset).endOf('day').format(timeformat)
    return t
  }

  static getDayRangeByOffset = (timeformat = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]') => {
    const startOfDay = moment().utcOffset(Config.app.utcOffset).startOf('day').format(timeformat)
    const endOfDay = moment().utcOffset(Config.app.utcOffset).endOf('day').format(timeformat)

    return { startOfDay, endOfDay }
  }

  static roundOff = (value) => {
    let returnValue = 0
    const dataType = typeof value
    try {
      if (['number', 'string'].includes(dataType) && !isNaN(value)) {
        returnValue = Number(parseFloat(value).toFixed(2))
      } else {
        console.log('Invalid round off', dataType, value)
      }
    } catch (error) {
      console.log(error, 'round Values To Two Digits')
    }
    return returnValue
  }

  static getDateDifference = (from, to) => {
    try {
      const fromDate = new Date(from)
      const toDate = new Date(to)
      if (isNaN(fromDate) || isNaN(toDate)) throw new Error('Unprocessable Entry')

      const diffYear = toDate.getFullYear() - fromDate.getFullYear()
      const monthDiff = diffYear * 12 + (toDate.getMonth() - fromDate.getMonth())

      return {
        month: monthDiff,
        year: diffYear,
        accuracy: Number((monthDiff / 12).toFixed(1) || 0)
      }
    } catch (error) {
      console.error('getDateDifference', error)
      return {
        month: 0,
        year: 0,
        accuracy: 0
      }
    }
  }

  static tripFlowHandlerFB = async (data) => {
    console.log('firebase udpate', data)
    try {
      let tripFlow = ''
      switch (data.flow) {
        case '0':
          await FirebaseServices.tripFbStatus('ADD', data.tripId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.customerFbStatus('UPDATE', data.customerId, {
            status: data.customerStatus
          })
          await FirebaseServices.customerFbStatus('REQUEST', data.customerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          tripFlow = 'assignCustomer'

          break // Assign trip to customer
        case '1':
          await FirebaseServices.partnerFbStatus('UPDATE', data.partnerId, {
            status: data.partnerStatus
          })
          await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          tripFlow = 'assignPartner'

          break // Assign the trip to partner
        case '2':
          await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.customerFbStatus('REQUEST', data.customerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.partnerFbStatus('UPDATE', data.partnerId, {
            status: data.partnerStatus
          })
          await FirebaseServices.tripFbStatus('UPDATE', data.tripId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          if (ServiceConfig.basics.allowMultipleRequestToPartner) {
            await FirebaseServices.partnerFbStatus('REMOVE', data.partnerId, {
              status: '',
              referenceNo: data.tripId
            })
          }
          tripFlow = 'partnerAccept'

          break // Accept the trip by partner
        case '3':
          await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.customerFbStatus('REQUEST', data.customerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.tripFbStatus('UPDATE', data.tripId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          tripFlow = 'partnerArrive'

          break // Partner Arrive the location
        case '4':
          await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.customerFbStatus('REQUEST', data.customerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.tripFbStatus('UPDATE', data.tripId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          tripFlow = 'partnerStart'

          break // Parnter start the trip
        case '5':
          await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
            status: data.tripStatus
          })
          await FirebaseServices.customerFbStatus('REQUEST', data.customerId, {
            status: data.tripStatus
          })
          await FirebaseServices.tripFbStatus('UPDATE', data.tripId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          tripFlow = 'partnerEnd'

          break // Parnter end the trip
        case '6':
          if (!ServiceConfig.basics.allowMultipleRequestToPartner) {
            await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
              status: '',
              referenceNo: ''
            })
          } else {
            await FirebaseServices.partnerFbStatus('REMOVE', data.partnerId, {
              status: '',
              referenceNo: data.tripId
            })
          }

          await FirebaseServices.partnerFbStatus('UPDATE', data.partnerId, {
            status: data.status,
            referenceNo: data.tripId
          })

          tripFlow = 'partnerDecline'

          break // Partner decline the trip
        case '7':
          await FirebaseServices.tripFbStatus('UPDATE', data.tripId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.customerFbStatus('REQUEST', data.customerId, {
            status: '',
            referenceNo: 0
          })
          await FirebaseServices.customerFbStatus('UPDATE', data.customerId, {
            status: 'free'
          })
          await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
            status: '',
            referenceNo: data.tripId
          })
          await FirebaseServices.partnerFbStatus('UPDATE', data.partnerId, {
            status: 'free',
            referenceNo: data.tripId
          })
          tripFlow = 'tripCancel'

          break // Cancel trip by either customer and partner
        case '8':
          await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
            status: '',
            referenceNo: 0
          })
          await FirebaseServices.partnerFbStatus('UPDATE', data.partnerId, {
            status: data.partnerStatus
          })
          tripFlow = 'freeThePartner'
          // Free the partner
          break
        case '9':
          await FirebaseServices.tripFbStatus('UPDATE', data.tripId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.customerFbStatus('REQUEST', data.customerId, {
            status: data.tripStatus,
            referenceNo: 0
          })
          await FirebaseServices.customerFbStatus('UPDATE', data.customerId, {
            status: data.customerStatus
          })
          tripFlow = 'freeTheCustomer'

          break // Free the customer
        case '10':
          // need to work
          tripFlow = 'noResponse'

          break // Need to work on no response
        case '11':
          if (data.partnerId) {
            await FirebaseServices.partnerFbStatus('UPDATE', data.partnerId, {
              status: data.partnerStatus
            })
            await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
              status: '',
              referenceNo: 0
            })
          } else {
            await FirebaseServices.customerFbStatus('UPDATE', data.customerId, {
              status: data.customerStatus
            })

            await FirebaseServices.customerFbStatus('REQUEST', data.customerId, {
              status: '',
              referenceNo: 0
            })
          }

          break
        case '12':
          if (data.partnerIds) {
            await FirebaseServices.bulkFbStatus({
              partnerIds: data.partnerIds,
              status: data.partnerStatus,
              tripStatus: data.tripStatus,
              referenceNo: data.tripId,
              action: 'PARTNERS_DATA'
            })
            tripFlow = 'bulkUpdatePartner'
          }

          break // Bulk Assign or update the partner
        case '13':
          if (data.partnerIds) {
            await FirebaseServices.bulkFbStatus({
              partnerIds: data.partnerIds,
              status: data.partnerStatus,
              tripStatus: data.tripStatus,
              referenceNo: data.tripId,
              action: 'REMOVE_PARTNERS_DATA'
            })
            tripFlow = 'bulkUpdatePartner'
          }

          break
        case '14': // For hail ride
          await FirebaseServices.tripFbStatus('ADD', data.tripId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.customerFbStatus('UPDATE', data.customerId, {
            status: data.customerStatus
          })
          await FirebaseServices.partnerFbStatus('REQUEST', data.partnerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.customerFbStatus('REQUEST', data.customerId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          await FirebaseServices.partnerFbStatus('UPDATE', data.partnerId, {
            status: data.partnerStatus
          })
          await FirebaseServices.tripFbStatus('UPDATE', data.tripId, {
            status: data.tripStatus,
            referenceNo: data.tripId
          })
          if (ServiceConfig.basics.allowMultipleRequestToPartner) {
            await FirebaseServices.partnerFbStatus('REMOVE', data.partnerId, {
              status: '',
              referenceNo: data.tripId
            })
          }
          tripFlow = 'partnerStart'

          break // Partner start the trip
        case '15': // Change Destination during trips
          await FirebaseServices.tripFbStatus('UPDATE', data.tripId, {
            status: data.tripStatus,
            destinationChanged: data?.destinationChanged || '',
            referenceNo: data.tripId
          })
          tripFlow = 'destinationChanged'
          break // Partner start the trip
      }

      return tripFlow
    } catch (error) {
      return null
    }
  }

  static async maskSensitiveData(data) {
    if (Array.isArray(data)) {
      // If it's an array, recursively call the function on each element
      return await Promise.all(data.map((item) => this.maskSensitiveData(item)))
    } else if (typeof data === 'object' && data !== null) {
      // If it's an object, traverse its keys
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          if (key === 'email') {
            // Mask email
            data[key] = await this.maskEmail(data[key])
          } else if (key === 'phone' || key === 'phoneNumber') {
            // Mask phone number
            data[key] = await this.maskPhone(data[key])
          } else {
            // Recursively check nested objects/arrays
            data[key] = await this.maskSensitiveData(data[key])
          }
        }
      }
      return data
    } else {
      // If it's not an object or array, return it as-is
      return data
    }
  }

  static maskEmail(email) {
    if (!email) return email // Return early if phoneNumber is null or undefined
    const [localPart, domain = ''] = email.split('@')
    const maskedLocalPart = localPart[0] + '***' + localPart[localPart.length - 1]
    const [domainName, topLevelDomain] = domain.split('.')
    const maskedDomain = domainName[0] + '***' + domainName[domainName.length - 1] + '.' + topLevelDomain
    return `${maskedLocalPart}@${maskedDomain}`
  }

  static maskPhone(phone) {
    if (!phone) return phone // Return early if phoneNumber is null or undefined
    // Assuming the phone number is in the format of "(123) 456-7890"
    const cleaned = phone.replace(/\D/g, '') // Remove non-digit characters
    const maskedNumber = cleaned.slice(0, 3) + '***' + cleaned.slice(6) // Mask the middle part
    return maskedNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1***$3') // Mask the middle three digits
  }
}

export { Helpers }
