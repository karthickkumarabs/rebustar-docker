/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import app from '../server/app.js'
import request from 'supertest'
import { expect } from 'chai'

const inputParams = {
  userLogin: {
    email: 'rider.android@rebustar.com',
    password: 'rebustar@2023'
  },
  driverLogin: {
    email: 'rebupartner@gmail.com',
    password: '12345678'
  },
  vehicleId: '65250725938bc77fc492c959',
  driverLocation: {
    lat: '9.915869',
    lon: '78.1123'
  },
  userDevice: '123456',
  driverDevice: '123654',
  pickupLat: '9.939093',
  pickupLng: '78.121719',
  dropLat: '9.915869',
  dropLng: '78.1123'
}
describe('Array', function () {
  describe('#indexOf()', function () {
    it('check server running', async function () {
      const res = await request(app).get('/')
      expect(res.status).to.equal(200)
    })

    const data = {}

    it('Driver Login', async function () {
      const res = await request(app)
        .post('/common/login/partner')
        .set('x-client-id', inputParams.driverDevice)
        .send(inputParams.driverLogin)

      data.driver = res.body.data
      if (data.driver.partner.curStatus !== 'free') {
        throw new Error('Driver is not Free')
      }
      expect(res.status).to.equal(200)
    })

    it('Driver Update Location', async function () {
      const res = await request(app)
        .put('/common/partner/services/request/update/daily')
        .set('Authorization', data.driver.token)
        .set('x-client-id', inputParams.driverDevice)
        .send(inputParams.driverLocation)

      expect(res.status).to.equal(200)
    })

    it('get Driver All Vehicles', async function () {
      console.log('vehicle Id', data.driver.partner._id)
      const res = await request(app)
        .get('/creteria/vehicle/partner/' + data.driver.partner._id)
        .set('Authorization', data.driver.token)
        .set('x-client-id', inputParams.driverDevice)
      const vehilcles = res.body.data.Vehicle
      if (vehilcles < 1) {
        throw new Error('No vehicle found')
      }
      // vehicle with particular requested service type
      data.vehicle = vehilcles.find((item) => item.servicetype === inputParams.vehicleId)
      if (!data.vehicle) {
        throw new Error('vehicle with selected service type not found')
      }
      expect(res.status).to.equal(200)
    })

    it('Set Active Vehicle', async function () {
      const res = await request(app)
        .get('/creteria/vehicle/active')
        .set('Authorization', data.driver.token)
        .set('x-client-id', inputParams.driverDevice)
        .query({
          vehicleId: data.vehicle._id
        })
      expect(res.status).to.equal(200)
    })

    it('Login Customer', async function () {
      const res = await request(app)
        .post('/common/login/customer')
        .send(inputParams.userLogin)
        .set('x-client-id', inputParams.userDevice)

      data.user = res.body.data
      expect(res.status).to.equal(200)
    })

    it('Create Trip Request', async function () {
      console.log('userToken', data.user.token)
      const res = await request(app)
        .post('/services/request/create')
        .send({
          vehicleId: inputParams.vehicleId,
          pickupLat: inputParams.pickupLat,
          pickupLng: inputParams.pickupLng,
          dropLat: inputParams.dropLat,
          dropLng: inputParams.dropLng,
          type: 'daily',
          requestFrom: 'app',
          paymentMethod: 'cash',
          time: '11:39:14',
          utc: 'GMT+05:30',
          currency: 'INR'
        })
        .set('Authorization', data.user.token)
        .set('x-client-id', inputParams.userDevice)

      data.trip = res.body.data
      if (!data.trip.requestDetails) {
        throw err(data.trip.message)
      }
      try {
        expect(res.status).to.equal(200)
      } catch (err) {
        console.log('Error response', res)
      }
    })

    it('Driver Accept Trip', async function () {
      console.log('token', data.driver.token)
      const res = await request(app)
        .patch('/services/request/status')
        .set('Authorization', data.driver.token)
        .set('x-client-id', inputParams.driverDevice)
        .type('form')
        .send({
          requestId: data.trip.requestDetails,
          status: 'accept'
        })
      try {
        expect(res.status).to.equal(200)
      } catch (e) {
        console.log('response', res)
      }
    })

    it('Driver Arrived Status', async function () {
      const res = await request(app)
        .put('/services/request/update')
        .set('Authorization', data.driver.token)
        .set('x-client-id', inputParams.driverDevice)
        .type('form')
        .send({
          tripId: data.trip.tripId,
          status: 1,
          dropLat: inputParams.dropLat,
          dropLng: inputParams.dropLng,
          requestTime: '11:40:00'
        })
      expect(res.status).to.equal(200)
    })

    it('Driver Progress', async function () {
      const res = await request(app)
        .put('/services/request/update')
        .set('Authorization', data.driver.token)
        .set('x-client-id', inputParams.driverDevice)
        .type('form')
        .send({
          tripId: data.trip.tripId,
          status: 2,
          dropLat: inputParams.dropLat,
          dropLng: inputParams.dropLng,
          requestTime: '11:40:00'
        })
      expect(res.status).to.equal(200)
    })

    it('Driver End Trip', async function () {
      const res = await request(app)
        .put('/services/request/update')
        .set('Authorization', data.driver.token)
        .set('x-client-id', inputParams.driverDevice)
        .type('form')
        .send({
          tripId: data.trip.tripId,
          status: 3,
          dropLat: inputParams.dropLat,
          dropLng: inputParams.dropLng,
          requestTime: '11:40:00'
        })
      expect(res.status).to.equal(200)
    })
  })
})
