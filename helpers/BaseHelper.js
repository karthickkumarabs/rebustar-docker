/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
class BaseHelper {
  static pick = async (obj, arr) => {
    const returnObj = arr.reduce((acc, record) => {
      if (record in obj) {
        acc[record] = obj[record]
      }
      return acc
    }, {})
    return returnObj
  }
}
export { BaseHelper }
