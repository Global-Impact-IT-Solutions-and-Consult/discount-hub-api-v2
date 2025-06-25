/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { JOB_NAMES } from 'src/utils/constants';
import { CompanyService } from 'src/company/company.service';
import { CompanyDocument } from 'src/company/schemas/company.schema';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private companyService: CompanyService,
    @InjectQueue(JOB_NAMES.scraper.SCRAPE_JUMIA)
    private jumiaScraper: Queue,
    @InjectQueue(JOB_NAMES.scraper.SCRAPE_KONGA)
    private kongaScraper: Queue,
  ) {}

  // async startAllCompanyScrapers() {
  //   this.logger.debug('Fetching companies...');
  //   const companies = await this.companyService.findAll();
  //   this.logger.debug('Companies fetched:', companies);

  //   for (const company of companies) {
  //     try {
  //       // Emit event and handle the response for each company
  //       await this.scraperQueue.add('scrape', { company });
  //       const scrapedData = await this.scrapeCompany(company);

  //       // Save the scraped data to the database
  //       // await this.saveProducts(scrapedData);

  //       // Add a log to indicate completion of the company scrape
  //       this.logger.debug(`Completed scraping for company: ${company.slug}`);
  //     } catch (error) {
  //       this.logger.error(`Error processing company ${company.slug}:`, error);
  //     }
  //   }
  // }

  // private async scrapeCompany(company): Promise<any> {
  //   return new Promise((resolve, reject) => {
  //     this.logger.debug(`Preparing to scrape: ${company.slug}`);

  //     // Emit the event to start scraping for the specific company
  //     this.eventEmitter.emit(`scrape.company.${company.slug}`, company);

  //     // Listen for the scrape result for this specific company
  //     this.eventEmitter.once(`scrape.result.${company.slug}`, (result) => {
  //       if (result.error) {
  //         reject(result.error);
  //       } else {
  //         resolve(result);
  //       }
  //     });

  //     // Add a timeout to resolve or reject the promise if the event isn't handled
  //     setTimeout(() => {
  //       reject(`Timeout: No response for company ${company.slug}`);
  //     }, 60000); // Timeout after 60 seconds
  //   });
  // }

  @OnEvent('scrape.jumia')
  async handleScrapeJumia(payload: { company: CompanyDocument }) {
    console.log('Handling scrape.jumia event', payload);
    payload.company.urls?.map(async (url) => {
      await this.jumiaScraper.add(url, {
        link: url,
        storeId: payload.company._id,
      });
    });
    payload.company.special_links?.map(async (url) => {
      for (const link of url.urls) {
        await this.jumiaScraper.add(link, {
          link,
          storeId: payload.company._id,
        });
      }
    });
  }

  @OnEvent('scrape.konga')
  async handleScrapeKonga(payload: { company: CompanyDocument }) {
    payload.company.urls?.map(async (url) => {
      await this.kongaScraper.add(url, {
        link: url,
        storeId: payload.company._id,
      });
    });
    payload.company.special_links?.map(async (url) => {
      for (const link of url.urls) {
        await this.kongaScraper.add(link, {
          link,
          storeId: payload.company._id,
        });
      }
    });
  }
}
