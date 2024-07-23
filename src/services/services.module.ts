import { Global, Module } from '@nestjs/common';
import { ScrapersModule } from './scrapers/scrapers.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Global()
@Module({
  imports: [ScrapersModule, CloudinaryModule],
  exports: [ScrapersModule, CloudinaryModule],
})
export class ServicesModule {}
