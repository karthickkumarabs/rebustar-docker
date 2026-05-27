/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const featuresSettings = {
  isCityWise: false,
  isServiceAvailable: false,
  isMultipleCompaniesAvailable: false,
  isMultipleCompaniesPartnersAvailable: false,
  isCommisionToAdmin: false,
  isDoubleChargeNeeded: false,
  fareCalculationType: 'normal',
  gst: {
    gstFareBreakPercentage: 85,
    gstOnFareBreakPercentage1: 5,
    gstOnFareBreakPercentage2: 18
  },
  applyTravelFare: true,
  applyValues: {
    applyNightCharge: false,
    applyPeakCharge: true,
    applyWaitingTime: true,
    applyTax: true,
    applyCommission: true,
    applyPickupCharge: true
  },
  isUpdatePartnerPerDayEarnings: false,
  isETANeeded: false,
  isCustomerCancellationAmtApplicable: true,
  isPartnerCancellationAmtApplicable: false,
  calculatePartnerEarningAtEveryDay: false,
  applyBlockOldCancellationAmt: true,
  isPartnerCreditModuleEnabled: true,
  isPartnerSubscriptionWorkWithTripConcept: true,
  addBookingFeeToCommision: false,
  isCustomerSubscription: true,
  partnerPayouts: {
    adminCommision: 'partnerWallet',
    payoutType: 'partnerPrepaidWallet',
    deductAmountFromPartnerWallet: 'commision',
    partnerCreditAmountAlertLimit: 100,
    partnerCreditAmountOfflineLimit: 0,
    partnerPayoutAmountLimitMax: 100,
    partnerStripeConnect: true,
    partnerStripeConnectCountry: 'US',
    partnerStripeSplitPayout: true,
    partnerStripeSplitPayoutDirectlyAtEveryTripEnd: true,
    partnerDirectPayout: true
  },
  customerWallet: true,
  liveTaxiMeter: false,
  applyAdditionalKMFareModel: false,
  customerRechargeWalletInClientSide: false,
  customerCard: true,
  customerTripPaidInClientSide: false,
  defaultPhoneCode: '+91',
  defaultlang: 'EN',
  defaultcur: 'USD',
  defaultCountryId: '101',
  defaultStateId: '35',
  primarycur: 'USD',
  secondarycur: true,
  secondarycurName: 'INR',
  secondarycurSymbol: '$',
  conversionRate: 3,
  roundOff: 2,
  referalSettings: {
    isCustomerReferalCodeAvailable: 'true',
    customerReferalAmount: 0,
    customerRefererAmount: 25,
    isPartnerReferalCodeAvailable: 'true',
    partnerRefererAmount: 25,
    partnerReferalAmount: 0
  },
  isCompanyPriorityPartnerRequest: false,
  isPromoCodeAvailable: true,
  isOffersForRideAvailable: false,
  passwordVerificationMethod: 'sms',
  passwordVerificationMethodForUser: 'sms',
  registerOTPVerificationMethod: 'sms',
  tripsAvailable: ['Daily', 'Package', 'Outstation'],
  hailTaxi: false,
  shareTaxi: false,
  socialLogin: false,
  callMasking: false,
  addFareWithServices: false,
  payPackageTypes: ['commision', 'subscription'],
  expirationNotificationBefore: 3,
  addAdditionalFaresInTrip: false,
  defaultPaymentMethod: 'cash',
  customerSignupBonus: false,
  customerSignupBonusAmount: 0,
  applyMandatoryDiscount: false,
  discountsAvailable: [
    {
      name: 'Signup',
      percentage: 5
    }
  ],
  updatePartnerPerDayOnlineTime: false,
  getVehicleListAlongWithFeatures: false,
  convertAllFareToNearbyFive: false,
  convertAllFareToGivenMultipler: false,
  multipler: 1,
  dobMandatory: false,
  redTaxiModel: false,
  manualPickupChargeFromMTD: false,
  addETAtoServicevehicles: false,
  latestYearList: false,
  latestYearCount: 5,
  requestPartnerWithInStateAllowed: false,
  multipleZones: false,
  partnerDocumentExpiryReasons: [
    {
      key: 'insuranceexp',
      value: 'Insurance'
    },
    {
      key: 'licenceexp',
      value: 'Licence'
    },
    {
      key: 'passingexp',
      value: 'Passing'
    }
  ],
  taxiDocumentExpiryReasons: [
    {
      key: 'permitDate',
      value: 'Permit'
    },
    {
      key: 'insuranceDate',
      value: 'Insurance'
    },
    {
      key: 'registrationDate',
      value: 'FitnessCertificate '
    }
  ],
  checkDropPoint: true,
  languages: ['en', 'es'],
  adminLanguages: ['en', 'es'],
  landingLanguages: ['en', 'es'],
  apiOptimisation: {
    distanceMatrix: false
  },
  partnerCanAddMultipleVehicleCategory: false,
  checkInactiveCon: true,
  updateTripPaths: true,
  locationUpdateAfter: {
    daily: 1,
    rental: 10,
    outstation: 20
  },
  isMultiStopNeeded: false,
  addOldCancelationAmountInEstimation: true
}
//   module.exports = featuresSettings
export { featuresSettings }
