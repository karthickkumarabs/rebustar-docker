/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { parentPort, workerData } from 'worker_threads'
// import fs from 'fs'
import PDFDocument from 'pdfkit'
import { Buffer } from 'buffer'

// Document Helper Functions

function generateHeader(document) {
  document
    .image('public/Assets/logo.png', 50, 45, { width: 50 })
    .fillColor('#444444')
    .fontSize(20)
    .text('REBUSTAR', 110, 57)
}

function generateTableRow(document, y, item, amount) {
  document.fontSize(10).text(item, 50, y).text(amount, 0, y, { align: 'right' })
}

function generateHr(document, y) {
  document.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke()
}

function generateBasicDetails(document, invoice) {
  document
    .fillColor('#444444')
    .fontSize(20)
    .text('#' + invoice.invoiceNo, 50, 160)
    .fontSize(10)
    .text(invoice.createdAt, 200, 160, { align: 'right' })
    .moveDown()

  generateHr(document, 185)

  const customerInformationTop = 200

  document
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(invoice.partner.name, 50, customerInformationTop)
    .font('Helvetica')
    .text(invoice.partner.vehicleType + ' / ' + invoice.partner.vehicleNo, 50, customerInformationTop + 15)
    .text(invoice.partner.distance + ' / ' + invoice.partner.time, 50, customerInformationTop + 30)
    .moveDown()

  document
    .fontSize(10)
    .font('Helvetica')
    .text('Pickup : ' + invoice.pickupAddress, 50, customerInformationTop + 60)
    .font('Helvetica')
    .text('Drop : ' + invoice.dropAddress, 50, customerInformationTop + 75)
    .moveDown()

  // generateHr(document, 252)
}

function generateInvoiceTable(document, invoice) {
  let i
  const invoiceTableTop = 330

  document
    .fillColor('#444444')
    .fontSize(20)
    .text('#' + invoice.invoiceNo, 50, 160)

  document.font('Helvetica-Bold')
  generateTableRow(
    document,
    invoiceTableTop,
    'Total Amount',
    invoice.paymentMode + ' / ' + invoice.currency + ' ' + invoice.totalFare
  )
  generateHr(document, invoiceTableTop + 20)
  document.font('Helvetica')

  for (i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i]
    const position = invoiceTableTop + (i + 1) * 30
    generateTableRow(document, position, item.item, invoice.currency + ' ' + item.value)
  }
}

function generateFooter(document) {
  document
    .fontSize(10)
    .text('Thankyou for being our Customer, if any clarification please check in app.', 50, 780, {
      align: 'center',
      width: 500
    })
}

const generateInvoice = async () => {
  return new Promise((resolve, reject) => {
    try {
      const document = new PDFDocument({ size: 'A4', margin: 50 })
      const { invoice = {} } = workerData
      const buffers = []
      document.on('data', buffers.push.bind(buffers))
      document.on('end', () => {
        const buffer = Buffer.concat(buffers)
        resolve({ buffer })
      })

      generateHeader(document)
      generateBasicDetails(document, invoice)
      generateInvoiceTable(document, invoice)
      generateFooter(document)

      document.end()
    } catch (error) {
      //   throw error
      reject(error)
    }
  })
}

generateInvoice()
  .then((result) => {
    parentPort.postMessage(result)
  })
  .catch((error) => {
    console.log('GENERATEINVOICE_WORKER_ERROR', error)
    parentPort.postMessage({ error: error.message })
  })
