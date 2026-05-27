/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'
import { parentPort, workerData } from 'worker_threads'
import { PayoutConfig } from './PayoutConfig.js'
import * as Stripe from './Stripe/index.js'
import { Mongo } from '../../server/Mongo.js'

function chunkData(data, chunkSize) {
  const chunks = []
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize))
  }
  return chunks
}

function calculatePayoutAmount(balance) {
  const amount = Math.min(balance, PayoutConfig.PayoutAmountLimitMax)
  if (balance < PayoutConfig.PayoutAmountLimitMin) return 0
  return PayoutConfig.TransactionFeeisApply ? amount - PayoutConfig.TransactionFee : amount
}

const payoutWorker = async () => {
  Mongo().then(async (data) => {
    const merchants = workerData.data
    const chunkSize = 1000
    const chunkarray = chunkData(merchants, chunkSize)
    for (const merchantChunks of chunkarray) {
      for (const merchant of merchantChunks) {
        const existIndex = merchant.payoutMethods?.find(
          (method) => method.module === 'STRIPE' && !method.deletedAt && method.referenceId
        )
        if (existIndex != -1) {
          const amountToPayout = calculatePayoutAmount(Number(merchant.balance))
          if (amountToPayout > 0) {
            const payoutObj = {
              amount: Number(amountToPayout.toFixed()),
              merchant: merchant
            }
            await Stripe.CreateTransferService(payoutObj)
          }
        }
      }
    }
    mongoose.connection.close()
  })
}

payoutWorker()
  .then((result) => {
    parentPort.postMessage(result)
  })
  .catch((error) => {
    console.error('PAYOUT_WORKER_ERROR', error)
    parentPort.postMessage({ error: error.message })
  })
