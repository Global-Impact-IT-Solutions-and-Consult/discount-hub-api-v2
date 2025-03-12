import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { JumiaScraperService } from './scrapers/jumia.scraper';
import { CompanyModule } from 'src/company/company.module';
import { ProductModule } from 'src/product/product.module';
import { AiModule } from 'src/services/ai/ai.module';
import { BullModule } from '@nestjs/bullmq';
import { KongaScraperService } from './scrapers/konga.scraper';
// import { TemuScraperService } from './scrapers/temu.scraper';
import { AliexpressScraperService } from './scrapers/aliexpress.scraper';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scraper',
    }),
    CompanyModule,
    ProductModule,
    AiModule,
  ],
  providers: [
    ScraperService,
    JumiaScraperService,
    KongaScraperService,
    // TemuScraperService,
    AliexpressScraperService,
  ],
  exports: [ScraperService],
})
export class ScraperModule {}
