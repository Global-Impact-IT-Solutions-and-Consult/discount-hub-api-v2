import { Global, Module } from '@nestjs/common';
import { ScraperModule } from './scraper/scraper.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Global()
@Module({
  imports: [ScraperModule, CloudinaryModule],
  exports: [ScraperModule, CloudinaryModule],
})
export class ServicesModule {}
