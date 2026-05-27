/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import mongoose from 'mongoose'
import { BaseModel } from '../../../models/BaseModel.js'

class Encryption extends BaseModel {
  constructor() {
    super()
  }
}

const EncryptionKeySchema = new mongoose.Schema({
  keyId: String // Store the generated key ID
})

EncryptionKeySchema.loadClass(Encryption)

const EncryptionKey = mongoose.model('EncryptionKey', EncryptionKeySchema)

export default EncryptionKey
