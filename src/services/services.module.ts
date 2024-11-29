import { Global, Module } from '@nestjs/common';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ScraperModule } from './scraper/scraper.module';
import { AiModule } from './ai/ai.module';

@Global()
@Module({
  imports: [ScraperModule, CloudinaryModule, AiModule],
  exports: [ScraperModule, CloudinaryModule, AiModule],
})
export class ServicesModule {}
