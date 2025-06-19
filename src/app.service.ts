import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CompanyService } from './company/company.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
// import { CompanyService } from './company/company.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly companyService: CompanyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'scraperJob', // Give the job a name so it can be managed programmatically
  })
  async handleCron() {
    // this.logger.debug('Called once to add scrape job to queue...');
    // await this.scraperService.startAllCompanyScrapers();
    // await this.productService.getRandomFeaturedItemsByTag();
    // await this.productService.getRandomFeaturedCategory(); // disabled on dev
    await this.scrapeProducts();
  }

  async scrapeProducts() {
    const companies = await this.companyService.findAll();
    for (const company of companies) {
      this.eventEmitter.emit(`scrape.${company.slug}`, { company });
    }
  }
}
