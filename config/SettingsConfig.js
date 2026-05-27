/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Enum } from '../utils/Enum.js'

const SettingsConfig = {
  menulist: [
    {
      menu: 'GENERAL_SETTINGS',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.GENERALSETTING,
      icon: 'settings-outline',
      apiurl: '/common/configuration'
    },
    {
      menu: 'FIREBASE_SETTINGS',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.FIREBASESETTING,
      icon: 'layers-outline',
      apiurl: '/common/configuration/firebase'
    },
    {
      menu: 'EMAIL_GATEWAY',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.EMAILGATEWAY,
      icon: 'email-outline',
      apiurl: '/common/config/getmailconfig'
    },
    {
      menu: 'SMS_GATEWAY',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.SMSGATEWAY,
      icon: 'message-circle-outline',
      apiurl: '/common/config/getsmsconfig'
    },
    {
      menu: 'PAYMENT_GATEWAY',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.PAYMENTGATEWAY,
      icon: 'credit-card-outline',
      apiurl: '/common/config/getpaymentconfig'
    },
    {
      menu: 'REFERRAL_SETTINGS',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.REFERRALSETTING,
      icon: 'people-outline'
    },
    {
      menu: 'SIGNUP_BONUS',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.SIGNUPSETTING,
      icon: 'gift-outline'
    },
    {
      menu: 'CANCELLATION_SETTING',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.CANCELLATIONSETTING,
      icon: 'gift-outline'
    },
    {
      menu: 'BIDDING_SETTING',
      enabled: false,
      display: true,
      value: Enum.SETTINGS.BIDDINGSETTING,
      icon: 'gift-outline'
    },
    {
      menu: 'DB_BACKUP',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.DBBACKUP,
      icon: 'credit-card-outline'
    },
    {
      menu: 'EMAIL_TEMPLATE',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.EMAILTEMPLATE,
      icon: 'email-outline'
    },
    {
      menu: 'THEME_SETTINGS',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.THEMESETTING,
      icon: 'layers-outline'
    },
    {
      menu: 'MULTISTOP_SETTINGS',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.MULTISTOPSETTING,
      icon: 'layers-outline'
    },
    {
      menu: 'DOCUMENT_SETTINGS',
      enabled: true,
      display: true,
      value: Enum.SETTINGS.DOCUMENTSETTINGS,
      icon: 'layers-outline'
    },
    {
      menu: 'PARTNER_SOUND_QR_SHOW_SETTINGS',
      enabled: false,
      display: true,
      value: Enum.SETTINGS.PARTNERSOUNDQRSHOWSETTINGS,
      icon: 'layers-outline'
    },
    {
      menu: 'OTP_SETTINGS',
      enabled: true,
      display: false,
      value: Enum.SETTINGS.OTPSETTING,
      icon: 'layers-outline'
    },
    {
      menu: 'SOCIAL_LOGIN_SETTINGS',
      enabled: true,
      display: false,
      value: Enum.SETTINGS.SOCIALLOGINSETTINGS,
      icon: 'layers-outline'
    },
    {
      menu: 'HAILTRIP_SETTINGS',
      enabled: true,
      display: false,
      value: 'HAILTRIPSETTINGS',
      icon: 'credit-card-outline'
    },
    {
      menu: 'SUBSCRIPTION_SETTINGS',
      enabled: false,
      display: false,
      value: Enum.SETTINGS.SUBSCRIPTIONSETTING,
      icon: 'layers-outline'
    },
    {
      menu: 'SOCIALLINK_SETTINGS',
      enabled: true,
      display: false,
      value: 'SOCIALLINKSETTINGS',
      icon: 'credit-card-outline'
    },
    {
      menu: 'MEDIA_SETTINGS',
      enabled: true,
      display: false,
      value: 'MEDIASETTINGS',
      icon: 'credit-card-outline'
    },
    {
      menu: 'DRIVING_TIME_RESTRICTION',
      enabled: false,
      display: false,
      value: Enum.SETTINGS.DRIVINGTIMERESTRICTION,
      icon: 'layers-outline'
    },
    {
      menu: 'PARTNER_SERVICE_CONFIG_SETTINGS',
      enabled: true,
      display: true,
      value: 'PARTNERSERVICECONFIGSETTINGS',
      icon: 'credit-card-outline'
    }
  ]
}
export { SettingsConfig }
