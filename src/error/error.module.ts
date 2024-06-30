import { Module } from '@nestjs/common';
import { ErrorService } from './services/error.service';
import { ErrorController } from './error.controller';

@Module({
  providers: [ErrorService],
  controllers: [ErrorController]
})
export class ErrorModule {}
