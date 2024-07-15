import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configureSwagger } from './common/config/swaggar.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
  });
  configureSwagger(app, 'documentation');
  await app.listen(app.get(ConfigService).get('PORT'), () =>
    Logger.log(`
    ************************************************
    Welcome to Discount Hub. Server listening on port: ${app.get(ConfigService).get('PORT')}   
    ************************************************
  `),
  );
}
bootstrap();
