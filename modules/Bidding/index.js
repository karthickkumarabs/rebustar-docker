/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { BiddingController as Bidding } from './controllers/BiddingController.js'

import { Enum } from '../../utils/Enum.js'
import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
const { authorize } = AuthMiddleware

const Router = express.Router()

Router.route('/module/Bidding/gettransaction').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Bidding.getTransactionHistory
)

Router.route('/module/Bidding/checkMinandMaxamount').get(
  authorize([Enum.ROLES.ADMIN, Enum.ROLES.PARTNER, Enum.ROLES.CUSTOMER]),
  Bidding.MinandMax
)

Router.route('/module/Bidding/Enable')
  .put(authorize([Enum.ROLES.ADMIN]), Bidding.EnableBidding)
  .get(authorize([Enum.ROLES.ADMIN]), Bidding.getBidding)

export { Router as BiddingModule }
