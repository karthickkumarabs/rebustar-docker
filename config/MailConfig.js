/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const MailConfig = {
  gateway: [
    {
      name: 'Gmail',
      indexName: 'gmail',
      description: '',
      status: true,
      isActive: true,
      fields: [
        {
          name: 'Host',
          indexName: 'host',
          type: 'string',
          value: 'smtp.gmail.com'
        },
        {
          name: 'Port',
          indexName: 'port',
          type: 'string',
          value: '4657'
        },
        {
          name: 'Secure',
          indexName: 'secure',
          type: 'string',
          value: 'true'
        },
        {
          name: 'User',
          indexName: 'user',
          type: 'string',
          value: 'absnodes@gmail.com'
        },
        {
          name: 'Password',
          indexName: 'password',
          type: 'string',
          value: 'ptahmffjndomykru'
        }
      ]
    }
  ]
}
export { MailConfig }
