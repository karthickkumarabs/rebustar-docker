/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Enum } from '../utils/Enum.js'
const Feature = {
  account: {
    minPassword: 8,
    maxPassword: 16,
    verification: {
      phone: true,
      email: true
    },
    customerPrefix: 'CUS',
    customerStart: '1000',
    partnerPrefix: 'PAR',
    partnerStart: '1000'
  },
  modules: [Enum.MODULES.DAILY],
  partnerDocumentExpiryReasons: [
    {
      key: 'drivingLicense',
      value: 'Licence Expired'
    },
    {
      key: 'Insurance',
      value: 'Insurance Expired'
    },
    {
      key: 'idProof',
      value: 'Idproof Expired'
    }
  ],
  vehicleDocumentExpiryReasons: [
    {
      key: 'insurance',
      value: 'Insurance Expired'
    }
  ]
}

export { Feature }
