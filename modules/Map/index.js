/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import DistanceLogs from './DistanceLog.js'
import GoogleDistanceMatrix from 'google-distance-matrix'
import { Config } from '../../config/AppConfig.js'
import { StaticMap } from './StaticMap.js'
import fs from 'fs'
import axios from 'axios'
import length from '@turf/length'

import { Helpers } from '../../helpers/Function.js'
import { Enum } from '../../utils/Enum.js'
import ServiceArea from '../../models/Creteria/ServiceArea.js'

class MapServices {
  static getLocationData = async (origin, destination, metrics = {}) => {
    const response = {
      status: false,
      message: 'unprocessable',
      data: {}
    }
    try {
      const { distanceMetric = Config.app.distanceMetric, timeMetric = Config.app.timeMetric } = metrics
      let locationData = await DistanceLogs.findOne({
        origin: origin,
        destination: destination
      })
        .lean()
        .exec()

      if (!locationData) {
        const addLocation = await this.addLocation(origin, destination)
        if (!addLocation.status) {
          throw new Error(addLocation.message || 'Something Went Wrong!')
        }
        locationData = addLocation.data
      }
      // const dis = await this.calculateDistanceBetweenTwoPoints(origin, destination)
      // console.log('nearDis', dis)

      // Meter to Miles multiplier 0.000621371
      // Meter to kilo multiplier 0.001
      let distanceValue = 0
      if (distanceMetric == Enum.TRIP.DISTANCEMETRIC.MILE)
        distanceValue = Helpers.roundOff(locationData.distanceValue * 0.000621371)
      else if (distanceMetric == Enum.TRIP.DISTANCEMETRIC.KILOMETER)
        distanceValue = Helpers.roundOff(locationData.distanceValue * 0.001)
      else distanceValue = locationData.distanceValue

      let timeValue = 0

      if (timeMetric == Enum.TRIP.TIMEMETRIC.MNIUTE)
        timeValue = Math.ceil(Helpers.roundOff(locationData.timeValue / 60) || 0)
      else timeValue = locationData.timeValue
      response.status = true
      response.message = 'Data Added'
      response.data = {
        distanceMetric,
        distanceValue,
        timeMetric,
        timeValue,
        originLabel: locationData.originLabel,
        destinationLabel: locationData.destinationLabel,
        timeLabel: locationData.timeLabel,
        distanceLabel: locationData.distanceLabel
      }
    } catch (error) {
      response.status = false
      response.message = 'Unprocessable'
      response.data = {}
      console.log('Error updating data', error)
    }
    return response
  }

  static findServiceCity = async (data = {}) => {
    const response = {
      status: false,
      message: 'unprocessable',
      data: []
    }
    try {
      const locationData = await ServiceArea.findOne({
        polygon: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [data.longitude || 0, data.latitude || 0]
            }
          }
        }
      })
        .lean()
        .exec()

      response.status = true
      response.message = 'SUCCESS'
      response.data = !locationData ? [] : [locationData._id] // if serviceCity not found return empty array to fetch default documents
    } catch (error) {
      response.status = false
      response.message = 'Unprocessable'
      response.data = []
      console.log('Error updating data', error)
    }
    return response
  }

  static getMultipleLocationData = async (stops, metrics = {}) => {
    const response = {
      status: false,
      message: 'unprocessable',
      data: {}
    }
    let unitDistance = 0
    let unitTime = 0
    const accumulator = []
    try {
      for (let i = 0; i < stops.length; i++) {
        let obj = {}
        let start = stops[i]
        obj.coords = [start.longitude, start.latitude]
        obj.address = ''
        obj.name = 'start'
        obj.distanceLabel = '0 km'
        obj.timeLabel = '0 min'
        obj.distance = 0
        obj.time = 0

        if (i > 0) {
          start = stops[i - 1]
          const to = stops[i]
          const geoData = await this.getLocationData(
            [start.latitude + ',' + start.longitude],
            [to.latitude + ',' + to.longitude]
          )
          if (!geoData?.status) throw new Error('DISTANCE_ESTIMATION_FAILED')
          obj = {
            name: `stop ${i}`,
            address: geoData.data.destinationLabel,
            coords: [to.longitude, to.latitude],
            distanceLabel: geoData.data.distanceLabel,
            timeLabel: geoData.data.timeLabel,
            distance: geoData.data.distanceValue,
            time: geoData.data.timeValue
          }
          if (i == stops.length - 1) obj.name = 'end'
          if (i == 1)
            // store the start address at first stop
            accumulator[0].address = geoData.data.originLabel

          unitDistance += geoData.data.distanceValue
          unitTime += geoData.data.timeValue
        }
        accumulator.push(obj)
      }

      response.status = true
      response.message = 'Data Added'
      response.data = {
        stops: accumulator,
        unitTime: unitTime,
        unitDistance: Number(Number(unitDistance).toFixed(2))
      }
    } catch (error) {
      response.status = false
      response.message = 'Unprocessable'
      response.data = {}
      console.log('Error updating data', error)
    }
    return response
  }

  static addLocation = async (origin, destination) => {
    const response = {
      status: false,
      message: 'unprocessable',
      data: {}
    }
    try {
      const distanceData = await this.calculateDistanceAndTime(origin, destination)
      console.log('distanceData', distanceData)

      if (distanceData.error) {
        throw new Error(`${distanceData.msg}`)
      }

      const { distanceValue, distanceLabel, timeValue, timeLabel, from, to } = distanceData
      const createLocation = new DistanceLogs({
        originLabel: from,
        destinationLabel: to,
        origin: origin,
        destination: destination,
        distanceValue: distanceValue,
        distanceLabel: distanceLabel,
        timeValue: timeValue,
        timeLabel: timeLabel
      })

      const locationData = await createLocation.save()
      response.status = true
      response.message = 'Data Added'
      response.data = locationData
    } catch (error) {
      console.log(error)
      response.status = false
      response.message = error.message
      response.data = {}

      console.log('Error updating data', error)
    }
    return response
  }

  static calculateDistanceBetweenTwoPoints = async (originCoordinates, destinationCoordinates) => {
    try {
      const [pickupLatLongString] = originCoordinates
      const [destinationLatLongString] = destinationCoordinates

      const [latitude1, longitude1] = pickupLatLongString.split(',')
      const [latttude2, longitude2] = destinationLatLongString.split(',')

      const lat1 = parseFloat(latitude1)
      const lat2 = parseFloat(latttude2)

      const long1 = parseFloat(longitude1)
      const long2 = parseFloat(longitude2)

      const toRad = (value) => (value * Math.PI) / 180
      const earthRadius = 6371

      const dlat = toRad(lat2 - lat1)
      const dlong = toRad(long2 - long1)
      const a =
        Math.sin(dlat / 2) * Math.sin(dlat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlong / 2) * Math.sin(dlong / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = earthRadius * c
      return distance
    } catch (error) {
      console.log(error)
    }
  }

  static calculateDistanceAndTime = async (origin, destination) => {
    console.log('calculateDistanceAndTime', origin, destination)
    try {
      GoogleDistanceMatrix.key(`${Config.mapConfig.serverKey}`)
      GoogleDistanceMatrix.units('metric')
      GoogleDistanceMatrix.mode('driving')

      const data = {
        error: false,
        msg: '',
        distanceValue: 0, // Meters
        distanceLable: '',
        timeValue: 0, // Minutes
        timeLable: '',
        from: '',
        to: ''
      }

      return new Promise(function (resolve, reject) {
        GoogleDistanceMatrix.matrix(origin, destination, function (err, distances) {
          console.log('distances', JSON.stringify(distances), 'end')
          try {
            if (err) {
              data['error'] = true
              data['msg'] = err.toString()
              reject(data)
            }
            if (!distances) {
              data['error'] = true
              data['msg'] = 'Error Getting Estimation, Please check your distination Address.'
              reject(data)
            }
            if (
              distances &&
              distances.rows[0].elements[0].status === 'OK' &&
              distances.status !== 'REQUEST_DENIED'
            ) {
              data.from = distances.origin_addresses[0]
              data.to = distances.destination_addresses[0]
              data.distanceLabel = distances.rows[0].elements[0].distance.text
              data.distanceValue = distances.rows[0].elements[0].distance.value
              data.timeLabel = distances.rows[0].elements[0].duration.text
              data.timeValue = distances.rows[0].elements[0].duration.value
              resolve(data)
            } else {
              // If Api gives error response
              let errMsg = distances.error_message
              if (!errMsg) {
                errMsg = distances.rows[0].elements[0].status
                if (errMsg == 'ZERO_RESULTS')
                  errMsg = 'Error Getting Estimation, Please check your distination Address.'
              }
              data['error'] = true
              data['msg'] = errMsg
              reject(data)
            }
          } catch (error) {
            data['error'] = true
            data['msg'] = error.toString()
            reject(data)
          }
        })
      })
    } catch (error) {
      console.log(error, 'err')
      return error
    }
  }

  static calculateLinestringLength = async (polyLine, metrics = {}) => {
    let distance = 0
    try {
      const { distanceMetric = Config.app.distanceMetric } = metrics
      const lengthValue = await length(
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: polyLine
          },
          properties: {}
        },
        { units: 'metres' }
      )
      distance = Math.round(lengthValue)
      if (distanceMetric == Enum.TRIP.DISTANCEMETRIC.MILE) distance = Helpers.roundOff(distance * 0.000621371)
      else if (distanceMetric == Enum.TRIP.DISTANCEMETRIC.KILOMETER)
        distance = Helpers.roundOff(distance * 0.001)
      // else distance = distance
    } catch (error) {
      console.log('CALCULATE_LINE_STRING_LENGTH_ERROR', error)
      distance = 0
    }
    return distance
  }

  static routeImage = async (routeData) => {
    const response = {
      status: false,
      message: 'unprocessable',
      data: {}
    }
    try {
      /* Route Data format
        {
          storage : 'loction to store'
          pickupLocation : { lat: 9.9266848, lng: 78.1214533 },
          dropLocation: { lat: 9.9155739, lng: 78.1080646 },
          paths: ['9.9238488,78.1221824', '9.9238488,78.1221824']
        }
      */
      const properties = {
        key: `${Config.mapConfig.serverKey}`,
        scale: 1,
        size: '600x300',
        format: 'png',
        maptype: 'roadmap',
        mapId: `${Config.mapConfig.mapId}`,
        markers: [
          {
            location: routeData.pickupLocation,
            label: 'A',
            color: 'black'
          },
          {
            location: routeData.dropLocation,
            label: 'B',
            color: 'black'
          }
        ]
      }
      if (routeData.paths) {
        properties['paths'] = [
          {
            color: 'black',
            weight: '5',
            points: routeData.paths
          }
        ]
      }
      const mapEndPoint = await StaticMap.staticMapUrl(properties)
      if (routeData.storage) {
        const makePath = routeData.storage
        axios({
          url: mapEndPoint,
          method: 'GET',
          responseType: 'stream'
        })
          .then((getMap) => {
            fs.promises.writeFile(makePath, getMap.data, function (error) {
              if (error) console.error('ROUTE_IMAGE_WRITE_ERROR', error)
              else console.log('ROUTE_IMAGE_PATH', makePath)
            })
          })
          .catch((error) => console.error('ROUTE_IMAGE_STREAM_ERROR', error))
      }
      response.status = true
      response.message = 'Data Processed'
      response.data = {
        mapEndPoint: mapEndPoint
      }
    } catch (error) {
      console.log('ROUTE_IMAGE_ERROR', error)
      response.status = false
      response.message = error.message
      response.data = {}
    }
    return response
  }
}

// MapServices.routeImage({
//   pickupLocation: { lat: 9.9266848, lng: 78.1214533 },
//   dropLocation: { lat: 9.9155739, lng: 78.1080646 },
//   storage: './public/services/routes/i.png',
// }).then((data) => {
//   console.log(data)
// })
export { MapServices }
