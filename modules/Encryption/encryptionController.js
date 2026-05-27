/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../controllers/BaseController.js'
import { Logger } from '../../utils/Logger.js'
import { RequestHandler } from '../../utils/RequestHandler.js'

const requestHandler = new RequestHandler(Logger)

class EnCryptionController extends BaseController {
  constructor() {
    super()
  }

  static generateMasterKeyFile = async (req, res) => {
    try {
      // Generate a 256-bit (96-byte) encryption key
      const key = crypto.randomBytes(96)
      const base64Key = key.toString('base64')
      await fs.writeFileSync('master-key.txt', base64Key)
      return requestHandler.sendSuccess(req, res, 'ADD_MASTER_KEY_FILE')({ message: 'CREATED|FILE' })
    } catch (error) {
      console.log(error)
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { EnCryptionController }
