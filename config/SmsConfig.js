/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const SmsConfig = {
  gateway: [
    {
      name: 'Twilio',
      indexName: 'twilio',
      description: '',
      status: true,
      isActive: false,
      fields: [
        {
          name: 'Account Sid',
          indexName: 'accountSid',
          type: 'string',
          value: 'ACb82e26c5207161221f33c1436f8822d1'
        },
        {
          name: 'Authentication Token',
          indexName: 'authToken',
          type: 'string',
          value: '897d1e17ba68a212b3b7e12ffe159992'
        },
        {
          name: 'Phone No',
          indexName: 'phoneNo',
          type: 'string',
          value: '+165023543178'
        }
      ]
    },
    {
      name: 'websms',
      indexName: 'websms',
      description: '',
      status: false,
      isActive: false,
      fields: [
        {
          name: 'Account Sid',
          indexName: 'accountSid',
          type: 'string',
          value: '44444444444444444444'
        },
        {
          name: 'Authentication Token',
          indexName: 'authToken',
          type: 'string',
          value: '1234567890'
        },
        {
          name: 'Phone No',
          indexName: 'phoneNo',
          type: 'string',
          value: '9999999999'
        }
      ]
    },
    {
      name: 'MSG91',
      indexName: 'msg91',
      description: '',
      status: true,
      isActive: false,
      fields: [
        {
          name: 'Auth Key',
          indexName: 'authKey',
          type: 'string',
          value: ''
        },
        {
          name: 'Template Id',
          indexName: 'templateId',
          type: 'string',
          value: ''
        },
        {
          name: 'Sender Id',
          indexName: 'senderId',
          type: 'string',
          value: 'Rebustar'
        }
      ]
    }
  ]
}
export { SmsConfig }
