import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompanyService } from 'src/company/company.service';
import { ProductService } from 'src/product/product.service'; // Import the ProductService
import { CreateProductDto } from 'src/product/dto/create-product.dto'; // Import CreateProductDto
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    @InjectQueue('scraper') private scraperQueue: Queue,
    private eventEmitter: EventEmitter2,
    private companyService: CompanyService,
    private productService: ProductService, // Inject the ProductService
  ) {}

  async startAllCompanyScrapers() {
    this.logger.debug('Fetching companies...');
    const companies = await this.companyService.findAll();
    this.logger.debug('Companies fetched:', companies);

    for (const company of companies) {
      try {
        // Emit event and handle the response for each company
        await this.scraperQueue.add('scrape', { company });
        const scrapedData = await this.scrapeCompany(company);

        // Save the scraped data to the database
        // await this.saveProducts(scrapedData);

        // Add a log to indicate completion of the company scrape
        this.logger.debug(`Completed scraping for company: ${company.slug}`);
      } catch (error) {
        this.logger.error(`Error processing company ${company.slug}:`, error);
      }
    }
  }

  private async scrapeCompany(company): Promise<any> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`Preparing to scrape: ${company.slug}`);

      // Emit the event to start scraping for the specific company
      this.eventEmitter.emit(`scrape.company.${company.slug}`, company);

      // Listen for the scrape result for this specific company
      this.eventEmitter.once(`scrape.result.${company.slug}`, (result) => {
        if (result.error) {
          reject(result.error);
        } else {
          resolve(result);
        }
      });

      // Add a timeout to resolve or reject the promise if the event isn't handled
      setTimeout(() => {
        reject(`Timeout: No response for company ${company.slug}`);
      }, 30000); // Timeout after 30 seconds
    });
  }

  private async saveProducts(scrapedData: any) {
    this.logger.debug('Saving Products:', scrapedData.products);

    for (const category of scrapedData) {
      for (const product of category.products) {
        // Convert the scraped product data to CreateProductDto format
        const createProductDto: CreateProductDto = {
          name: product.name,
          price: this.parsePrice(product.price),
          discountPrice: this.parsePrice(product.oldPrice),
          images: [product.image],
          specifications: '',
          description: '',
          tags: [],
          tagAttributes: [],
          brand: product.brand,
          categories: product.categories,
        };

        // Save the product using ProductService
        try {
          await this.productService.create(createProductDto);
          this.logger.debug(`Product saved: ${createProductDto.name}`);
        } catch (error) {
          this.logger.error('Error saving product:', error);
        }
      }
    }
  }

  private parsePrice(price: string): number {
    return parseFloat(price.replace(/[^\d.-]/g, ''));
  }
}

// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //

// import { Processor, WorkerHost } from '@nestjs/bullmq';
// import { EventEmitter2 } from '@nestjs/event-emitter';
// import { Job } from 'bullmq';
// import { CompanyService } from 'src/company/company.service';
// import { ProductService } from 'src/product/product.service'; // Import the ProductService
// import { CreateProductDto } from 'src/product/dto/create-product.dto'; // Import CreateProductDto
// import { AiService } from 'src/services/ai/ai.service';

// @Processor('scraper')
// export class ScraperService extends WorkerHost {
//   constructor(
//     private eventEmitter: EventEmitter2,
//     private companyService: CompanyService,
//     private productService: ProductService, // Inject the ProductService
//     private readonly aiService: AiService,
//   ) {
//     super();
//   }

//   async process(job: Job<any, any, string>): Promise<any> {
//     console.log('SCRAPING!!!!!!');
//     // do some stuff
//     switch (job.name) {
//       case 'scrape':
//         const companies = await this.companyService.findAll();
//         console.log('🚀 ~ ScraperService ~ process ~ companies:', companies);

//         for (const company of companies) {
//           // Emit event and handle the response
//           const scrapedData = await this.scrapeCompany(company);

//           // Save the scraped data to the database
//           await this.saveProducts(scrapedData);
//         }
//         break;
//       default:
//         console.log('default');
//     }
//   }

//   private async scrapeCompany(company): Promise<any> {
//     return new Promise((resolve) => {
//       console.log('🚀 ~ ScraperService ~ scrapeCompany ~ company:', company);

//       // Emit the event to start scraping for the specific company
//       this.eventEmitter.emit(`scrape.${company.slug}`, company);

//       // Listen for the scrape result for this specific company
//       // Use 'once' instead of 'on' to ensure the listener is only triggered once
//       this.eventEmitter.once(`scrape.result.${company.slug}`, (result) => {
//         console.log('Resolving with scraped data...');
//         resolve(result); // Resolve the promise with the scraped data
//       });
//     });
//   }

//   private async saveProducts(scrapedData: any) {
//     console.log(
//       '🚀 ~ ScraperService ~ saveProducts ~ scrapedData:',
//       scrapedData.products,
//     );

//     for (const category of scrapedData) {
//       for (const product of category.products) {
//         // Convert the scraped product data to CreateProductDto format
//         const createProductDto: CreateProductDto = {
//           name: product.name,
//           price: this.parsePrice(product.price),
//           discountPrice: this.parsePrice(product.oldPrice), // Assuming oldPrice is the discount price
//           images: [product.image], // Assuming one image per product
//           specifications: '', // Add specifications if available
//           description: '', // Add description if available
//           tags: [], // Add tags if available
//           tagAttributes: [], // Add tag attributes if available
//           brand: product.brand, // Add brand if available
//           categories: product.category, // Add categories if available
//         };

//         // Save the product using ProductService
//         try {
//           await this.productService.create(createProductDto);
//           console.log(`Product saved: ${createProductDto.name}`);
//         } catch (error) {
//           console.error('Error saving product:', error);
//         }
//       }
//     }
//   }

//   private parsePrice(price: string): number {
//     // Remove non-numeric characters and parse to number
//     return parseFloat(price.replace(/[^\d.-]/g, ''));
//   }
// }

// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //

// import { Processor, WorkerHost } from '@nestjs/bullmq';
// import { EventEmitter2 } from '@nestjs/event-emitter';
// import { Job } from 'bullmq';
// import { CompanyService } from 'src/company/company.service';

// @Processor('scraper')
// export class ScraperService extends WorkerHost {
//   constructor(
//     private eventEmitter: EventEmitter2,
//     private companyService: CompanyService,
//   ) {
//     super();
//   }
//   async process(job: Job<any, any, string>): Promise<any> {
//     console.log('SCRAPING!!!!!!');
//     // do some stuff
//     switch (job.name) {
//       case 'scrape':
//         const companies = await this.companyService.findAll();
//         console.log('🚀 ~ ScraperService ~ process ~ companies:', companies);
//         for (const company of companies) {
//           this.eventEmitter.emit(`scrape.${company.slug}`, company);
//         }
//         break;
//       default:
//         console.log('defualt');
//     }
//   }
// }
