/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import * as express from 'express'
import { GooglePlaceController as GooglePlaceModule } from './PlaceController.js'
import { UploadMiddlewware } from '../../middlewares/UploadMiddleware.js'

const Router = express.Router()

const uploadExcelOrCsv = new UploadMiddlewware({
  fileParam: 'file',
  allowedExtensions: ['csv', 'xlsx', 'xls']
}).memoryUpload

Router.route('/services/places').get(GooglePlaceModule.getPlaces).post(GooglePlaceModule.addPlaces)
Router.route('/services/places/bulk-import').post(uploadExcelOrCsv, GooglePlaceModule.bulkImportPlaces)

export { Router as GooglePlaces }
