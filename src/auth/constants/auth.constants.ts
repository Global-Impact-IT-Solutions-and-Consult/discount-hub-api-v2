export enum TokenTimeout {
  FIVE_MINS = 60 * 5,
  FIFTEEN_MINS = 60 * 15,
  THIRTY_MINS = 60 * 30,
  ONE_HOUR = 60 * 60,
  SIX_HOUR = 60 * 60 * 6,
  TWELVE_HOUR = 60 * 60 * 12,
  TWENTY_FOUR_HOUR = 60 * 60 * 24,
  TWO_WEEKS = 60 * 60 * 24 * 14,
}

export enum JWTConfig {
  AUD = 'authenticated',
  ISSUER = 'triggo.com',
  //   ALGO = 'RS256',
  ALGO = 'HS256',
  REFRESH_EXPIRY = '48H',
  ACCESS_EXPIRY = '96H',
}

export enum AuthOtpType {
  LOGIN = 'login',
  VERIFICATION = 'verification',
  FORGOT_PASSWORD = 'forgot_password',
}
