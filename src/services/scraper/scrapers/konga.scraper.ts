import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { ProductService } from 'src/product/product.service';
import { AiService } from 'src/services/ai/ai.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import puppeteer from 'puppeteer';
import { CompanyDocument } from 'src/company/schemas/company.schema';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { Job } from 'bullmq';

@Injectable()
@Processor('scraper') // BullMQ processor for 'scraper' jobs
export class KongaScraperService extends WorkerHost {
  private readonly logger = new Logger(KongaScraperService.name);

  constructor(
    private readonly productService: ProductService,
    private readonly aiService: AiService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  // Implement the process method from WorkerHost
  async process(job: Job<any, any, string>): Promise<any> {
    // Log the job data if needed
    this.logger.log(`Processing job: ${job.id}`);

    // Example: if the job data has company details, trigger the scrape
    if (job.data && job.data.company && job.data.company.slug === 'konga') {
      await this.handleJumiaScrape(job.data.company);
    }

    // Return a resolved promise
    return Promise.resolve();
  }

  @OnEvent('scrape.company.konga') // Listening for the specific company's event
  async handleJumiaScrape(company: CompanyDocument): Promise<void> {
    this.logger.log(`Starting scrape for company: ${company.slug}`);
    try {
      const scrapedData = await this.scrapeCompany(company);
      this.logger.log(`Scraped data: ${JSON.stringify(scrapedData)}`);

      // Save the scraped data using the ProductService
      await this.saveProducts(scrapedData);
    } catch (error) {
      this.logger.error(`Error scraping company ${company.slug}:`, error);
    }
  }

  private async scrapeCompany(payload: CompanyDocument): Promise<any> {
    this.logger.log(`Scraping data for company: ${payload.name}`);
    const browser = await puppeteer.launch({ headless: true });

    try {
      const page = await browser.newPage();
      const results = {};

      for (const url of payload.urls) {
        let currentPageUrl = url;

        while (currentPageUrl) {
          this.logger.log(`Scraping URL: ${currentPageUrl}`);

          try {
            await page.goto(currentPageUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 30000,
            });

            await page
              .waitForSelector('section.card.-fh', { timeout: 10000 })
              .catch(() => {
                this.logger.error(
                  `Selector 'section.card.-fh' not found at URL ${currentPageUrl}. Skipping to next link.`,
                );
                currentPageUrl = null;
                return;
              });

            const categoryHeading = await page.evaluate(() => {
              const header = document.querySelector('section.card.-fh header');
              const heading = header
                ?.querySelector('div h1')
                ?.textContent.trim();
              return heading || 'Unknown Category';
            });

            // Extract product data
            const products = await page.evaluate(() => {
              const productElements = Array.from(
                document.querySelectorAll('section.card.-fh div > article'),
              );
              return productElements
                .map((article) => {
                  const anchor = article.querySelector('a.core');
                  if (!anchor) return null;

                  const discount = anchor
                    .querySelector('div.s-prc-w div.bdg._dsct._sm')
                    ?.textContent.trim();
                  if (!discount) return null;

                  const link =
                    'https://www.jumia.com.ng/' +
                    (anchor.getAttribute('href') || '');
                  const image =
                    anchor
                      .querySelector('div.img-c img')
                      ?.getAttribute('data-src') || 'No image';
                  const name =
                    anchor
                      .querySelector('div.info h3.name')
                      ?.textContent.trim() || 'No name';
                  const discountPrice =
                    anchor
                      .querySelector('div.info div.prc')
                      ?.textContent.trim() || 'No price';
                  const price =
                    anchor
                      .querySelector('div.s-prc-w div.old')
                      ?.textContent.trim() || 'No old price';
                  const rating =
                    anchor
                      .querySelector('div.info div.rev')
                      ?.textContent.trim() || 'No rating';
                  const store =
                    anchor
                      .querySelector('svg use')
                      ?.getAttribute('xlink:href') || 'No store';

                  return {
                    link,
                    image,
                    name,
                    discountPrice,
                    price,
                    discount,
                    rating,
                    store,
                    category: '',
                    brand: '',
                  };
                })
                .filter((product) => product !== null);
            });

            // Call the AI service to categorize each product
            for (const product of products) {
              try {
                const categories = [
                  'Kitchen utensils',
                  'Home appliances',
                  'furniture',
                  'Electronics',
                ];
                // const brands = [
                //   'LG',
                //   'Panasonic',
                //   'Dell',
                //   'Hisence',
                //   'Supa master',
                // ];

                // Categorize the product using the AI service
                const category = await this.aiService.categorizeProducts({
                  categories,
                  // brands,
                  product: product.name,
                });

                product.category = category.categories;
                product.brand = category.brands;
                this.logger.log(
                  `Categorized product: ${JSON.stringify(product)}`,
                );
              } catch (aiError) {
                this.logger.error('Error categorizing product:', aiError);
              }
            }

            // Merge products into the same category array
            if (!results[categoryHeading]) {
              results[categoryHeading] = [];
            }
            results[categoryHeading].push(...products);

            // Check for next page link
            const nextPageRelativeUrl = await page.evaluate(() => {
              const nextPageAnchor = document.querySelector(
                'section.card.-fh div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
              );
              return nextPageAnchor
                ? nextPageAnchor.getAttribute('href')
                : null;
            });

            currentPageUrl = nextPageRelativeUrl
              ? new URL(nextPageRelativeUrl, 'https://www.jumia.com.ng').href
              : null;
          } catch (scrapeError) {
            this.logger.error(
              `Error scraping URL ${currentPageUrl}:`,
              scrapeError,
            );
            currentPageUrl = null; // Exit loop on error
          }
        }
      }

      const formattedResults = Object.entries(results).map(
        ([category, products]) => ({
          category,
          products,
        }),
      );

      this.logger.log('Scraping completed. Results:', formattedResults);

      // Emit the results for the ScraperService to pick up
      this.eventEmitter.emit(`scrape.result.${payload.slug}`, formattedResults);
      return formattedResults; // Return results for further use if needed
    } catch (error) {
      this.logger.error('Error initializing Puppeteer:', error);
      // Emit an empty array or error indication if needed
      this.eventEmitter.emit(`scrape.result.${payload.slug}`, []);
    } finally {
      await browser.close();
      this.logger.log('Browser closed.');
    }
  }

  private async saveProducts(scrapedData: any) {
    this.logger.log(
      '🚀 ~ ScraperService ~ saveProducts ~ scrapedData:',
      scrapedData.products,
    );

    for (const category of scrapedData) {
      for (const product of category.products) {
        // Convert the scraped product data to CreateProductDto format
        const createProductDto: CreateProductDto = {
          name: product.name,
          price: this.parsePrice(product.price),
          discountPrice: this.parsePrice(product.discountPrice), // Corrected discount price mapping
          images: [product.image], // Assuming one image per product
          specifications: '', // Add specifications if available
          description: '', // Add description if available
          tags: [], // Add tags if available
          tagAttributes: [], // Add tag attributes if available
          brands: product.brand, // Add brand if available
          categories: [product.category], // Ensure categories is an array
        };

        // Save the product using ProductService
        try {
          await this.productService.create(createProductDto);
          this.logger.log(`Product saved: ${createProductDto.name}`);
        } catch (error) {
          this.logger.error('Error saving product:', error);
        }
      }
    }
  }

  private parsePrice(price: string): number {
    // Parse price string to number
    return parseFloat(price.replace(/[^\d.-]/g, ''));
  }
}
