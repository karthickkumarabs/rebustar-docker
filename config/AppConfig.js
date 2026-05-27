/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const Config = {
  mode: 'development',
  port: 4015,
  installation: 1,
  app: {
    port: 4015,
    name: 'Rebustar',
    env: 'dev',
    language: 'en',
    phoneCode: '+1',
    currency: '$',
    currencyCode: 'USD',
    utcOffset: '+05:30',
    logo: 'public/logo.png',
    favicon: 'public/favicon.ico',
    baseurl: 'https://rebustarv3api.abservetechdemo.com',
    shareTrip: 'https://rebustar.abservetechdemo.com/#/share-trip/',
    distanceMetric: 'KILOMETER',
    timeMetric: 'MINUTE'
  },
  auth: {
    cipherKey: 'abs-auth-key'
  },
  // database: 'mongodb://rebustarv3user:GGGJyjyfJTGTY@0.0.0.0:27017/rebustarv3',
  database: 'mongodb://mongodb:27017/rebustarv3',
  winiston: {
    logpath: '/iLrnLogs/logs/'
  },
  locale: ['en', 'ta', 'fr'],
  firebasekey: {
    apiKey: 'AIzaSyD_dibd6HEoB4mJFYECun4vSv8lQmsk1HU',
    authDomain: 'rebustar-v3.firebaseapp.com',
    databaseURL: 'https://rebustar-v3-default-rtdb.firebaseio.com',
    projectId: 'rebustar-v3',
    storageBucket: 'rebustar-v3.appspot.com',
    messagingSenderId: '695448118211',
    appId: '1:695448118211:web:1e1119c4dffc76c6df5376'
  },
  mapConfig: {
    mapId: 'd19a64bc7b1acd53',
    websiteKey: 'AIzaSyD_dibd6HEoB4mJFYECun4vSv8lQmsk1HU',
    serverKey: 'AIzaSyD_dibd6HEoB4mJFYECun4vSv8lQmsk1HU',
    androidKey: 'AIzaSyD_dibd6HEoB4mJFYECun4vSv8lQmsk1HU',
    iosKey: 'AIzaSyD_dibd6HEoB4mJFYECun4vSv8lQmsk1HU'
  },
  productLinks: {
    shareTrip: 'https://rebustar.abservetechdemo.com/#/share-trip/',
    androidCustomer: '#',
    androidPartner: '#',
    iosCustomer: '#',
    iosPartner: '#'
  },
  socialLinks: [
    {
      name: 'faceBook',
      link: 'https://facebook.com',
      icon: 'public/icon-1738039364163.jpg'
    },
    {
      name: 'instagram',
      link: 'https://Instagram.com',
      icon: 'public/icon-1738039467587.jpg'
    },
    {
      name: 'twitter',
      link: 'https://twitter.com',
      icon: 'public/icon-1738040068166.jpg'
    },
    {
      name: 'telegram',
      link: 'https://telegram.com',
      icon: 'public/icon-1738042372149.jpg'
    }
  ],
  isEncrypt: false
}
export { Config }
