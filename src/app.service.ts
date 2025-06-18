import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScraperService } from './services/scraper/scraper.service';
import { ProductService } from './product/product.service';
import { CompanyService } from './company/company.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
// import { CompanyService } from './company/company.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly scraperService: ScraperService,
    private readonly productService: ProductService,
    private readonly companyService: CompanyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onApplicationBootstrap() {
    this.scrapeProducts();
    // // this.productService.removeAll(); // disabled on dev
    // this.scraperService.startAllCompanyScrapers(); // disabled on dev
    // this.productService.getRandomFeaturedItemsByTag(); // disabled on dev
    // this.productService.getRandomFeaturedCategory(); // disabled on dev
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'scraperJob', // Give the job a name so it can be managed programmatically
  })
  async handleCron() {
    // this.logger.debug('Called once to add scrape job to queue...');
    // await this.scraperService.startAllCompanyScrapers();
    // await this.productService.getRandomFeaturedItemsByTag();
    // await this.productService.getRandomFeaturedCategory(); // disabled on dev
  }

  async scrapeProducts() {
    const companies = await this.companyService.findAll();
    for (const company of companies) {
      this.eventEmitter.emit(`scrape.${company.slug}`, {});
    }
  }
}
