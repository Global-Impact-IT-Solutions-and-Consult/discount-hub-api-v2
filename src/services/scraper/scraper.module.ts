import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { JumiaScraper } from './scrapers/jumia.scraper';
import { CompanyModule } from 'src/company/company.module';
import { ProductModule } from 'src/product/product.module';

@Module({
  imports: [CompanyModule, ProductModule],
  providers: [ScraperService, JumiaScraper],
})
export class ScraperModule {}
