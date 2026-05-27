/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseValidator } from '../BaseValidator.js'
import { Feature } from '../../config/FeatureConfig.js'

class AuthValidator extends BaseValidator {
  constructor() {
    super()
  }
  static schemas = {
    loginAdmin: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' },
        password: { type: 'string' }
      },
      required: ['password'],
      oneOf: [{ required: ['email'] }, { required: ['phone', 'phoneCode'] }],
      additionalProperties: false
    },
    createAdmin: {
      type: 'object',
      properties: {
        fname: { type: 'string' },
        lname: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' },
        group: { type: 'string', ObjectId: true }
      },
      required: ['fname', 'lname'],
      anyOf: [
        {
          required: ['phone']
        },
        {
          required: ['email'],
          propertyNames: { not: { enum: ['phone', 'phoneCode'] } }
        }
      ]
      // additionalProperties: false
    },
    getAdmin: {
      type: 'object',
      properties: {
        _sort: { type: 'string' },
        _order: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        group: { type: 'string' }
      }
      // required: ["_sort", "_order"],
      // additionalProperties: false
    },
    updateAdmin: {
      type: 'object',
      properties: {
        fname: { type: 'string' },
        lname: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' },
        group: { type: 'string', ObjectId: true }
      },
      required: ['fname', 'lname']

      // additionalProperties: false
    },
    getAdminGroup: {
      type: 'object',
      properties: {
        _sort: { type: 'string' },
        _order: { type: 'string' },
        group: { type: 'string' }
      },
      additionalProperties: false
    },
    createAdminGroup: {
      type: 'object',
      properties: {
        group: { type: 'string' },
        description: { type: 'string' },
        permission: { type: 'array' }
      },
      additionalProperties: false
    },
    loginPartner: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' },
        password: { type: 'string' },
        userType: { type: 'string' },
        verifyBy: { type: 'string' },
        verifyFrom: { type: 'string' },
        code: { type: 'string' },
        fcmId: { type: 'string' }
      },
      oneOf: [{ required: ['email'] }, { required: ['phone', 'phoneCode'] }],
      additionalProperties: false
    },
    getPartnerExists: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' }
      },
      oneOf: [{ required: ['email'] }, { required: ['phone', 'phoneCode'] }],
      additionalProperties: false
    },
    createPartner: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        fname: { type: 'string' },
        lname: { type: 'string' },
        email: { type: 'string' },
        phcode: { type: 'string' },
        phone: { type: 'string' },
        gender: { type: 'string' },
        DOB: { type: 'string' },
        cnty: { type: 'string' },
        cntyname: { type: 'string' },
        state: { type: 'string' },
        statename: { type: 'string' },
        city: { type: 'string' },
        cityname: { type: 'string' },
        cmpy: { type: 'string' },
        isIndividual: { type: 'string' },
        lang: { type: 'string' },
        cur: { type: 'string' },
        actMail: { type: 'string' },
        actHolder: { type: 'string' },
        actNo: { type: 'string' },
        actBank: { type: 'string' },
        actLoc: { type: 'string' },
        actCode: { type: 'string' },
        fcmId: { type: 'string' },
        nic: { type: 'string' },
        scId: { type: 'string' },
        scity: { type: 'string' },
        isPartnerAllowedOtherStates: { type: 'boolean' },
        status: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              curstatus: { type: 'string' }
            }
          }
        },
        referenceCode: { type: 'string' },
        loginType: { type: 'string' },
        password: {
          type: 'string',
          minLength: Feature.account.minPassword || 1,
          maxLength: Feature.account.maxPassword || 1
        }
      },
      required: ['fname', 'lname', 'gender', 'password', 'confirmPassword'],
      anyOf: [
        {
          required: ['phone', 'phoneCode']
        },
        {
          required: ['email'],
          propertyNames: { not: { enum: ['phone', 'phoneCode'] } }
        }
      ]
      // additionalProperties: false
    },
    getPartner: {
      type: 'object',
      properties: {
        _limit: { type: 'string' },
        _page: { type: 'string' }
      },
      required: ['_limit', '_page']
      // additionalProperties: false
    },
    updatePartner: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        fname: { type: 'string' },
        lname: { type: 'string' },
        email: { type: 'string' },
        phcode: { type: 'string' },
        phone: { type: 'string' },
        gender: { type: 'string' },
        DOB: { type: 'string' },
        cnty: { type: 'string' },
        cntyname: { type: 'string' },
        state: { type: 'string' },
        statename: { type: 'string' },
        city: { type: 'string' },
        cityname: { type: 'string' },
        cmpy: { type: 'string' },
        lang: { type: 'string' },
        cur: { type: 'string' },
        actMail: { type: 'string' },
        actHolder: { type: 'string' },
        actNo: { type: 'string' },
        actBank: { type: 'string' },
        actLoc: { type: 'string' },
        actCode: { type: 'string' },
        fcmId: { type: 'string' },
        nic: { type: 'string' },
        scId: { type: 'string' },
        scity: { type: 'string' },
        isPartnerAllowedOtherStates: { type: 'boolean' },
        status: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              curstatus: { type: 'string' }
            }
          }
        },
        referenceCode: { type: 'string' },
        loginType: { type: 'string' }
      },
      required: ['fname', 'lname', 'gender'],
      anyOf: [
        {
          required: ['phone', 'phoneCode']
        },
        {
          required: ['email'],
          propertyNames: { not: { enum: ['phone', 'phoneCode'] } }
        }
      ]
      // additionalProperties: false
    },
    createPartnerTaxi: {
      type: 'object',
      properties: {
        makename: { type: 'string' },
        model: { type: 'string' },
        year: { type: 'string' },
        licence: { type: 'string' },
        type: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              basic: { type: 'string' },
              normal: { type: 'string' },
              luxury: { type: 'string' }
            }
          }
        }
      },
      required: ['makename', 'model', 'year', 'licence']
    },
    getCustomerExists: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' }
      },
      additionalProperties: false,
      oneOf: [{ required: ['email'] }, { required: ['phone', 'phoneCode'] }]
    },
    loginCustomer: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' },
        password: { type: 'string' },
        code: { type: 'string' },
        verifyBy: { type: 'string' },
        userType: { type: 'string' },
        fcmId: { type: 'string' }
      },
      oneOf: [{ required: ['email'] }, { required: ['phone', 'phoneCode'] }],
      // oneOf: [{ required: ['code'] }, { required: ['password'] }],
      additionalProperties: false
    },
    getCustomer: {
      type: 'object',
      properties: {
        _limit: { type: 'string' },
        _page: { type: 'string' }
      },
      required: ['_limit', '_page']
      // additionalProperties: false
    },
    changepassword: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' },
        code: { type: 'string' },
        verifyBy: { type: 'string' },
        userType: { type: 'string' },
        verifyFrom: { type: 'string' },
        password: { type: 'string' },
        oldpassword: { type: 'string' },
        newpassword: { type: 'string' }
      },
      required: ['password'],
      anyOf: [
        { required: ['email'], propertyNames: { not: { enum: ['phone', 'phoneCode'] } } },
        { required: ['phone', 'phoneCode'] },
        { required: ['_id'] },
        { required: ['newpassword', 'oldpassword', 'password'] }
      ],
      additionalProperties: false
    },
    verification: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' },
        code: { type: 'string' },
        verifyBy: { type: 'string' },
        userType: { type: 'string' },
        verifyFrom: { type: 'string' }
      },
      // oneOf: [{ required: ['email'] }, { required: ['phone', 'phoneCode'] }],
      anyOf: [
        {
          required: ['phone', 'phoneCode']
        },
        {
          required: ['email'],
          propertyNames: { not: { enum: ['phone', 'phoneCode'] } }
        }
      ],
      additionalProperties: false
    },
    createCustomer: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' },
        fname: { type: 'string' },
        lname: { type: 'string' },
        language: { type: 'string' },
        gender: { type: 'string' },
        profile: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        country: { type: 'string' },
        fcmId: { type: 'string' },
        emailVerified: { type: 'string' },
        phoneVerified: { type: 'string' },
        password: {
          type: 'string',
          minLength: Feature.account.minPassword || 1,
          maxLength: Feature.account.maxPassword || 1
        },
        confirmPassword: {
          type: 'string',
          minLength: Feature.account.minPassword || 1,
          maxLength: Feature.account.maxPassword || 1
        }
      },
      required: ['fname', 'lname', 'gender', 'password', 'confirmPassword'],
      anyOf: [
        {
          required: ['phone', 'phoneCode']
        },
        {
          required: ['email'],
          propertyNames: { not: { enum: ['phone', 'phoneCode'] } }
        }
      ]
      // additionalProperties: false
    },
    updateCustomer: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' },
        fname: { type: 'string' },
        lname: { type: 'string' },
        language: { type: 'string' },
        gender: { type: 'string' },
        profile: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        country: { type: 'string' },
        emailVerified: { type: 'string' },
        phoneVerified: { type: 'string' }
        // password: {
        //   type: 'string',
        //   minLength: Feature.account.minPassword || 1,
        //   maxLength: Feature.account.maxPassword || 1,
        // },
        // confirmPassword: {
        //   type: 'string',
        //   minLength: Feature.account.minPassword || 1,
        //   maxLength: Feature.account.maxPassword || 1,
        // },
      },
      required: ['fname', 'lname', 'gender'],
      anyOf: [
        {
          required: ['phone', 'phoneCode']
        },
        {
          required: ['email'],
          propertyNames: { not: { enum: ['phone', 'phoneCode'] } }
        }
      ]
      // additionalProperties: false
    },
    updateCustomerStatus: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['Pending', 'Active', 'Inactive', 'Blocked'] }
      },
      required: ['status']
      // additionalProperties: false
    },
    sendOtpverify: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phoneNumber: { type: 'string' },
        phoneCode: { type: 'string' },
        userType: { type: 'string' },
        verifyBy: { type: 'string' },
        verifyFrom: { type: 'string' }
      }
    },
    getAdminExists: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' }
      },
      oneOf: [{ required: ['email'] }, { required: ['phone', 'phoneCode'] }],
      additionalProperties: false
    },
    getCompanyExists: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        phoneCode: { type: 'string' }
      },
      oneOf: [{ required: ['email'] }, { required: ['phone', 'phoneCode'] }],
      additionalProperties: false
    },
    createCompany: {
      type: 'object',
      properties: {
        fname: { type: 'string' },
        lname: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        group: { type: 'string' }
      },
      required: ['fname', 'lname'],
      anyOf: [
        {
          required: ['phone']
        },
        {
          required: ['email'],
          propertyNames: { not: { enum: ['phone', 'phoneCode'] } }
        }
      ]
      // additionalProperties: false
    },
    getCompany: {
      type: 'object',
      properties: {
        _sort: { type: 'string' },
        _order: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        group: { type: 'string' }
      }
      // required: ["_sort", "_order"],
      // additionalProperties: false
    },
    updateCompany: {
      type: 'object',
      properties: {
        fname: { type: 'string' },
        lname: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        group: { type: 'string' }
      },
      required: ['fname', 'lname']

      // additionalProperties: false
    },
    addEmgContact: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phoneNumber: { type: 'string' },
        phoneCode: { type: 'string' }
      },
      anyOf: [{ required: ['email'] }, { required: ['phoneNumber', 'phoneCode'] }],
      additionalProperties: false
    },
    updateEmgContact: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phoneNumber: { type: 'string' },
        phoneCode: { type: 'string' }
      },
      anyOf: [{ required: ['email'] }, { required: ['phoneNumber', 'phoneCode'] }],
      additionalProperties: false
    },
    addFavLocation: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: { type: 'string' }
      }
    },
    updateFavLocation: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: { type: 'string' }
      }
    },
    currentLocation: {
      type: 'object',
      properties: {
        bearing: { type: 'string' },
        latitude: { type: 'string' },
        longitude: { type: 'string' }
      },
      required: ['bearing', 'latitude', 'longitude']
    },
    partnerTracking: {
      type: 'object',
      properties: {
        serviceArea: { type: 'string', ObjectId: true },
        status: { enum: ['1', '0'] },
        curStatus: { enum: ['free', 'Accepted', 'Arrived', 'Progress', 'Finished'] },
        curService: { type: 'string', ObjectId: true },
        search: { type: 'string' }
      }
    }
  }
  static messages = {
    loginAdmin: {
      'required:oneOf:email': 'Email is required',
      'required:oneOf:phone': 'Phone is required',
      'required:oneOf:phoneCode': 'Phone Code is required'
    },
    createAdmin: {
      'required:anyOf:email': 'email is required',
      'required:anyOf:phone': 'phone is required'
    },
    updateAdmin: {
      'required:anyOf:email': 'email is required',
      'required:anyOf:phone': 'phone is required',
      'required:anyOf:phoneCode': 'phoneCode is required'
    },
    loginPartner: {
      'required:oneOf:email': 'Email is required',
      'required:oneOf:phone': 'Phone is required',
      'required:oneOf:phoneCode': 'Phone Code is required'
    },
    getPartnerExists: {
      'required:oneOf:email': 'Email is required',
      'required:oneOf:phone': 'Phone is required',
      'required:oneOf:phoneCode': 'Phone Code is required'
    },
    createPartner: {
      'required:anyOf:email': 'email is required',
      'required:anyOf:phone': 'phone is required',
      'required:anyOf:phoneCode': 'phoneCode is required'
    },
    updatePartner: {
      'required:anyOf:email': 'email is required',
      'required:anyOf:phone': 'phone is required',
      'required:anyOf:phoneCode': 'phoneCode is required'
    },
    createPartnerTaxi: {
      'required:anyOf:makename': 'makename is required',
      'required:anyOf:model': 'model is required',
      'required:anyOf:year': 'year is required',
      'required:anyOf:licence': 'licence is required'
    },
    getCustomerExists: {
      'required:oneOf:email': 'Email is required',
      'required:oneOf:phone': 'Phone is required',
      'required:oneOf:phoneCode': 'Phone Code is required'
    },
    loginCustomer: {
      'required:oneOf:email': 'Email is required',
      'required:oneOf:phone': 'Phone is required',
      'required:oneOf:phoneCode': 'Phone Code is required',
      'required:oneOf:password': 'Password or code is required',
      'required:oneOf:code': 'Password or code is required'
    },
    changepassword: {
      'required:anyOf:email': 'Email is required',
      'required:anyOf:phone': 'Phone is required',
      'required:anyOf:phoneCode': 'Phone Code is required',
      'required:anyOf:_id': '_id is required'
    },
    verification: {
      'required:anyOf:email': 'Email is required',
      'required:anyOf:phone': 'Phone is required',
      'required:anyOf:phoneCode': 'Phone Code is required'
    },
    createCustomer: {
      'required:anyOf:email': 'email is required',
      'required:anyOf:phone': 'phone is required',
      'required:anyOf:phoneCode': 'phoneCode is required'
    },
    updateCustomer: {
      'required:anyOf:email': 'Email is required',
      'required:anyOf:phone': 'Phone is required',
      'required:anyOf:phoneCode': 'Phone Code is required'
    },
    getAdminExists: {
      'required:oneOf:email': 'Email is required',
      'required:oneOf:phone': 'Phone is required',
      'required:oneOf:phoneCode': 'Phone Code is required'
    },
    getCompanyExists: {
      'required:oneOf:email': 'Email is required',
      'required:oneOf:phone': 'Phone is required',
      'required:oneOf:phoneCode': 'Phone Code is required'
    },
    createCompany: {
      'required:anyOf:email': 'email is required',
      'required:anyOf:phone': 'phone is required'
    },
    updateCompany: {
      'required:anyOf:email': 'email is required',
      'required:anyOf:phone': 'phone is required',
      'required:anyOf:phoneCode': 'phoneCode is required'
    },
    addEmgContact: {
      'required:anyOf:email': 'Email is required',
      'required:anyOf:phoneNumber': 'PhoneNumber is required'
    },
    updateEmgContact: {
      'required:anyOf:email': 'email is required',
      'required:anyOf:phoneNumber': 'phoneNumber is required'
    },
    addFavLocation: {
      'required:anyOf:name': 'name is required',
      'required:anyOf:address': 'address is required'
    },
    updateFavLocation: {
      'required:anyOf:name': 'name is required',
      'required:anyOf:address': 'address is required'
    },
    currentLocation: {
      'required:bearing': 'Bearing is required',
      'required:latitude': 'Latitude is required',
      'required:longitude': 'Longitude is required'
    },
    partnerTracking: {
      'required:anyOf:name': 'name is required',
      'required:anyOf:address': 'address is required'
    }
  }
  static getSchema(schemaName) {
    return () => {
      if (!this.schemas[schemaName]) {
        throw new Error('Schema not found')
      }
      return this.schemas[schemaName]
    }
  }
}

export { AuthValidator }
