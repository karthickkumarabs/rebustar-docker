/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const OTPConfig = {
  isEnable: true,
  maxOTPRequest: 3,
  failAttemptLimit: 5,
  isBlock: {
    isEnable: true,
    blockforExceedOTPRequest: 6, // in hours
    blockForFailedAttempt: 12 // in hours
  }
}
export { OTPConfig }
