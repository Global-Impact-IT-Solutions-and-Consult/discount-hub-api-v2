import { Global, Module } from '@nestjs/common';
import { ScrapersModule } from './scrapers/scrapers.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AiModule } from './ai/ai.module';

@Global()
@Module({
  imports: [ScrapersModule, CloudinaryModule, AiModule],
  exports: [ScrapersModule, CloudinaryModule],
})
export class ServicesModule {}
