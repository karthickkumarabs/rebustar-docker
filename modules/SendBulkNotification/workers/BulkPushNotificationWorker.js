/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import Customer from '../../../models/Auth/Customer.js'
import Partner from '../../../models/Auth/Partner.js'
import FCMController from '../controllers/function.js'

function createPLimit(concurrency) {
  let activeCount = 0
  const queue = []

  const next = () => {
    if (queue.length === 0 || activeCount >= concurrency) return
    activeCount++
    const { fn, resolve, reject } = queue.shift()
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        activeCount--
        next()
      })
  }

  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      next()
    })
}

// function withTimeout(promise, ms) {
//   return Promise.race([
//     promise,
//     new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
//   ])
// }

// async function retry(fn, maxRetries = 2, delayMs = 300) {
//   let attempt = 0
//   while (attempt <= maxRetries) {
//     try {
//       return await fn()
//     } catch (error) {
//       if (attempt === maxRetries) throw error
//       attempt++
//       console.warn(` Retry #${attempt} due to: ${error.message}`)
//       await new Promise((res) => setTimeout(res, delayMs))
//     }
//   }
// }

const mockDelay = (ms = 200) => new Promise((res) => setTimeout(res, ms))

export async function sendPushNotificationWorker({
  message,
  forWhom,
  forType,
  scId,
  partnerId,
  customerId,
  mockMode = false,
  description,
  image
}) {
  if (mongoose.connection.readyState === 0) {
    await Mongo()
  }

  // 1. Determine if we are targeting Partners or Customers early
  const isPartner = !forWhom.toLowerCase().includes('customer')
  let findQuery = { fcmId: { $ne: '' } }

  const filters = {
    AllPartners: {},
    OnlinePartners: { online: true },
    OfflinePartners: { online: false },
    InactivePartners: { status: 'Inactive' },
    PendingPartners: { status: 'Pending' },
    Partners: (data) => ({ code: data.code }),
    SpecificPartner: (data) => ({ _id: data.partnerId }),
    SpecificCustomer: (data) => ({ _id: data.customerId }),
    AllCustomers: () => ({}),
    InactiveCustomers: () => ({ status: 'Inactive' }),
    PendingCustomers: () => ({ status: 'Pending' })
  }

  const filter = filters[forWhom]
  if (typeof filter === 'function') {
    findQuery = { ...findQuery, ...filter({ partnerId, customerId, code: forWhom }) }
  } else if (typeof filter === 'object') {
    findQuery = { ...findQuery, ...filter }
  }

  if (scId) {
    findQuery.scId = Array.isArray(scId) ? { $in: scId } : scId
  }

  const Model = isPartner ? Partner : Customer
  const projection = { fcmId: 1, phone: 1, phCode: 1, name: 1, fname: 1, lname: 1 }
  const docs = await Model.find(findQuery, projection).lean()

  if (!docs.length) {
    return { success: false, message: 'NO_USERS_FOUND', count: 0 }
  }

  const batchSize = 500
  const concurrency = mockMode ? 100 : 75
  const limit = createPLimit(concurrency)

  // TYPE 1: Push Notifications
  if (forType === 1) {
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize)
      const fcmIdsBatch = batch.map((doc) => doc.fcmId).filter(Boolean)
      const batchNumber = i / batchSize + 1

      console.log(`Sending push notification batch ${batchNumber} with ${batch.length} users`)
      console.time(`Batch ${batchNumber} duration`)

      if (mockMode) {
        await Promise.allSettled(
          batch.map((doc) =>
            limit(async () => {
              const fullName = doc.name || `${doc.fname || ''} ${doc.lname || ''}`.trim()
              await mockDelay(200)
              console.log(`[MockMode] Push sent to: ${fullName} (${doc.phone})`)
            })
          )
        )
      } else {
        const startTime = Date.now()
        try {
          // Added await here to ensure the batch completes

          console.log('item', fcmIdsBatch.length)
          await FCMController.SendOneTimeBulkPush(fcmIdsBatch, message, description, image)
        } catch (err) {
          const duration = Date.now() - startTime
          console.error(`❌ Batch ${batchNumber} FAILED [${duration}ms]:`, err.message || err)
        }
      }
      console.timeEnd(`Batch ${batchNumber} duration`)
    }
  }
  // TYPE 2: SMS
  else {
    const smsPromises = docs.map((doc) => {
      if (mockMode) {
        console.log(`[MockMode] SMS sent to: ${doc.name} (${doc.phone})`)
        return Promise.resolve()
      } else {
        console.log(`📲 Sending real SMS to: ${doc.name} (${doc.phone})`)
        return FCMController.sendSMS([doc], message, isPartner)
      }
    })
    await Promise.allSettled(smsPromises)
  }

  return { success: true, count: docs.length }
}
