import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { JumiaScraper } from './scrapers/jumia.scraper';
import { CompanyModule } from 'src/company/company.module';
import { ProductModule } from 'src/product/product.module';
import { AiModule } from 'src/services/ai/ai.module';

@Module({
  imports: [CompanyModule, ProductModule, AiModule],
  providers: [ScraperService, JumiaScraper],
  exports: [ScraperService],
})
export class ScraperModule {}
