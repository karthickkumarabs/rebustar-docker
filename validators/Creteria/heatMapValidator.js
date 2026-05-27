/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import mongoose from 'mongoose'

class heatMapValidator {
  // Custom heat map validation
  static validateHeatMapQuery = (queryData) => {
    const now = new Date()
    const nowInMinutes = now.getHours() * 60 + now.getMinutes()

    const parseTime = (str) => {
      const [h, m] = (str || '').split(':').map(Number)
      return isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59 ? null : { h, m }
    }

    const { serviceArea, createdAtGte, createdAtLte, timeGte, timeLte } = queryData

    if (serviceArea && !mongoose.Types.ObjectId.isValid(serviceArea)) {
      return 'Invalid serviceArea ID.'
    }

    if (!createdAtGte && createdAtLte) {
      return 'Provide createdAtGte when using a single date.'
    }

    const rawStart = createdAtGte ? new Date(createdAtGte) : null
    const rawEnd = createdAtLte ? new Date(createdAtLte) : null

    const dateOnly = createdAtGte && !createdAtLte
    const start = dateOnly && rawStart ? new Date(rawStart.setHours(0, 0, 0, 0)) : rawStart
    const end = dateOnly && rawStart ? new Date(rawStart.setHours(23, 59, 59, 999)) : rawEnd

    if ([start, end].some((d) => d && isNaN(d))) return 'Invalid date format.'
    if (start && start > now) return 'Start date cannot be in the future.'
    if (end && end > now) return 'End date cannot be in the future.'

    if ((timeGte && !timeLte) || (!timeGte && timeLte)) {
      return 'Both timeGte and timeLte are required for time filtering.'
    }

    const gte = parseTime(timeGte)
    const lte = parseTime(timeLte)

    if ((timeGte && !gte) || (timeLte && !lte)) return 'Invalid time format. Use HH:MM.'

    if (gte && lte) {
      const gteMin = gte.h * 60 + gte.m
      const lteMin = lte.h * 60 + lte.m

      const isSameDay =
        (createdAtLte || createdAtGte) &&
        new Date(createdAtLte || createdAtGte).toDateString() === now.toDateString()

      const effectiveLte = isSameDay && lteMin > nowInMinutes ? nowInMinutes : lteMin

      if (gteMin >= lteMin) return 'timeGte must be earlier than timeLte.'
      if (isSameDay && gteMin > nowInMinutes) return 'timeGte cannot be in the future.'
      if (isSameDay && gteMin >= effectiveLte) return 'Time range cannot be in the future.'
    }

    return null
  }
}

export { heatMapValidator }
