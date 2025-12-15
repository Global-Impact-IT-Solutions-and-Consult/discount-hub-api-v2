import { Global, Module } from '@nestjs/common';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ScraperModule } from './scraper/scraper.module';
import { AiModule } from './ai/ai.module';
import { AwsModule } from './aws/aws.module';

@Global()
@Module({
  imports: [ScraperModule, CloudinaryModule, AiModule, AwsModule],
  exports: [ScraperModule, CloudinaryModule, AiModule, AwsModule],
})
export class ServicesModule {}
