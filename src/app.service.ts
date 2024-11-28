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
  // @Cron(CronExpression.EVERY_30_MINUTES, {
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
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

// import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
// import { ScraperService } from './services/scraper/scraper.service';

// @Injectable()
// export class AppService implements OnModuleInit {
//   private readonly logger = new Logger(AppService.name);

//   constructor(
//     private readonly scraperService: ScraperService,
//     private schedulerRegistry: SchedulerRegistry,
//   ) {}

//   /**
//    * Method that runs once when the server starts.
//    */
//   async onModuleInit() {
//     this.logger.debug('Server started, running initial scrape job...');
//     await this.runScrapeJob();
//   }

//   /**
//    * Cron job to run every midnight.
//    */
//   @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
//     name: 'scraperJobMidnight',
//   })
//   async handleMidnightCron() {
//     this.logger.debug('Running midnight scrape job...');
//     await this.runScrapeJob();
//   }

//   /**
//    * Method to execute the scrape job.
//    */
//   private async runScrapeJob() {
//     this.logger.debug('Starting scrape job...');
//     await this.scraperService.startAllCompanyScrapers();
//     this.logger.debug('Scrape job completed.');
//   }
// }

//  *********************** //
//  *********************** //
//  *********************** //
//  *********************** //
//  *********************** //
//  *********************** //
// Experimental

// import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { ScraperService } from './services/scraper/scraper.service';

// @Injectable()
// export class AppService implements OnModuleInit {
//   private readonly logger = new Logger(AppService.name);

//   constructor(private readonly scraperService: ScraperService) {}

//   /**
//    * This method runs once when the app starts.
//    */
//   async onModuleInit() {
//     this.logger.debug('App started: Running initial scrape job.');
//     await this.runScrapeJob(); // Execute the scrape logic on app startup
//   }

//   /**
//    * This cron job runs every day at midnight.
//    */
//   @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
//     name: 'scraperJob',
//   })
//   async handleMidnightCron() {
//     this.logger.debug('Midnight job: Running scheduled scrape job.');
//     await this.runScrapeJob(); // Execute the scrape logic at midnight
//   }

//   /**
//    * Shared logic for running the scrape job.
//    */
//   private async runScrapeJob() {
//     try {
//       this.logger.debug('Starting scrape job...');
//       await this.scraperService.startAllCompanyScrapers();
//       this.logger.debug('Scrape job completed successfully.');
//     } catch (error) {
//       this.logger.error('Scrape job failed:', error);
//     }
//   }
// }

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
