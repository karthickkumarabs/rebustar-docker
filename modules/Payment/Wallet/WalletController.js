/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import Merchant from '../../../modules/Payment/models/Merchant.js'
import { Enum } from '../../../utils/Enum.js'
import { PaymentServices } from '../PaymentService.js'
import { NotifcationController } from '../../../controllers/Notification/Index.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import Customer from '../../../models/Auth/Customer.js'
import Partner from '../../../models/Auth/Partner.js'
import Trips from '../../../models/ServiceModule/Trip.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class WalletController extends BaseController {
  constructor() {
    super()
  }

  static async DeductwalletAmount(tripData) {
    const res = {
      success: true,
      message: 'Success',
      data: {}
    }
    try {
      const Checktripamount = await this.CheckFinaltripamount(tripData)
      const commision = Helpers.roundOff(tripData.invoice.earnings + tripData.invoice.companycommission)
      if (Checktripamount.success == false) {
        res.success = false
        res.message = Checktripamount.message
      } else {
        console.log('Checktripamount', Checktripamount)
        const walletDebitAmount = Checktripamount.data.walletDebitAmount
        const remainingAmount = Checktripamount.data.remainingAmount
        if (walletDebitAmount > 0) await this.Customersettlement(tripData, walletDebitAmount)
        console.log('Checktripamount.data.remainingAmount', remainingAmount)
        if (walletDebitAmount == 0) {
          res['paymentMode'] = Enum.PAYMENT.MODE.DEBIT
          res['payableToDriver'] = commision
        }
        if (remainingAmount > 0) {
          const payableToDriver = Number(walletDebitAmount) - Number(commision)
          res['paymentMode'] = Enum.PAYMENT.MODE.CREDIT
          res['payableToDriver'] = payableToDriver
          console.log('notificATION')
          const customer = await Customer.findOne({ _id: tripData.customer.id }, { fcmId: 1 }).lean().exec()
          const partner = await Partner.findOne({ _id: tripData.partner.id }, { fcmId: 1 }).lean().exec()
          const obj = {
            name: 'Balance Cash Amount',
            actual: tripData.invoice.totalFare,
            fare: remainingAmount,
            fareType: Enum.PAYMENT.MODE.CASH
          }
          await Trips.updateOne({ _id: tripData._id }, { $push: { 'invoice.additional': obj } })
          const status = await NotifcationController.createNotification({
            processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
            data: {
              pushToken: customer.fcmId,
              title: 'Ride',
              body: `Your Wallet has been debited with ${walletDebitAmount} But Trip Amount is ${tripData.invoice.totalFare} so you need to pay with cash for ${remainingAmount} to our Partner `,
              template: 'insufficientWalletBalance',
              templateData: {
                currency: tripData.currency,
                remainingAmount: remainingAmount
              }
            }
          })
          console.log('status', status)

          const status1 = await NotifcationController.createNotification({
            processType: [Enum.NOTIFICATION.TYPE.PUSHNOTIFICATION],
            data: {
              pushToken: partner.fcmId,
              title: 'Ride',
              body: `You Need to Collect Remaining Amount ${remainingAmount} from Customer`,
              template: 'paycashForRemainingAmount',
              templateData: {
                currency: tripData.currency,
                remainingAmount: remainingAmount
              }
            }
          })
          console.log('status1', status1)
        }
      }
      return res
    } catch (error) {
      console.log('wallet error', error)

      res.success = false
      res.message = 'Error in payment process'
      res.data = error
      return res
    }
  }

  static async CheckFinaltripamount(tripData) {
    const res = {
      success: true,
      message: 'Success',
      data: {}
    }
    try {
      let remainingAmount = 0
      let walletDebitAmount = Number(tripData.invoice.totalFare)
      console.log('walletDebitAmount1', walletDebitAmount)

      let walletData = await Merchant.findOne(
        { userId: tripData.customer.id, userType: Enum.ROLES.CUSTOMER },
        { balance: 1 }
      )
        .lean()
        .exec()
      if (!walletData)
        walletData = await PaymentServices.addMerchant({
          userId: tripData.customer.id,
          userType: Enum.ROLES.CUSTOMER
        })
      const walletAmount = parseFloat(walletData.balance)
      console.log('walletAmount1', walletAmount)

      if (walletAmount < walletDebitAmount) {
        remainingAmount = Number(walletDebitAmount) - Number(walletAmount)
        console.log('remainingAmount', remainingAmount)

        walletDebitAmount = Number(walletDebitAmount) - Number(remainingAmount)
        console.log('walletDebitAmount2', walletDebitAmount)
      }
      res.success = true
      res.message = 'Wallet found'
      res.data = {
        remainingAmount: remainingAmount,
        walletDebitAmount: walletDebitAmount
      }
      return res
    } catch (error) {
      res.success = false
      res.message = 'Wallet Not found'
      res.data = {}
      return res
    }
  }
  static async Customersettlement(tripData, walletDebitAmount) {
    const transactionData = {
      referenceId: tripData.referenceNo,
      description: 'TRIP_PAYMENT_' + tripData.referenceNo,
      paymentMode: Enum.PAYMENT.MODE.DEBIT,
      userId: tripData.customer.id,
      userType: Enum.ROLES.CUSTOMER,
      serviceArea: tripData.serviceArea,
      amount: walletDebitAmount
    }
    const transferAmountToPartner = await PaymentServices.merchantTransaction(transactionData)
    if (!transferAmountToPartner.status) {
      throw new Error(transferAmountToPartner.message)
    }
  }
  static async addMoney(req, res) {
    try {
      const authData = req.auth
      const bodyData = req.body
      const merchantPayment = await PaymentServices.merchantPayment({
        userId: authData.userId,
        userType: authData.role,
        referenceId: '',
        paymentMethod: bodyData.paymentMethod,
        paymentMethodId: bodyData.paymentMethodId,
        amount: Number(bodyData.amount),
        currency: bodyData.currencyCode,
        description: 'WALLET_PAYMENT'
      })
      if (!merchantPayment?.status) throw new Error(merchantPayment.message)
      const transactionData = {
        referenceId: '',
        description: 'WALLET_PAYMENT',
        paymentMode: Enum.PAYMENT.MODE.CREDIT,
        userId: authData.userId,
        userType: authData.role,
        serviceArea: null,
        amount: Number(bodyData.amount)
      }
      const transferAmountToPartner = await PaymentServices.merchantTransaction(transactionData)
      if (!transferAmountToPartner.status) {
        throw new Error(transferAmountToPartner.message)
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'WALLET_AMOUNT'
      )({ message: 'WALLET AMOUNT ADDED SUCCESSFULLY', balance: transferAmountToPartner.data.balance })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static async checkWalletBalance(customerId, tripFare) {
    let walletData = await Merchant.findOne(
      { userId: customerId, userType: Enum.ROLES.CUSTOMER },
      { balance: 1 }
    )
      .lean()
      .exec()
    if (!walletData)
      walletData = await PaymentServices.addMerchant({
        userId: customerId,
        userType: Enum.ROLES.CUSTOMER
      })
    const walletAmount = parseFloat(walletData.balance)
    return walletAmount >= tripFare
  }
}

export { WalletController }
