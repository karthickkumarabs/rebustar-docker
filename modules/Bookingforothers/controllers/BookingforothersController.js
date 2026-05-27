/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../../controllers/BaseController.js'
import { BookingforsomeoneConfig } from '../config.js'

class BookingforothersController extends BaseController {
  constructor() {
    super()
  }
  static async bookingforothers(body, customerData) {
    console.log('body', body)

    const response = {
      status: 200,
      success: true,
      message: 'Data fetched successfully',
      data: customerData
    }
    try {
      if (BookingforsomeoneConfig.BookingforisApply) {
        const bookingforothers = body.bookingforothers
        if (bookingforothers) {
          const persondetails = body.persondetails
          if (persondetails) {
            customerData.fname = persondetails.name
            customerData.phone = persondetails.phone
            customerData.phoneCode = persondetails.phoneCode
            response.status = 200
            response.success = true
            response.message = 'Data updated successfully'
            response.data = customerData
          }
        }
      }
      return response
    } catch (error) {
      response.status = 500
      response.message = 'Internal Server Error'
      response.data = error
    }
  }
}

export { BookingforothersController }
