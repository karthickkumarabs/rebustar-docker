/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { parentPort, workerData } from 'worker_threads'
import XLSX from 'xlsx'

const generateExcel = async () => {
  try {
    const data = workerData.data
    const columns = workerData.columns
    // const filename = workerData.filename;
    const headers = Object.keys(columns)
      .filter((item) => columns[item])
      .map((item) => columns[item])

    // Create a new workbook and add a worksheet
    const wb = XLSX.utils.book_new()
    const wsData = [headers]

    // Adding data
    data.forEach((item) => {
      const rowValues = Object.keys(columns).map(
        (column) => column.split('.').reduce((prev, cur) => prev[cur], item) || ''
      )
      wsData.push(rowValues)
    })

    // Convert array of arrays to a worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    // Write to a buffer instead of a file
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return { buffer }
  } catch (error) {
    console.error('An error occurred while processing the buffer:', error)
    throw error
  }
}

generateExcel()
  .then((result) => {
    parentPort.postMessage(result)
  })
  .catch((error) => {
    parentPort.postMessage({ error: error.message })
  })
