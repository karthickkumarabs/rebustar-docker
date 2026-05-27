/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { AutoCompleteController as Autocomplete } from './controllers/Autocomplete.js'
// import { RedisAutocomplete } from './helpers/RedisAutoComplete.js'
// import { Enum } from '../../utils/Enum.js'
// import { AuthMiddleware } from '../../middlewares/AuthMiddleware.js'
// const { authorize } = AuthMiddleware
// const redisAutocomplete = new RedisAutocomplete()
// const initializeRedisData = async () => {
//   try {
//     await redisAutocomplete.createRedisIndex()
//     // await redisAutocomplete.importAutocomplete()
//     console.log('Autocomplete data imported to redis successfully')
//   } catch (error) {
//     console.error('Error importing autocomplete data:', error)
//   }
// }

// Call the initialization function
// initializeRedisData()
const Router = express.Router()

Router.route('/module/services/request/location').get(
  // authorize([Enum.ROLES.ADMIN]),
  Autocomplete.getAutocompleteLocations
)

Router.route('/module/services/request/latlng').get(
  // authorize([Enum.ROLES.ADMIN]),
  Autocomplete.getPlaceIdLatLng
)

export { Router as AutocompleteModule }
