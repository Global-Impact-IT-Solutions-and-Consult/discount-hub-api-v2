import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configureSwagger } from './common/config/swaggar.config';
import { EnvironmentVariables } from './common/config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvironmentVariables>);

  // Get allowed origins from environment
  const clientUrl = configService.get('CLIENT_URL');
  const nodeEnv = configService.get('NODE_ENV');

  // Configure CORS with explicit origins for production
  const allowedOrigins: string[] = [
    'https://discountshub.co',
    'https://www.discountshub.co',
  ];

  // Add CLIENT_URL if it exists and is different
  if (clientUrl && !allowedOrigins.includes(clientUrl)) {
    allowedOrigins.push(clientUrl);
  }

  app.enableCors({
    origin: nodeEnv === 'production' ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  });

  configureSwagger(app, 'documentation');
  await app.listen(configService.get('PORT'), '0.0.0.0', () =>
    new Logger('Documentation').log(
      `http://localhost:${configService.get('PORT')}/documentation`,
    ),
  );
}
bootstrap();
