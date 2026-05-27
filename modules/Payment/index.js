/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { PaymentController as Payment } from './PaymentController.js'
import * as Stripe from './Stripe/index.js'

import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
import { WalletController } from './Wallet/WalletController.js'
import { PaystackController as Paystack } from './Paystack/controllers/PaystackController.js'
import { RazorpayController as Razorpay } from './Razorpay/controllers/RazorpayController.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/payment/merchant/:merchantId?')
  .get(authorize([Enum.ROLES.ADMIN]), Payment.getMerchant)
  .post(/* authorize([Enum.ROLES.ADMIN]),*/ Payment.addMerchant)

Router.route('/module/payment/merchantTransaction/:transactionId?')
  // .get(authorize([Enum.ROLES.ADMIN]), Payment.addMerchantTransaction)
  .post(authorize([Enum.ROLES.ADMIN]), Payment.addMerchantTransaction)

Router.route('/module/payment/transactions/:merchantId/:transactionId?').get(
  authorize([Enum.ROLES.ADMIN]),
  Payment.getTransaction
)

Router.route('/module/payment/myAccount').get(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Payment.getMyAccount
)
Router.route('/module/payment/myAccount/transactions').get(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Payment.getMyTransaction
)
Router.route('/module/payment/methods').get(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER, Enum.ROLES.ADMIN]),
  Payment.getPaymentMethods
)

Router.route('/module/payment/methods/stripe/card')
  .post(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Stripe.AddCard)
  .delete(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Stripe.RemoveCard)

Router.route('/module/payout/methods/stripe/connect').post(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER, Enum.ROLES.ADMIN]),
  Stripe.ConnectAccount
)

Router.route('/module/payout/methods/stripe/refreshAccountLink').get(Stripe.RegenerateAccountLink)
Router.route('/module/payout/methods/stripe/activateAccountLink').get(Stripe.AccountLinkActivation)

Router.route('/module/payout/methods/stripe/transfer').post(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER, Enum.ROLES.ADMIN]),
  Stripe.CreateTransfer
)

Router.route('/common/config/getpaymentconfig').get(Payment.getConfig)
Router.route('/common/config/setpaymentconfig').post(Payment.updateConfig)
Router.route('/common/config/activepaymentgateway').put(Payment.activegateway)

Router.route('/common/config/payoutConfig')
  .post(authorize([Enum.ROLES.ADMIN]), Payment.updatePayoutconfig)
  .get(authorize([Enum.ROLES.ADMIN]), Payment.getPayoutconfig)

Router.route('/module/payment/wallet/addMoney').post(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  WalletController.addMoney
)

// paystack
Router.route('/module/payment/methods/paystack/initiate').post(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Paystack.startPayment
)
Router.route('/module/payment/methods/paystack/verify/:reference').get(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Paystack.verifyPayment
)
Router.route('/module/payout/methods/paystack/recipient/:referenceId?')
  .post(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Paystack.addBankaccount)
  .put(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Paystack.updateBankaccount)
  .get(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Paystack.getBankAccount)
Router.route('/module/payout/methods/paystack/transfer')
  .post(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Paystack.initiatePayout)
  .put(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Paystack.transferPayoutAmout)

// RazorPay
Router.route('/module/payout/methods/razorpay/fundAccount')
  .post(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Razorpay.createFundAccounts)
  .get(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Razorpay.getFundAccount)

Router.route('/module/payment/methods/razorpay/initiate').post(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Razorpay.createOrder
)
Router.route('/module/payment/methods/razorpay/verify/:tripId').get(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Razorpay.verifyPayment
)
Router.route('/module/payout/methods/razorpay/transfer')
  .post(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Razorpay.initiatePayout)
  .put(authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]), Razorpay.transferPayoutAmout)
// Router.route('/razorpayRefund').post(Razorpay.RefundAmount)

Router.route('/module/payment/balance').get(
  authorize([Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Payment.GetBalance
)

export { Router as Payment }
