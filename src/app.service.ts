import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { ScraperService } from './services/scraper/scraper.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private jobHasRun = false; // Flag to track if the job has already run

  constructor(
    private readonly scraperService: ScraperService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}
  @Cron(CronExpression.EVERY_5_MINUTES, {
    // @Cron(CronExpression.EVERY_HOUR, {
    // @Cron(CronExpression.EVERY_30_SECONDS, {
    name: 'scraperJob', // Give the job a name so it can be managed programmatically
  })
  async handleCron() {
    // Check if the job has already run
    if (this.jobHasRun) {
      // If the job has run, disable the cron job
      const job = this.schedulerRegistry.getCronJob('scraperJob');
      job.stop(); // Stops the job from running again
      this.logger.debug('Cron job stopped after first execution.');
      return;
    }

    this.logger.debug('Called once to add scrape job to queue.');
    await this.scraperService.startAllCompanyScrapers();
    this.jobHasRun = true; // Set the flag to indicate the job has run once
  }
}

// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// The working build

// import { InjectQueue } from '@nestjs/bullmq';
// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
// import { Queue } from 'bullmq';

// @Injectable()
// export class AppService {
//   private readonly logger = new Logger(AppService.name);
//   private jobHasRun = false; // Flag to track if the job has already run

//   constructor(
//     @InjectQueue('scraper') private scraperQueue: Queue,
//     private schedulerRegistry: SchedulerRegistry,
//   ) {}

//   @Cron(CronExpression.EVERY_30_SECONDS, {
//     name: 'scraperJob', // Give the job a name so it can be managed programmatically
//   })
//   async handleCron() {
//     // Check if the job has already run
//     if (this.jobHasRun) {
//       // If the job has run, disable the cron job
//       const job = this.schedulerRegistry.getCronJob('scraperJob');
//       job.stop(); // Stops the job from running again
//       this.logger.debug('Cron job stopped after first execution.');
//       return;
//     }

//     this.logger.debug('Called once to add scrape job to queue.');
//     await this.scraperQueue.add('scrape', {});
//     this.jobHasRun = true; // Set the flag to indicate the job has run once
//   }
// }

// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// The first one Ola did

// import { InjectQueue } from '@nestjs/bullmq';
// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { Queue } from 'bullmq';

// @Injectable()
// export class AppService {
//   private readonly logger = new Logger(AppService.name);

//   constructor(@InjectQueue('scraper') private scraperQueue: Queue) {}
//   @Cron(CronExpression.EVERY_30_SECONDS)
//   handleCron() {
//     this.logger.debug('Called when the current second is 45');
//     this.scraperQueue.add('scrape', {});
//   }
// }
