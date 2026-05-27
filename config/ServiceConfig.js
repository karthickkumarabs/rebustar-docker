/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
export const ServiceConfig = {
  basics: {
    tookPartner: 5,
    acceptDuration: 130000,
    requestRadius: 5000,
    serviceDuration: 150000,
    partnerSearchRetryInterval: 2000,
    requestLimit: 5,
    partnerAssigmentType: 'Bulk',
    noOfPartnerSearch: 5,
    averageSpeed: 30,
    allowMultipleRequestToPartner: true
  },
  service: [
    {
      name: 'Daily',
      slug: 'daily',
      description: '',
      image: 'public/asset/Services/daily.png',
      status: true
    },
    {
      name: 'Rental',
      slug: 'rental',
      description: '',
      image: 'public/asset/Services/rental.png',
      status: true
    },
    {
      name: 'Outstation',
      slug: 'outstation',
      description: '',
      image: 'public/asset/Services/outstation.png',
      status: true
    },
    {
      name: 'Hail',
      slug: 'hail',
      description: '',
      image: 'public/asset/Services/hail.png',
      status: false
    }
  ],
  cancelReasons: {
    customer: [
      'Waiting for long time',
      'Unable to contact driver',
      'Driver denied to go to destination',
      'Driver denied to come pickup',
      'Wrong address shown',
      'The price is not reasonable'
    ],
    partner: [
      'Waiting for long time',
      'Unable to contact customer',
      'Customer not in the pickup',
      'The price is not reasonable',
      'Distance so long to pickup'
    ]
  },
  feedBacks: {
    customer: ['Comfortable Ride', 'Affortable', 'Professional Driver', 'Cleaness'],
    partner: ['Comfortable Ride', 'Affortable', 'Friendly Customer', 'Cleaness']
  }
}
