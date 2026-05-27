/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import randomize from 'randomatic'
import { SignupBonusConfig } from '../config.js'
import { BaseController } from '../../../controllers/BaseController.js'
import { Enum } from '../../../utils/Enum.js'
import { PaymentServices } from '../../Payment/PaymentService.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'
import { Logger } from '../../../utils/Logger.js'
// import { Helpers } from '../../../helpers/Function.js'
import path from 'path'
import fs from 'fs'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class SignupBonusController extends BaseController {
  constructor() {
    super()
  }

  // GET config
  static getSignupBonusConfig = async (req, res) => {
    try {
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_SIGNUPBONUS_CONFIG'
      )({
        message: 'SUCCESS',
        signupBonusData: SignupBonusConfig
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  // UPDATE config
  static updateSignupBonusConfig = async (req, res) => {
    try {
      const configObj = req.body
      const __dirname = path.resolve()
      const filePath = `${__dirname}/modules/Signupbonus/config.js`

      const fileContent = `/* ************************
 * Copyright 2025
 * ABSERVETECH
 ************************ */

const SignupBonusConfig = ${JSON.stringify(configObj, null, 2)}

export { SignupBonusConfig }
`

      await fs.writeFileSync(filePath, fileContent)
      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({
        message: 'UPDATED',
        signupBonusData: configObj
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  // Triggered during signup
  static signupBonusProcess = async (userId, userType) => {
    try {
      const amount =
        userType === Enum.ROLES.CUSTOMER
          ? SignupBonusConfig.CustomercreditAmount
          : userType === Enum.ROLES.PARTNER
          ? SignupBonusConfig.PartnercreditAmount
          : 0

      const trxObj = {
        module: Enum.PAYMENT.MODULES.SIGNUP_BONUS,
        description: Enum.PAYMENT.MODULES.SIGNUP_BONUS,
        userId,
        userType,
        amount: amount,
        mode: Enum.PAYMENT.MODE.CREDIT,
        createdBy: userType
      }
      await this.addSignupWallettransactions(trxObj)
    } catch (error) {
      throw new Error(error)
    }
  }

  static addSignupWallettransactions = async (trxData) => {
    // const referenceId = Helpers.sendRandomizeCode('Aa0', 8)
    const referenceId = randomize('Aa0', 8)
    const transactionData = {
      referenceId: referenceId,
      description: trxData.description,
      paymentMode: trxData.mode,
      userId: trxData.userId,
      userType: trxData.userType,
      serviceArea: null, // Add if applicable
      amount: trxData.amount,
      module: trxData.module
    }
    console.log('addSignupWallettransactions trxObj', transactionData)
    const transferResult = await PaymentServices.merchantTransaction(transactionData)
    if (!transferResult.status) {
      throw new Error(transferResult.message)
    }
  }
}

export { SignupBonusController }
