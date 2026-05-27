/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import googlepolyline from 'google-polyline'
// import lodash from 'lodash'
import _ from 'lodash'
// const _ = lodash
import request from 'async-request'
import { lineString, point } from '@turf/helpers'
import { lineIntersect } from '@turf/line-intersect'
import { nearestPointOnLine } from '@turf/nearest-point-on-line'
import geolib from 'geolib'
import GoogleDistanceMatrix from 'google-distance-matrix'
GoogleDistanceMatrix.key(Config.mapConfig.serverKey)
import { Config } from '../../../config/AppConfig.js'
import { BaseController } from '../../../controllers/BaseController.js'

class ShareRideMatch extends BaseController {
  constructor() {
    super()
  }

  static comparePoly = async (polyline1, polyline2, findRideDist, data, params) => {
    const travellingPerConfig = params.config.travellingPer ? params.config.travellingPer : 50
    const nonTravellingDisConfig = params.config.nonTravellingDis ? params.config.nonTravellingDis : 4

    const dePoly1 = await this.decodeEncodedPolyline(polyline1) // offer
    const dePoly2 = await this.decodeEncodedPolyline(polyline2) // find
    const dePoly1RevRaw = _.reverse(_.clone(dePoly1.raw))
    const dePoly2RevRaw = _.reverse(_.clone(dePoly2.raw))

    const line1 = lineString(dePoly1.raw)
    let line2
    let pickUpIntersects
    let dropIntersects

    let nextKey = 0
    const response = {}
    let startPtsWithin = false
    let endPtsWithin = false
    for (let k = 0; k < dePoly2.raw.length - 1 && !startPtsWithin; k++) {
      nextKey = k + 1
      line2 = lineString([
        [dePoly2.raw[k][0], dePoly2.raw[k][1]],
        [dePoly2.raw[nextKey][0], dePoly2.raw[nextKey][1]]
      ])
      pickUpIntersects = lineIntersect(line1, line2)
      if (!_.isEmpty(pickUpIntersects.features)) {
        const pointData = point([dePoly2.raw[nextKey][0], dePoly2.raw[nextKey][1]])
        const snapped = nearestPointOnLine(line1, pointData, { units: 'kilometers' })
        if (snapped.properties.index > 0) {
          const omatchedPointLat = dePoly1.raw[snapped.properties.index][0]
          const omatchedPointLong = dePoly1.raw[snapped.properties.index][1]
          const oprevMatchedPointLat = dePoly1.raw[snapped.properties.index - 1][0]
          const oprevMatchedPointLong = dePoly1.raw[snapped.properties.index - 1][1]
          // console.log(oprevMatchedPointLat,oprevMatchedPointLong,omatchedPointLat,omatchedPointLong)
          const offerDir = await this.getDirection(
            oprevMatchedPointLat,
            oprevMatchedPointLong,
            omatchedPointLat,
            omatchedPointLong
          )
          const findDir = await this.getDirection(
            dePoly2.raw[k][0],
            dePoly2.raw[k][1],
            dePoly2.raw[nextKey][0],
            dePoly2.raw[nextKey][1]
          )
          if (findDir == offerDir) {
            response['startPoint'] = {
              lat: dePoly2.raw[k][0],
              lng: dePoly2.raw[k][1]
            }
          } else {
            response['startPoint'] = {
              lat: dePoly2.raw[nextKey][0],
              lng: dePoly2.raw[nextKey][1]
            }
          }
        } else {
          response['startPoint'] = {
            lat: dePoly2.raw[nextKey][0],
            lng: dePoly2.raw[nextKey][1]
          }
        }

        startPtsWithin = true
        console.log('startPtsWithin', startPtsWithin)
        return false
      }
    }

    nextKey = 0
    for (let k = 0; k < dePoly2RevRaw.length - 1 && !endPtsWithin; k++) {
      console.log('dePoly2RevRaw.length', dePoly2RevRaw.length)
      nextKey = k + 1
      // if (k < dePoly2RevRaw.length - 1 && endPtsWithin == false) {
      line2 = lineString([
        [dePoly2RevRaw[nextKey][0], dePoly2RevRaw[nextKey][1]],
        [dePoly2RevRaw[k][0], dePoly2RevRaw[k][1]]
      ])
      dropIntersects = lineIntersect(line1, line2)
      if (!_.isEmpty(dropIntersects.features)) {
        const pointData = point([dePoly2RevRaw[nextKey][0], dePoly2RevRaw[nextKey][1]])
        const snapped = nearestPointOnLine(line1, pointData, { units: 'kilometers' })
        if (snapped.properties.index > 0) {
          const omatchedPointLat = dePoly1RevRaw[snapped.properties.index][0]
          const omatchedPointLong = dePoly1RevRaw[snapped.properties.index][1]
          const oprevMatchedPointLat = dePoly1RevRaw[snapped.properties.index - 1][0]
          const oprevMatchedPointLong = dePoly1RevRaw[snapped.properties.index - 1][1]
          // console.log(oprevMatchedPointLat,oprevMatchedPointLong,omatchedPointLat,omatchedPointLong)
          const offerDir = await this.getDirection(
            omatchedPointLat,
            omatchedPointLong,
            oprevMatchedPointLat,
            oprevMatchedPointLong
          )
          const findDir = await this.getDirection(
            dePoly2RevRaw[nextKey][0],
            dePoly2RevRaw[nextKey][1],
            dePoly2RevRaw[k][0],
            dePoly2RevRaw[k][1]
          )
          /* console.log('dir')
            console.log(offerDir)
            console.log(findDir)*/

          if (findDir == offerDir) {
            response['endPoint'] = {
              lat: dePoly2RevRaw[k][0],
              lng: dePoly2RevRaw[k][1]
            }
            response['data'] = data
          } else {
            response['endPoint'] = {
              lat: dePoly2RevRaw[nextKey][0],
              lng: dePoly2RevRaw[nextKey][1]
            }
            response['data'] = data
          }
        } else {
          response['endPoint'] = {
            lat: dePoly2RevRaw[nextKey][0],
            lng: dePoly2RevRaw[nextKey][1]
          }
          response['data'] = data
        }

        endPtsWithin = true
        console.log('endPtsWithin', endPtsWithin)
        return false
      }
      // }
    }
    // console.log('response', response)
    console.log('startPtsWithin && endPtsWithin', startPtsWithin && endPtsWithin)
    if (startPtsWithin && endPtsWithin) {
      const travellingDis = await this.distanceCal(
        response.startPoint.lat + ',' + response.startPoint.lng,
        response.endPoint.lat + ',' + response.endPoint.lng
      )
      // console.log('travellingDis', travellingDis)
      response['riderPickupPointAddress'] = travellingDis.from
      response['riderPickupPointLatLng'] = [response.startPoint.lat, response.startPoint.lng]
      // console.log('travellingDis', travellingDis)
      const splitTravellingDis = Number(travellingDis.distanceValue / 1000)
      const nonTravellingDis = await this.distanceCal(
        response.endPoint.lat + ',' + response.endPoint.lng,
        params.tolat + ',' + params.tolng
      )
      // console.log('nonTravellingDis', nonTravellingDis)
      const splitNonTravellingDis = Number(nonTravellingDis.distanceValue / 1000)
      const travellingPer = (parseFloat(splitTravellingDis) / parseFloat(findRideDist)) * 100
      // var nonTravellingPer = (parseFloat(splitNonTravellingDis[0])/parseFloat(findRideDist) ) * 100
      console.log(
        'travellingPer > travellingPerConfig',
        travellingPer,
        travellingPerConfig,
        travellingPer > travellingPerConfig,
        'splitNonTravellingDis < nonTravellingDisConfig',
        splitNonTravellingDis,
        nonTravellingDisConfig,
        splitNonTravellingDis < nonTravellingDisConfig
      )
      return travellingPer > travellingPerConfig && splitNonTravellingDis < nonTravellingDisConfig
        ? response
        : {}
    }

    return response
  }

  static distanceCal = async (origin, destination) => {
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
      GoogleDistanceMatrix.matrix([origin], [destination], function (err, distances) {
        try {
          if (err) {
            data['error'] = true
            data['msg'] = err.toString()
            reject(data)
          }
          if (!distances) {
            data['error'] = true
            data['msg'] = err.toString()
            reject(data)
          }
          if (
            typeof distances !== 'undefined' &&
            distances !== null &&
            typeof distances.status !== 'undefined' &&
            distances.status == 'OK' &&
            typeof distances.rows !== 'undefined' &&
            typeof distances.rows[0] !== 'undefined' &&
            typeof distances.rows[0].elements !== 'undefined' &&
            typeof distances.rows[0].elements[0] !== 'undefined' &&
            typeof distances.rows[0].elements[0].distance !== 'undefined'
          ) {
            data.from = distances.origin_addresses[0]
            data.to = distances.destination_addresses[0]
            data.distanceLable = distances.rows[0].elements[0].distance.text
            data.distanceValue = distances.rows[0].elements[0].distance.value
            data.timeLable = distances.rows[0].elements[0].duration.text
            data.timeValue = distances.rows[0].elements[0].duration.value
            // console.log('data',data)
            resolve(data)
          } else {
            // If Api gives error response
            data['error'] = true
            data['msg'] = distances.error_message
            reject(data)
          }
        } catch (error) {
          data['error'] = true
          data['msg'] = err.toString()
          reject(data)
        }
      })
    })
  }

  static decodeEncodedPolyline = async (polyline) => {
    // loggerFunc('debug','enpath'+polyline)
    const dePoly = googlepolyline.decode(polyline)
    const raw = googlepolyline.decode(polyline)
    // loggerFunc('debug','decode'+dePoly)
    const dePoly3 = []
    const dePoly4 = []
    const dePoly5 = []
    let x = 0
    const len = dePoly.length
    while (x < len) {
      dePoly3.push([parseFloat(dePoly[x][0].toFixed(3)), parseFloat(dePoly[x][1].toFixed(3))])
      dePoly4.push([parseFloat(dePoly[x][0].toFixed(4)), parseFloat(dePoly[x][1].toFixed(4))])
      dePoly5.push([parseFloat(dePoly[x][0].toFixed(5)), parseFloat(dePoly[x][1].toFixed(5))])
      dePoly[x][1] = parseFloat(dePoly[x][1].toFixed(2))
      dePoly[x][0] = parseFloat(dePoly[x][0].toFixed(2))
      x++
    }

    /* dePoly3 = JSON.stringify(dePoly3) //Round to three
    dePoly = JSON.stringify(dePoly) //Round to Two*/
    const polylines = { two: dePoly, three: dePoly3, raw: raw, four: dePoly4, five: dePoly5 }
    return polylines
  }

  static getDirection = async (slat, slon, elat, elon) => {
    // console.log('343534446456')
    // console.log(slat)
    // console.log(slon)
    // console.log(elat)
    // console.log(elon)
    let headingTwds = geolib.getCompassDirection(
      { latitude: slat, longitude: slon },
      { latitude: elat, longitude: elon }
    )
    // console.log(headingTwds)
    if (typeof headingTwds.exact != 'undefined') {
      headingTwds = headingTwds.exact
    }
    // console.log(typeof headingTwds)
    if (headingTwds.length > 2) {
      headingTwds = headingTwds.substring(1)
    }
    const direction = headingTwds
    return direction
  }

  static getEncodePathToStore = async (origin, destination) => {
    try {
      const urlToCall =
        'https://maps.googleapis.com/maps/api/directions/json?origin=' +
        origin +
        '&destination=' +
        destination +
        '&key=' +
        Config.mapConfig.serverKey
      const response = await request(urlToCall)
      let resp = ''
      if (response.statusCode == 200) {
        resp = response.body
        resp = JSON.parse(resp)
        const enpath = resp.routes[0].overview_polyline.points
        return enpath
      }
      return ''
    } catch (error) {
      console.log('error', error)
      return ''
    }
  }

  static getLatLngDirection = async (params) => {
    const fromlat = parseFloat(params.fromlat)
    const fromlng = parseFloat(params.fromlang)
    const tolat = parseFloat(params.tolat)
    const tolng = parseFloat(params.tolang)

    const resObj = {
      latdirection: 'positive',
      lngdirection: 'positive'
    }

    if (fromlat < tolat) resObj.latdirection = 'positive'
    else resObj.latdirection = 'negative'

    if (fromlng < tolng) resObj.lngdirection = 'positive'
    else resObj.lngdirection = 'negative'

    return resObj
  }
}
export { ShareRideMatch }
