/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Config } from '../../../config/AppConfig.js'
import { BaseController } from '../../../controllers/BaseController.js'

import { Logger } from '../../../utils/Logger.js'
import { RequestHandler } from '../../../utils/RequestHandler.js'

import Autocomplete from '../models/Autocomplete.js'
import Place from '../models/Place.js'
import axios from 'axios'
import { RedisHelper } from '../../../helpers/RedisHelper.js'

import { RedisAutocomplete } from '../helpers/RedisAutoComplete.js'

import countries from 'i18n-iso-countries'

import enLocale from 'i18n-iso-countries/langs/en.json' assert { type: 'json' }

countries.registerLocale(enLocale)

const logger = new Logger()
const requestHandler = new RequestHandler(logger)
const RedisDB = new RedisHelper()
class AutoCompleteController extends BaseController {
  constructor() {
    super()
  }
  static getAutocompleteLocations = async (req, res) => {
    try {
      let storedDocument
      const query = req.query.location
      const ip = req.ip
      console.log(ip, '=====================>')

      const countryCode = (await this.getCountryCode(ip)) || 'in'
      if (!query) {
        throw new Error('location is required')
      }
      let predictions
      const result = await new RedisAutocomplete().searchAutocompleteRedis(query, countryCode)
      console.log(result)
      if (result.length) {
        predictions = result.map((e) => e.value.predictions)
        return requestHandler.sendSuccess(
          req,
          res,
          'LOCATION'
        )({ message: 'SUCCESS', predictions: predictions.flat() })
      } else {
        const googleApiKey = Config.mapConfig.serverKey
        console.log(query, countryCode, googleApiKey)

        await axios
          .get(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${googleApiKey}&components=country:${countryCode}`
          )
          .then(async (response) => {
            predictions = response.data.predictions.map((prediction) => ({
              description: prediction.description,
              placeId: prediction.place_id,
              structuredFormatting: {
                mainText: prediction.structured_formatting.main_text,
                secondaryText: prediction.structured_formatting.secondary_text
              },
              countryCode: countryCode
            }))
            if (predictions.length) {
              const newAutocomplete = new Autocomplete({
                query: query.toLowerCase(),
                countryCode: countryCode,
                predictions
              })

              storedDocument = await newAutocomplete.save()

              await new RedisAutocomplete().storeAutocompletRedis(
                `autocomplete:${query}:${countryCode}`,
                storedDocument
              )
            } else {
              const result = await new RedisAutocomplete().searchAutocompleteRedis(query, countryCode)
              if (result.length) {
                predictions = result.map((e) => e.value.predictions)
              } else {
                await axios
                  .get(
                    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${googleApiKey}`
                  )
                  .then(async (response) => {
                    predictions = response.data.predictions.map((prediction) => ({
                      description: prediction.description,
                      placeId: prediction.place_id,
                      structuredFormatting: {
                        mainText: prediction.structured_formatting.main_text,
                        secondaryText: prediction.structured_formatting.secondary_text
                      },
                      countryCode: countryCode
                    }))
                    // Group predictions by countryCode
                    const groupedPredictions = response.data.predictions.reduce((acc, prediction) => {
                      let countryCode = null

                      const locationInfo = prediction.structured_formatting.secondary_text

                      if (locationInfo) {
                        const locationParts = locationInfo.split(',')
                        const countryName = locationParts[locationParts.length - 1].trim()
                        countryCode = countries.getAlpha2Code(countryName, 'en') || null
                      }

                      if (countryCode) {
                        countryCode = countryCode.toLowerCase()
                        if (!acc[countryCode]) {
                          acc[countryCode] = []
                        }
                        acc[countryCode].push({
                          description: prediction.description,
                          placeId: prediction.place_id,
                          structuredFormatting: {
                            mainText: prediction.structured_formatting.main_text,
                            secondaryText: prediction.structured_formatting.secondary_text
                          },
                          countryCode: countryCode
                        })
                      }

                      return acc
                    }, {})

                    // Loop through each countryCode group
                    for (const countryCode in groupedPredictions) {
                      if (groupedPredictions.hasOwnProperty(countryCode)) {
                        const queryLower = query.toLowerCase()
                        const predictions = groupedPredictions[countryCode]

                        // Check if a document exists for the query and countryCode
                        const existingDocument = await Autocomplete.findOne({
                          query: queryLower,
                          countryCode: countryCode
                        })

                        if (existingDocument) {
                          // Merge predictions with existing ones
                          existingDocument.predictions = [...existingDocument.predictions, ...predictions]

                          // Optionally, you can remove duplicates from predictions array
                          existingDocument.predictions = existingDocument.predictions.filter(
                            (prediction, index, self) =>
                              index ===
                              self.findIndex(
                                (p) =>
                                  p.placeId === prediction.placeId && p.description === prediction.description
                              )
                          )

                          storedDocument = await existingDocument.save()

                          await new RedisAutocomplete().storeAutocompletRedis(
                            `autocomplete:${query}:${countryCode}`,
                            storedDocument
                          )
                        } else {
                          // Create a new document
                          const newAutocomplete = new Autocomplete({
                            query: queryLower,
                            countryCode: countryCode,
                            predictions
                          })

                          storedDocument = await newAutocomplete.save()
                          await new RedisAutocomplete().storeAutocompletRedis(
                            `autocomplete:${query}:${countryCode}`,
                            storedDocument
                          )
                        }
                      }
                    }
                  })
                  .catch((error) => {
                    console.error('Error fetching autocomplete predictions:', error)
                  })
              }
            }
          })
          .catch((error) => {
            console.error('Error fetching autocomplete results:', error.response.data)
          })
      }
      console.log(predictions, '=======>')

      // if (predictions.length) {
      //   await new RedisAutocomplete().storeAutocompletRedis(
      //     `autocomplete:${query}:${countryCode}`,
      //     storedDocument
      //   )
      // }
      return requestHandler.sendSuccess(
        req,
        res,
        'LOCATION'
      )({ message: 'SUCCESS', predictions: predictions })
    } catch (error) {
      // return requestHandler.sendError(req, res, error)
      return requestHandler.sendSuccess(req, res, 'LOCATION')({ message: 'SUCCESS', predictions: [] })
    }
  }
  // static getAutocompleteLocations = async (req, res) => {
  //   try {
  //     const query = req.query.location
  //     const ip = req.ip
  //     const countryCode = (await this.getCountryCode(ip)) || 'in'
  //     const cacheExists = await RedisDB.__getCache(`${countryCode}_${query}`)
  //     if (cacheExists) {
  //       return requestHandler.sendSuccess(
  //         req,
  //         res,
  //         'LOCATION'
  //       )({ message: 'SUCCESS', predictions: JSON.parse(cacheExists) })
  //     }
  //     if (!query) {
  //       throw new Error('location is required')
  //     }
  //     let predictions
  //     const result = await Autocomplete.aggregate([
  //       {
  //         $match: {
  //           query: query,
  //           countryCode: countryCode
  //         }
  //       },
  //       {
  //         $addFields: {
  //           sortPriority: {
  //             $cond: { if: { $eq: ['$countryCode', countryCode] }, then: 0, else: 1 }
  //           }
  //         }
  //       },
  //       { $sort: { sortPriority: 1, createdAt: -1 } },
  //       {
  //         $group: {
  //           _id: '$query',
  //           countryCode: { $first: '$countryCode' },
  //           predictions: { $push: '$predictions' }
  //         }
  //       },
  //       {
  //         $project: {
  //           _id: 0,
  //           query: '$_id',
  //           countryCode: 1,
  //           predictions: {
  //             $reduce: {
  //               input: '$predictions',
  //               initialValue: [],
  //               in: { $concatArrays: ['$$value', '$$this'] }
  //             }
  //           }
  //         }
  //       }
  //     ])
  //     if (result.length) {
  //       predictions = result.map((e) => e.predictions)
  //     } else {
  //       const googleApiKey = Config.mapConfig.serverKey
  //       console.log(query, countryCode, googleApiKey)

  //       await axios
  //         .get(
  //           `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${googleApiKey}&components=country:${countryCode}`
  //         )
  //         .then(async (response) => {
  //           predictions = response.data.predictions.map((prediction) => ({
  //             description: prediction.description,
  //             placeId: prediction.place_id,
  //             structuredFormatting: {
  //               mainText: prediction.structured_formatting.main_text,
  //               secondaryText: prediction.structured_formatting.secondary_text
  //             }
  //           }))
  //           if (predictions.length) {
  //             const newAutocomplete = new Autocomplete({
  //               query: query.toLowerCase(),
  //               countryCode: countryCode,
  //               predictions
  //             })

  //             await newAutocomplete.save()
  //           } else {
  //             const result = await Autocomplete.aggregate([
  //               {
  //                 $match: {
  //                   query: query
  //                 }
  //               },
  //               {
  //                 $addFields: {
  //                   sortPriority: {
  //                     $cond: { if: { $eq: ['$countryCode', countryCode] }, then: 0, else: 1 }
  //                   }
  //                 }
  //               },
  //               { $sort: { sortPriority: 1, createdAt: -1 } },
  //               {
  //                 $group: {
  //                   _id: '$query',
  //                   countryCode: { $first: '$countryCode' },
  //                   predictions: { $push: '$predictions' }
  //                 }
  //               },
  //               {
  //                 $project: {
  //                   _id: 0,
  //                   query: '$_id',
  //                   countryCode: 1,
  //                   predictions: {
  //                     $reduce: {
  //                       input: '$predictions',
  //                       initialValue: [],
  //                       in: { $concatArrays: ['$$value', '$$this'] }
  //                     }
  //                   }
  //                 }
  //               }
  //             ])
  //             if (result.length) {
  //               predictions = result.map((e) => e.predictions)
  //             } else {
  //               await axios
  //                 .get(
  //                   `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${googleApiKey}`
  //                 )
  //                 .then(async (response) => {
  //                   predictions = response.data.predictions.map((prediction) => ({
  //                     description: prediction.description,
  //                     placeId: prediction.place_id,
  //                     structuredFormatting: {
  //                       mainText: prediction.structured_formatting.main_text,
  //                       secondaryText: prediction.structured_formatting.secondary_text
  //                     }
  //                   }))
  //                   if (predictions.length) {
  //                     const newAutocomplete = new Autocomplete({
  //                       query: query.toLowerCase(),
  //                       countryCode: countryCode,
  //                       predictions
  //                     })

  //                     await newAutocomplete.save()
  //                   }
  //                 })
  //             }
  //           }
  //         })
  //         .catch((error) => {
  //           console.error('Error fetching autocomplete results:', error.response.data)
  //         })
  //     }
  //     if (predictions.length) {
  //       await RedisDB.__setCache(`${countryCode}_${query}`, predictions)
  //     }
  //     return requestHandler.sendSuccess(
  //       req,
  //       res,
  //       'LOCATION'
  //     )({ message: 'SUCCESS', predictions: predictions })
  //   } catch (error) {
  //     // return requestHandler.sendError(req, res, error)
  //     return requestHandler.sendSuccess(req, res, 'LOCATION')({ message: 'SUCCESS', predictions: [] })
  //   }
  // }

  static getPlaceIdLatLng = async (req, res) => {
    const { placeId } = req.query

    if (!placeId) {
      throw new Error('placeId is required')
    }

    try {
      // Check if the placeId exists in the database
      let place = await Place.findOne({ placeId })

      if (!place) {
        const googleApiKey = Config.mapConfig.serverKey
        console.log(`Fetching details for placeId: ${placeId}`)

        // Fetch details from Google Places API
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${googleApiKey}`
        )

        const { lat, lng } = response.data.result.geometry.location

        // Create a new Place document
        place = new Place({
          placeId,
          lat,
          lng
        })

        await place.save()
      }

      // Return the latitude and longitude
      return requestHandler.sendSuccess(
        req,
        res,
        'PLACE'
      )({
        message: 'SUCCESS',
        placeId: place.placeId,
        lat: place.lat,
        lng: place.lng
      })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static getCountryCode = async (ip) => {
    try {
      const cacheExists = await RedisDB.__getCache(ip)
      if (cacheExists) {
        return cacheExists
      }
      const response = await axios.get(`https://ipapi.co/${ip}/json/`)
      const countryCode = response.data.country_code
      if (countryCode) {
        await RedisDB.__setCache(ip, countryCode.toLowerCase())
      }
      return countryCode ? countryCode.toLowerCase() : null
    } catch (error) {
      console.error('Error fetching country code:', error)
      return null
    }
  }
}

export { AutoCompleteController }
