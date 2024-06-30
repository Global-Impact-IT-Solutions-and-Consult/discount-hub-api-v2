import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
const PORT = Number(process.env.PORT || 4003);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(PORT, () =>
    Logger.log(`
    ************************************************
    Welcome to Discount Hub. Server listening on port: ${PORT}   
    ************************************************
  `),
  );
}
bootstrap();
