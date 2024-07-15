import { Global, Module } from '@nestjs/common';
import { ScrapersModule } from './scrapers/scrapers.module';

@Global()
@Module({
  imports: [ScrapersModule],
  exports: [ScrapersModule],
})
export class ServicesModule {}
