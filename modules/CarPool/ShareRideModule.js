/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../controllers/BaseController.js'
import ShareRidePost from './models/ShareRidePost.js'
class ShareRideModuleController extends BaseController {
  constructor() {
    super()
  }
  static sendRequest = async (shareRidePostData) => {
    const response = {
      success: true,
      code: 200
    }
    try {
      const shareRidePost = new ShareRidePost(shareRidePostData)
      const shareRideData = await shareRidePost.save()
      response.shareRideData = shareRideData
      return response
    } catch (err) {
      response.success = false
      response.message = err
      response.code = 500
      return response
    }
  }

  static RideMatch = async (matchedDriversArray) => {
    const response = {
      success: true,
      code: 200
    }
    try {
      response.matchedDriversArray = matchedDriversArray
      return response
    } catch (err) {
      response.matchedDriversArray = []
      response.success = false
      response.message = err
      response.code = 500
      return response
    }
  }
}
export { ShareRideModuleController }
