/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import moment from 'moment'
import { BaseController } from '../../../controllers/BaseController.js'
import Partner from '../../../models/Auth/Partner.js'
import { DrivingTimeConfig } from '../config.js'
import { Helpers } from '../../../helpers/Function.js'

class DrivingTimeController extends BaseController {
  constructor() {
    super()
  }
  static checkDrivingTime = async (partner, goingOnline) => {
    try {
      if (!DrivingTimeConfig.isEnabled) return { status: 'allowed' }

      const now = moment()
      const nowDate = now.toDate()

      if (!partner.drivingSession || !partner.drivingSession.startTime) {
        partner.drivingSession = {
          startTime: nowDate,
          lastOfflineTime: null
        }
        await partner.save()
        return { status: 'allowed' }
      }

      if (!goingOnline) {
        partner.drivingSession.lastOfflineTime = nowDate
        await partner.save()
        return { status: 'allowed', message: 'You are now offline' }
      }

      const drivingHours = moment.duration(now.diff(moment(partner.drivingSession.startTime))).asHours()

      if (drivingHours >= DrivingTimeConfig.maxDrivingHours) {
        const breakStart = partner.drivingSession.lastOfflineTime

        if (!breakStart) {
          return {
            status: 'blocked',
            message: `You have driven ${drivingHours.toFixed(1)} hours. You must go offline for ${
              DrivingTimeConfig.breakHours
            } hours.`
          }
        }

        const breakHours = moment.duration(now.diff(moment(breakStart))).asHours()

        if (breakHours < DrivingTimeConfig.breakHours) {
          return {
            status: 'blocked',
            message: `You are still on mandatory break. Please stay offline for ${(
              DrivingTimeConfig.breakHours - breakHours
            ).toFixed(1)} more hours.`
          }
        }

        partner.drivingSession.startTime = nowDate
        partner.drivingSession.lastOfflineTime = null
        await partner.save()
      }

      return { status: 'allowed' }
    } catch (error) {
      console.error('DrivingTime check error:', error)
      return { status: 'error', message: error.message }
    }
  }

  static startDrivingTimeCron = async () => {
    try {
      const onlinePartners = await Partner.find({ online: true, curStatus: 'free' })

      for (const partner of onlinePartners) {
        const result = await DrivingTimeController.checkDrivingTime(partner, true)

        if (result.status === 'blocked') {
          await Partner.updateOne(
            { _id: partner._id },
            { $set: { online: false, 'drivingSession.lastOfflineTime': Helpers.getISODate() } }
          )
          console.log(`Driver ${partner._id} forced offline: ${result.message}`)
        }
      }
    } catch (err) {
      console.error('DrivingTimeRestriction Cron Error:', err)
    }
  }
}

export { DrivingTimeController }
