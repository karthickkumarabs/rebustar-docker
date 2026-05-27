/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import { MongoClient, Binary } from 'mongodb'
// import { ClientEncryption } from 'mongodb-client-encryption'
import pkg from 'mongodb-client-encryption'
const { ClientEncryption } = pkg
import path from 'path'
import * as fs from 'fs'
import { EncryptionKeyController } from '../modules/Encryption/encryptionKey.js'
const keyVaultNamespace = 'encryption.__keyVault' // Define key storage
const __dirname = path.resolve()
const filePath = `${__dirname}/modules/Encryption/master-key.txt`
// const filePath = path.join(__dirname, '..', 'modules', 'Encryption', 'master-key.txt')

// if (fs.existsSync(filePath)) {
const localMasterKey = fs.readFileSync(filePath, 'utf8').trim()
// Proceed with using localMasterKey
// } else {
//   console.error(`File not found: ${filePath}`)
// }
// const localMasterKey = fs.readFileSync(masterKeyTxtFile, 'utf8').trim() // Read stored encryption key

const kmsProviders = {
  local: {
    key: Buffer.from(localMasterKey, 'base64')
  }
}

let encryption
let keyId

// **Initialize Encryption**
const initEncryption = async () => {
  const client = new MongoClient(process.env.MONGODB)
  await client.connect()

  encryption = new ClientEncryption(client, { keyVaultNamespace, kmsProviders })

  // **Check if a key exists before generating a new one**
  keyId = await EncryptionKeyController.getKeyId()
  if (!keyId) {
    keyId = await encryption.createDataKey('local')
    console.log('✅ Generated new Data Encryption Key:', keyId)
    await EncryptionKeyController.saveKeyId(keyId) // 🔹 Store keyId in MongoDB
  } else {
    console.log('🔹 Using existing encryption key:', keyId)
  }

  return keyId
}

// **Encrypt Function**
async function encryptText(text) {
  if (!text) return null
  if (!encryption) throw new Error('Encryption not initialized!')

  const keyIdString = await getKeyId()
  const keyId = new Binary(Buffer.from(keyIdString.replace(/-/g, ''), 'hex'), 4)

  return await encryption.encrypt(text, {
    algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
    keyId
  })
}

// **Decrypt Function**
async function decryptText(encryptedText) {
  if (!encryptedText) return null
  if (!encryption) throw new Error('Encryption not initialized!')

  const decrypted = await encryption.decrypt(encryptedText)
  const result = decrypted instanceof Binary ? decrypted.buffer.toString('utf8') : decrypted

  console.log('im decrypt', result)

  return result
}

export { initEncryption, encryptText, decryptText }
