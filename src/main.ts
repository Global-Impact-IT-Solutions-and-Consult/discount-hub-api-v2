import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configureSwagger } from './common/config/swaggar.config';
import { EnvironmentVariables } from './common/config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
  });
  configureSwagger(app, 'documentation');
  await app.listen(app.get(ConfigService).get('PORT'), '0.0.0.0', () =>
    new Logger('Documentation').log(
      `http://localhost:${app.get(ConfigService<EnvironmentVariables>).get('PORT')}/documentation`,
    ),
  );
}
bootstrap();
