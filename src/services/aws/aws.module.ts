import { Module } from '@nestjs/common';
import { LambdaService } from './lambda.service';
import { BedRockService } from './bedrock.service';

@Module({
  providers: [LambdaService, BedRockService],
  exports: [LambdaService, BedRockService],
})
export class AwsModule {}
