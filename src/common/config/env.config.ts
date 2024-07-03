import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { Environments } from 'src/common/constants/enum';

const config = new ConfigService();
const ENVIRONMENT = config.get('NODE_ENV');

export const env = {
  NODE_ENV: ENVIRONMENT,
  MONGO_URI: config.get<string>('MONGO_URI'),
  PORT: config.get<number>('PORT'),
  APP_URL: config.get<string>('APP_URL'),
  REDIS_HOST: config.get<string>('REDIS_HOST'),
  REDIS_PORT: config.get<string>('REDIS_PORT'),

  isDevelopment() {
    return this.NODE_ENV === Environments.DEVELOPMENT;
  },
  isStaging() {
    return this.NODE_ENV === Environments.STAGING;
  },
  isProduction() {
    return this.NODE_ENV === Environments.PRODUCTION;
  },
};
