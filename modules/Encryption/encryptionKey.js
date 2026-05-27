/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { BaseController } from '../../controllers/BaseController.js'
import EncryptionKey from './models/encryptionKey.js'

// import mongoose from 'mongoose'

// const EncryptionKeySchema = new mongoose.Schema({
//   keyId: String // Store the generated key ID
// })

// const EncryptionKey = mongoose.model('EncryptionKey', EncryptionKeySchema)
class EncryptionKeyController extends BaseController {
  constructor() {
    super()
  }
  static getKeyId = async () => {
    const keyData = await EncryptionKey.findOne({})
    return keyData ? keyData.keyId : null
  }

  static saveKeyId = async (keyId) => {
    const existingKey = await EncryptionKey.findOne({})
    if (!existingKey) {
      await EncryptionKey.create({ keyId })
      console.log('✅ Encryption key saved to database.')
    } else {
      console.log('🔹 Encryption key already exists.')
    }
  }
}

export { EncryptionKeyController }
