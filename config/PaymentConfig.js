/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const PaymentConfig = {
  gateway: [
    {
      name: 'Cash',
      indexName: 'CASH',
      description: '',
      status: true,
      isActive: true,
      fields: [
        {
          name: 'Icon',
          indexName: 'icon',
          type: 'file',
          value: 'public/payments/cash.png'
        }
      ]
    },
    {
      name: 'Wallet',
      indexName: 'WALLET',
      description: '',
      status: true,
      isActive: true,
      fields: [
        {
          name: 'Icon',
          indexName: 'icon',
          type: 'file',
          value: 'public/payments/cash.png'
        }
      ]
    },
    {
      name: 'Razorpay',
      indexName: 'RAZORPAY',
      description: '',
      status: true,
      isActive: true,
      fields: [
        {
          name: 'Currency',
          indexName: 'currency',
          type: 'string',
          value: 'IND'
        },
        {
          name: 'Account Number',
          indexName: 'accountNumber',
          type: 'string',
          value: '2323230007960194'
        },
        {
          name: 'Public Key',
          indexName: 'publicKey',
          type: 'string',
          value: 'rzp_test_RDwUk7PMC1epLO'
        },
        {
          name: 'Secret Key',
          indexName: 'secretKey',
          type: 'string',
          value: 'OHFLhIZHLJ6VaEDjyQFTRU2N'
        },
        {
          name: 'Icon',
          indexName: 'icon',
          type: 'file',
          value: 'public/payments/razorpay.png'
        }
      ]
    },
    {
      name: 'Paystack',
      indexName: 'PAYSTACK',
      description: '',
      status: false,
      isActive: false,
      fields: [
        {
          name: 'Public Key',
          indexName: 'publicKey',
          type: 'string',
          value: 'pk_test_77b257cfdb4f44e46bca230d51cd1fa7092f06ce'
        },
        {
          name: 'Secret Key',
          indexName: 'secretKey',
          type: 'string',
          value: 'sk_test_69e9eaa6fcfa29fa7a5a35572c98033cd2ea8b1a'
        },
        {
          name: 'Currency',
          indexName: 'currency',
          type: 'string',
          value: 'NGN'
        },
        {
          name: 'Icon',
          indexName: 'icon',
          type: 'file',
          value: 'public/payments/paystack.png'
        }
      ]
    }
  ]
}
export { PaymentConfig }
