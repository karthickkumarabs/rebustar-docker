/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
import Partner from '../../../models/Auth/Partner.js'
import mongoose from 'mongoose'
import { PartnerSoundQrConfig } from '../config.js'
import fs from 'fs'
import path from 'path'
import { Enum } from '../../../utils/Enum.js'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class PartnerQRController {
  static getPartnerQR = async (req, res) => {
    if (PartnerSoundQrConfig.QrisEnabled === false) throw new Error('Partner QR Code feature is disabled')
    try {
      const driverId = req.userId ?? req.query

      if (!mongoose.Types.ObjectId.isValid(driverId)) {
        throw new Error('Invalid driverId format')
      }

      const partnerData = await Partner.findOne({ _id: driverId })
      if (!partnerData) throw new Error('NOT FOUND|PARTNER')

      return requestHandler.sendSuccess(
        req,
        res
      )({
        message: 'Partner QRCode fetched successfully',
        qrCodeImage: partnerData.qrCodeImage,
        upiId: partnerData.upiId
      })
    } catch (err) {
      requestHandler.sendError(req, res, err)
    }
  }

  static uploadPartnerQR = async (req, res) => {
    try {
      const { upiId } = req.body
      const file = req.file
      if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
        const filePath = path.join(process.cwd(), PartnerSoundQrConfig.Soundpath)
        await fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting file:', err)
          }
        })
        const configObj = {
          QrisEnabled: PartnerSoundQrConfig.QrisEnabled,
          SoundisEnabled: PartnerSoundQrConfig.SoundisEnabled,
          uploadPath: PartnerSoundQrConfig.uploadPath,
          TripalertSoundpath: file.path
        }
        const __dirname = path.resolve()
        const filePath1 = `${__dirname}/modules/Partnersound-QrImage/config.js`

        const fileContent = `/* ************************
   * Copyright 2025
   * ABSERVETECH
   ************************ */
  
  const PartnerSoundQrConfig = ${JSON.stringify(configObj, null, 2)}
  
  export { PartnerSoundQrConfig }
  `

        await fs.writeFileSync(filePath1, fileContent)
        return requestHandler.sendSuccess(
          req,
          res
        )({
          message: 'Sound uploaded successfully',
          data: {
            TripalertSoundpath: file.path
          }
        })
      } else if (
        file.mimetype !== 'image/png' &&
        file.mimetype !== 'image/jpeg' &&
        file.mimetype !== 'image/jpg' &&
        file.mimetype !== 'image/webp' &&
        file.mimetype !== 'image/svg'
      ) {
        let driverId = req.body.driverId || null
        if (req.auth?.role === Enum.ROLES.PARTNER) {
          driverId = req.auth?.userId
        }
        if (!driverId) throw new Error('Missing required fields')
        const qrUrl = `${PartnerSoundQrConfig.uploadPath}${req.file.filename}`
        const partnerData = await Partner.findOne(
          { _id: driverId },
          { qrCodeImage: 1, upiId: 1 },
          { upsert: true }
        )
          .lean()
          .exec()
        if (!partnerData) throw new Error('NOT FOUND|PARTNER')
        if (partnerData.qrCodeImage != '') {
          const filePath = path.join(process.cwd(), partnerData.qrCodeImage)
          await fs.unlink(filePath, (err) => {
            if (err) {
              console.error('Error deleting file:', err)
            }
          })
        }
        const updatedPartner = await Partner.findByIdAndUpdate(
          driverId,
          { qrCodeImage: qrUrl || partnerData.qrCodeImage, upiId: upiId || partnerData.upiId },
          { new: true }
        )
          .lean()
          .exec()

        if (!updatedPartner) throw new Error('NOT FOUND|PARTNER')
        return requestHandler.sendSuccess(
          req,
          res
        )({
          message: 'QR Code uploaded successfully',
          data: {
            qrCodeImage: partnerData.qrCodeImage,
            upiId: partnerData.upiId
          }
        })
      }
    } catch (err) {
      console.log('err', err)

      return requestHandler.sendError(req, res, err)
    }
  }
  static updatePartnerqrConfig = async (req, res) => {
    try {
      const configObj = {
        isEnabled: req.body.isEnabled,
        uploadPath: PartnerSoundQrConfig.uploadPath
      }
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/Partnersound-QrImage/config.js`

      const fileContent = `/* ************************
 * Copyright 2025
 * ABSERVETECH
 ************************ */

const PartnerSoundQrConfig = ${JSON.stringify(configObj, null, 2)}

export { PartnerSoundQrConfig }
`

      await fs.writeFileSync(filePath, fileContent)
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({
        message: 'UPDATED',
        data: configObj
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getPartnerqrConfig = async (req, res) => {
    try {
      return requestHandler.sendSuccess(
        req,
        res
      )({
        message: 'Partner QR Code config fetched successfully',
        data: PartnerSoundQrConfig
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}

export { PartnerQRController }
