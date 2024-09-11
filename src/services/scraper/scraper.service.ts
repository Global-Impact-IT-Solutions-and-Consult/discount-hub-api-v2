import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { CompanyService } from 'src/company/company.service';
import { ProductService } from 'src/product/product.service'; // Import the ProductService
// import { CreateProductDto } from 'src/product/dto/create-product.dto'; // Import CreateProductDto
import { AiService } from 'src/services/ai/ai.service';

@Processor('scraper')
export class ScraperService extends WorkerHost {
  constructor(
    private eventEmitter: EventEmitter2,
    private companyService: CompanyService,
    private productService: ProductService, // Inject the ProductService
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log('SCRAPING!!!!!!');
    // do some stuff
    switch (job.name) {
      case 'scrape':
        const companies = await this.companyService.findAll();
        console.log('🚀 ~ ScraperService ~ process ~ companies:', companies);

        for (const company of companies) {
          // Emit event and handle the response
          const scrapedData = await this.scrapeCompany(company);
          console.log(
            '🚀 ~ ScraperService ~ process ~ scrapedData: ',
            scrapedData,
          );

          console.log(
            '🚀 ~ ScraperService ~ process ~ scrapedData ONE: ',
            scrapedData?.[0]?.products,
          );

          // Save the scraped data to the database
          await this.saveProducts(scrapedData);
        }
        break;
      default:
        console.log('default');
    }
  }

  // private async scrapeCompany(company): Promise<any> {
  //   this.eventEmitter.emit(`scrape.${company.slug}`, company);
  //   // Listen for the result of the scraping
  //   const results = await this.eventEmitter.on(
  //     `scrape.result.${company.slug}`,
  //     (result) => {
  //       console.log('Resolving...');
  //       return result;
  //     },
  //   );
  //   console.log('🚀 ~ ScraperService ~ scrapeCompany ~ results:', results);
  // }

  private async scrapeCompany(company): Promise<any> {
    return new Promise((resolve) => {
      // Emit the event to start scraping for the specific company
      this.eventEmitter.emit(`scrape.${company.slug}`, company);

      // Listen for the scrape result for this specific company
      // Use 'once' instead of 'on' to ensure the listener is only triggered once
      this.eventEmitter.once(`scrape.result.${company.slug}`, (result) => {
        console.log('Resolving with scraped data...');
        resolve(result); // Resolve the promise with the scraped data
      });
    });
  }

  private async saveProducts(scrapedData: any) {
    console.log(
      '🚀 ~ ScraperService ~ saveProducts ~ scrapedData:',
      scrapedData.products,
    );

    // for (const category of scrapedData) {
    //   for (const product of category.products) {
    //     // Convert the scraped product data to CreateProductDto format
    //     const createProductDto: CreateProductDto = {
    //       name: product.name,
    //       price: this.parsePrice(product.price),
    //       discountPrice: this.parsePrice(product.oldPrice), // Assuming oldPrice is the discount price
    //       images: [product.image], // Assuming one image per product
    //       specifications: '', // Add specifications if available
    //       description: '', // Add description if available
    //       tags: [], // Add tags if available
    //       tagAttributes: [], // Add tag attributes if available
    //       brand: '', // Add brand if available
    //       categories: [], // Add categories if available
    //     };

    //     // Save the product using ProductService
    //     try {
    //       await this.productService.create(createProductDto);
    //       console.log(`Product saved: ${createProductDto.name}`);
    //     } catch (error) {
    //       console.error('Error saving product:', error);
    //     }
    //   }
    // }
  }

  private parsePrice(price: string): number {
    // Remove non-numeric characters and parse to number
    return parseFloat(price.replace(/[^\d.-]/g, ''));
  }
}

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
