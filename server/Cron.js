/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { CronJob } from 'cron'
import { ServiceModuleController } from '../controllers/ServiceModule/ServiceModuleController.js'
import { PartnerController } from '../controllers/Auth/PartnerController.js'
import { PayoutConfig } from '../modules/Payment/PayoutConfig.js'
import { PaymentController } from '../modules/Payment/PaymentController.js'
import { SettingsConfig } from '../config/SettingsConfig.js'
import { CancelController } from '../modules/Cancellation/controllers/CancelController.js'
import { OTPValidationController } from '../modules/OTPValidations/OTPValidationController.js'
import { DrivingTimeController } from '../modules/DrivingTimeRestriction/controllers/DrivingTimeRestrictionController.js'
import { SubscriptionController } from '../modules/Subscription/SubscriptionController.js'
import { Enum } from '../utils/Enum.js'

// const serviceCron = new CronJob({
//   cronTime: '0 */1 * * * *',
//   onTick: function () {
//     console.log('You will see this message every second')
//   },
//   start: true
// })

// eslint-disable-next-line no-unused-vars
const serviceCron = CronJob.from({
  cronTime: '0 */1 * * * *',
  onTick: function () {
    // Restrict the cron run in one EVERY_MINUTE_CRONinstance alone if we use PM2 clusters mode
    // if (process.env.pm_id == 0) {
    PartnerController.partnerOfflineCron()
    ServiceModuleController.scheduleLaterCron()
    if (
      SettingsConfig.menulist.find(
        (item) => item.value == Enum.SETTINGS.SUBSCRIPTIONSETTING && item.enabled == true
      )
    ) {
      SubscriptionController.checkAndExpiredSubscriptionStatus()
    }
    console.log('EVERY_MINUTE_CRON')
    // } else {
    //   console.log('EVERY_MINUTE_CRON_BLOCKED')
    // }
  },
  start: true
})

if (PayoutConfig.isAutopay) {
  CronJob.from({
    cronTime: '0 10 * * 7',
    onTick: function () {
      // Restrict the cron run in one instance alone if we use PM2 clusters mode
      // if (process.env.pm_id == 0) {
      PaymentController.autopayout()
      console.log('EVERY_WEEK_CRON')
      // } else {
      //   console.log('EVERY_WEEK_CRON_BLOCKED')
      // }
    },
    start: true
  })
}

if (
  SettingsConfig.menulist.find(
    (item) => item.value == Enum.SETTINGS.CANCELLATIONSETTING && item.enabled == true
  )
) {
  CronJob.from({
    cronTime: '0 * * * *',
    onTick: function () {
      // Restrict the cron run in one instance alone if we use PM2 clusters mode
      // if (process.env.pm_id == 0) {
      CancelController.userUnblocked()
      console.log('EVERY_MINUTE_CRON')
      // } else {
      //   console.log('EVERY_MINUTE_CRON_BLOCKED')
      // }
    },
    start: false
  })
}

if (
  SettingsConfig.menulist.find(
    (item) => item.value == Enum.SETTINGS.CANCELLATIONSETTING && item.enabled == true
  )
) {
  CronJob.from({
    cronTime: '0 * * * *',
    onTick: function () {
      // Restrict the cron 05:13:0run in one instance alone if we use PM2 clusters mode
      // if (process.env.pm_id == 0) {
      CancelController.userUnblocked()
      console.log('EVERY_MINUTE_CRON')
      // } else {
      //   console.log('EVERY_MINUTE_CRON_BLOCKED')
      // }
    },
    start: false
  })
}

if (SettingsConfig.menulist.find((item) => item.value == Enum.SETTINGS.OTPSETTING && item.enabled == true)) {
  CronJob.from({
    cronTime: '0 * * * *',
    onTick: function () {
      // Restrict the cron run in one instance alone if we use PM2 clusters mode
      // if (process.env.pm_id == 0) {
      OTPValidationController.unBlockOTPLimitExceededPartner()
      OTPValidationController.unBlockOTPLimitExceededCustomer()
      // } else {
      //   console.log('EVERY_MINUTE_CRON_BLOCKED')
      // }
    },
    start: false
  })
}

if (
  SettingsConfig.menulist.find(
    (item) => item.value == Enum.SETTINGS.DRIVINGTIMERESTRICTION && item.enabled == true
  )
) {
  CronJob.from({
    cronTime: '*/10 * * * * *',
    onTick: function () {
      DrivingTimeController.startDrivingTimeCron()
      console.log('EVERY_MINUTE_CRON_RUNNING_FOR_DRIVINGTIME')
    },
    start: true
  })
}
