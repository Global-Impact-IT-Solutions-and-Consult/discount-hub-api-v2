import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScraperService } from './services/scraper/scraper.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly scraperService: ScraperService) {}

  onApplicationBootstrap() {
    // this.scraperService.startAllCompanyScrapers(); // disabled on dev
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'scraperJob', // Give the job a name so it can be managed programmatically
  })
  async handleCron() {
    this.logger.debug('Called once to add scrape job to queue.');
    await this.scraperService.startAllCompanyScrapers();
  }
}
