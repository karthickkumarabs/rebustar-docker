/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
class ValidationError extends Error {
  constructor(message, { cause }) {
    super(message)
    this.name = this.constructor.name
    this.cause = cause
    Error.captureStackTrace(this, this.constructor)
  }
}

export { ValidationError }
