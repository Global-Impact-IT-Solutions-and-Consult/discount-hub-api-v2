import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const configureSwagger = (app: INestApplication, path: string) => {
  const config = new DocumentBuilder()
    .setTitle('Discount Hub Documentation')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.tags = document.tags?.sort((a, b) => a.name.localeCompare(b.name));
  SwaggerModule.setup(path, app, document);
};
