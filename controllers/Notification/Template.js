/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
export const Template = {
  pushNotification: {
    partnerRequest: 'You got a ride',
    partnerAccept: 'Your ride request has been accepted by us',
    partnerArrive: 'Our partner was arrived on pickup location',
    partnerStart: 'Happy Journey',
    partnerEnd: 'We hope you enjoy this journey with our partner',
    partnerDecline: 'Your ride request has been declined by partner',
    partnerCancel: 'Your ride has been cancelled by partner',
    customerCancel: 'Your ride has been cancelled by customer',
    paymentCustomerFailure: 'Your payment was failure, please check the trip invoice',
    paymentPartnerFailure: 'Customer payment was failure, please check the trip invoice',
    insufficientWalletBalance:
      'Your wallet balance is insufficient. Kindly pay {{currency}} {{remainingAmount}} in cash to our partner.',
    paycashForRemainingAmount: 'You need to collect {{currency}} {{remainingAmount}} in cash.',
    intermediateStopArrived: "You've arrived at {{stop}}.",
    intermediateStopStart: 'All set! On the way to {{stop}}.',
    sosAlert: '{{driverName}} has sent an emergency alert. Tap to respond.'
  },
  SMSNotification: {
    OTP: 'Your verification code: {{otp}}'
  }
}
