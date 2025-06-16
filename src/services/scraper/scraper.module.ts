import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { JumiaScraperService } from './scrapers/jumia.scraper';
import { CompanyModule } from 'src/company/company.module';
import { ProductModule } from 'src/product/product.module';
import { AiModule } from 'src/services/ai/ai.module';
import { BullModule } from '@nestjs/bullmq';
import { KongaScraperService } from './scrapers/konga.scraper';
import { AliExpressScraperService } from './scrapers/aliexpress.scraper';
import { JOB_NAMES } from 'src/utils/constants';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { TemuScraperService } from './scrapers/temu.scraper';
@Module({
  imports: [
    CompanyModule,
    ProductModule,
    AiModule,
    ...Object.values(JOB_NAMES.scraper).map((name) =>
      BullModule.registerQueue({
        name,
      }),
    ),
    ...Object.values(JOB_NAMES.scraper).map((name) =>
      BullBoardModule.forFeature({
        name,
        adapter: BullMQAdapter, //or use BullAdapter if you're using bull instead of bullMQ
      }),
    ),
  ],
  providers: [
    ScraperService,
    JumiaScraperService,
    KongaScraperService,
    TemuScraperService,
    AliExpressScraperService,
  ],
  exports: [ScraperService],
})
export class ScraperModule {}
