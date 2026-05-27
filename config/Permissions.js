/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const permissions = {
  menusList: [
    {
      menu: 'Dashboard',
      status: false,
      subMenu: false,
      module: 'dashboard',
      subMenuList: []
    },
    {
      menu: 'Site Statistics',
      status: false,
      subMenu: false,
      module: 'siteStatistics',
      subMenuList: []
    },
    {
      menu: 'Admin',
      status: false,
      subMenu: false,
      module: 'admin',
      subMenuList: []
    },
    {
      menu: 'Customer',
      status: false,
      subMenu: false,
      module: 'customer',
      subMenuList: []
    },
    {
      menu: 'Partner',
      status: false,
      subMenu: false,
      module: 'partner',
      subMenuList: []
    },
    {
      menu: 'Vehicle',
      status: false,
      subMenu: false,
      module: 'vehicle',
      subMenuList: []
    },
    {
      menu: 'Coupons',
      status: false,
      subMenu: false,
      module: 'coupons',
      subMenuList: []
    },
    {
      menu: 'Offers',
      status: false,
      subMenu: false,
      module: 'offers',
      subMenuList: []
    },
    {
      menu: 'Trips',
      status: false,
      subMenu: false,
      module: 'trips',
      subMenuList: []
    },
    {
      menu: 'Taxi Dispatch',
      status: false,
      subMenu: false,
      module: 'taxiDispatch',
      subMenuList: []
    },
    {
      menu: 'Map Views',
      status: false,
      subMenu: true,
      module: 'mapViews',
      subMenuList: [
        {
          menu: 'Partner Tracking',
          status: false,
          subMenu: false,
          module: 'partnerTracking',
          subMenuList: []
        },
        {
          menu: 'Heat Map',
          status: false,
          subMenu: false,
          module: 'heatMap',
          subMenuList: []
        }
      ]
    },
    {
      menu: 'Partner Payment',
      status: false,
      subMenu: true,
      module: 'partnerPayment',
      subMenuList: [
        {
          menu: 'Package List',
          status: false,
          subMenu: false,
          module: 'packageList',
          subMenuList: []
        },
        {
          menu: 'Settlement',
          status: false,
          subMenu: false,
          module: 'settlement',
          subMenuList: []
        },
        {
          menu: 'Payout Transaction',
          status: false,
          subMenu: false,
          module: 'payoutTransaction',
          subMenuList: []
        }
      ]
    },
    {
      menu: 'Reports',
      status: false,
      subMenu: true,
      module: 'reports',
      subMenuList: [
        {
          menu: 'Trip Payments',
          status: false,
          subMenu: false,
          module: 'tripPayments',
          subMenuList: []
        },
        {
          menu: 'Partner Attendence',
          status: false,
          subMenu: false,
          module: 'partnerAttendence',
          subMenuList: []
        },
        {
          menu: 'Expired Partners',
          status: false,
          subMenu: false,
          module: 'expiredPartners',
          subMenuList: []
        },
        {
          menu: 'Expired Vehicles',
          status: false,
          subMenu: false,
          module: 'expiredVehicles',
          subMenuList: []
        },
        {
          menu: 'Reviews',
          status: false,
          subMenu: false,
          module: 'reviews',
          subMenuList: []
        },
        {
          menu: 'Referral Reports',
          status: false,
          subMenu: false,
          module: 'referralReports',
          subMenuList: []
        }
      ]
    },
    {
      menu: 'Services',
      status: false,
      subMenu: true,
      module: 'services',
      subMenuList: [
        {
          menu: 'Rental',
          status: false,
          subMenu: false,
          module: 'rental',
          subMenuList: []
        },
        {
          menu: 'Outstation',
          status: false,
          subMenu: false,
          module: 'outstation',
          subMenuList: []
        },
        {
          menu: 'Areas',
          status: false,
          subMenu: false,
          module: 'areas',
          subMenuList: []
        },
        {
          menu: 'Services',
          status: false,
          subMenu: false,
          module: 'services',
          subMenuList: []
        },
        {
          menu: 'Pricing',
          status: false,
          subMenu: false,
          module: 'pricing',
          subMenuList: []
        },
        {
          menu: 'Pool Rides',
          status: false,
          subMenu: false,
          module: 'poolRides',
          subMenuList: []
        }
      ]
    },
    {
      menu: 'Multilingual',
      status: false,
      subMenu: true,
      module: 'multilingual',
      subMenuList: [
        {
          menu: 'Languages',
          status: false,
          subMenu: false,
          module: 'languages',
          subMenuList: []
        },
        {
          menu: 'Translations',
          status: false,
          subMenu: false,
          module: 'translations',
          subMenuList: []
        }
      ]
    },
    {
      menu: 'Utility',
      status: false,
      subMenu: true,
      module: 'utility',
      subMenuList: [
        {
          menu: 'Document',
          status: true,
          subMenu: true,
          module: 'document',
          subMenuList: []
        },
        {
          menu: 'Onboard',
          status: false,
          subMenu: false,
          module: 'onboard',
          subMenuList: []
        },
        {
          menu: 'Admin Group',
          status: false,
          subMenu: false,
          module: 'adminGroup',
          subMenuList: []
        },
        {
          menu: 'Countries',
          status: false,
          subMenu: false,
          module: 'countries',
          subMenuList: []
        },
        {
          menu: 'States',
          status: false,
          subMenu: false,
          module: 'states',
          subMenuList: []
        },
        {
          menu: 'Cities',
          status: false,
          subMenu: false,
          module: 'cities',
          subMenuList: []
        },
        {
          menu: 'Currencies',
          status: false,
          subMenu: false,
          module: 'currencies',
          subMenuList: []
        },
        {
          menu: 'Makes',
          status: false,
          subMenu: false,
          module: 'makes',
          subMenuList: []
        },
        {
          menu: 'Models',
          status: false,
          subMenu: false,
          module: 'models',
          subMenuList: []
        },
        {
          menu: 'App Cms',
          status: false,
          subMenu: false,
          subMenuList: []
        },
        {
          menu: 'SOS Alert Settings',
          status: false,
          subMenu: false,
          module: 'sosalertsettings',
          subMenuList: []
        },
        {
          menu: 'Year',
          status: false,
          subMenu: false,
          module: 'year',
          subMenuList: []
        },
        {
          menu: 'Cancellation Reason',
          status: false,
          subMenu: false,
          module: 'cancellationreason',
          subMenuList: []
        },
        {
          menu: 'Feedback',
          status: false,
          subMenu: false,
          module: 'feedback',
          subMenuList: []
        },
        {
          menu: 'Send Notifications',
          status: false,
          subMenu: false,
          module: 'sendnotifications',
          subMenuList: []
        },
        {
          menu: 'Document',
          status: true,
          subMenu: false,
          module: 'document',
          subMenuList: []
        },
        {
          menu: 'Youtube Section',
          status: false,
          subMenu: false,
          module: 'youtubesection',
          subMenuList: []
        },
        {
          menu: 'Media Section',
          status: false,
          subMenu: false,
          module: 'mediasection',
          subMenuList: []
        }
      ]
    },
    {
      menu: 'Settings',
      status: false,
      subMenu: false,
      module: 'settings',
      subMenuList: []
    }
  ]
}
export { permissions }
