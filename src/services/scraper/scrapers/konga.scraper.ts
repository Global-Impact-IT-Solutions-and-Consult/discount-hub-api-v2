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
    this.logger.log(`Processing konga job: ${job.id}`);

    if (job.data && job.data.company && job.data.company.slug === 'konga') {
      await this.handleKongaScrape(job.data.company);
    }

    return Promise.resolve();
  }

  @OnEvent('scrape.company.konga') // Listening for the specific company's event
  async handleKongaScrape(company: CompanyDocument): Promise<void> {
    this.logger.log(`Starting scrape for company: ${company.slug}`);
    try {
      const scrapedData = await this.scrapeCompany(company);
      this.logger.log(`Scraped data count: ${scrapedData.length}`);

      // Save the scraped data using the ProductService
      await this.saveProducts(scrapedData);
    } catch (error) {
      this.logger.error(`Error scraping company ${company.slug}:`, error);
    }
  }

  private async scrapeCompany(payload: CompanyDocument): Promise<any> {
    this.logger.log(`Scraping data for company: ${payload.name}`);
    const browser = await puppeteer.launch({ headless: true });
    const results: any[] = [];

    try {
      const page = await browser.newPage();

      for (const url of payload.urls) {
        let currentPageUrl = url;

        while (currentPageUrl) {
          this.logger.log(`Scraping URL: ${currentPageUrl}`);

          try {
            await page.goto(currentPageUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 30000,
            });

            await page.waitForSelector(
              'div.e5d9e_mwBLu section._588b5_3MtNs ul.b49ee_2pjyI._3b9ce_2Ge9A',
              { timeout: 20000 },
            );

            const products = await page.evaluate(() => {
              const productElements = Array.from(
                document.querySelectorAll(
                  'div.e5d9e_mwBLu section._588b5_3MtNs section ul.b49ee_2pjyI._3b9ce_2Ge9A > li',
                ),
              );

              return productElements
                .map((li) => {
                  const anchor = li.querySelector(
                    'li.bbe45_3oExY._3b9ce_2Ge9A a',
                  );
                  if (!anchor) return null;

                  const discount =
                    anchor
                      .querySelector('span.false._6c244_q2qap._6977e_X5mZi')
                      ?.textContent.trim() || 'No discount';
                  const link = anchor.getAttribute('href') || '';
                  const image =
                    anchor.querySelector('img')?.getAttribute('data-src') ||
                    'No image';
                  const name =
                    anchor
                      .querySelector('h3.ec84d_3T7LJ')
                      ?.textContent.trim() || 'No name';
                  const discountPrice =
                    anchor
                      .querySelector('span.d7c0f_sJAqi')
                      ?.textContent.trim() || 'No price';
                  const price =
                    anchor
                      .querySelector('span.f6eb3_1MyTu')
                      ?.textContent.trim() || 'No old price';
                  const rating =
                    anchor.querySelector('div.rev')?.textContent.trim() ||
                    'No rating';

                  return {
                    link: link ? `https://www.konga.com${link}` : '',
                    images: [image],
                    name,
                    discountPrice,
                    price,
                    discount,
                    rating,
                    numberOfRatings: '0',
                    store: 'konga',
                    description: '', // Initialize description (will be populated later)
                    keyFeatures: '', // Initialize key features (will be populated later)
                    specifications: '', // Initialize specifications (will be populated later)
                    categories: [''], // Initialize category (will be populated by AI service)
                    brand: '', // Initialize brand (will be populated by AI service)
                  };
                })
                .filter((product) => product !== null)
                .filter((product) => product.discount !== 'No discount');
            });

            // results.push(...products);

            // Fetch additional images, description, key features, and specifications from the product link
            for (const product of products) {
              try {
                const productPage = await browser.newPage();
                await productPage.goto(product.link, {
                  waitUntil: 'domcontentloaded',
                  timeout: 30000,
                });

                // Fetch additional product images
                const additionalImages = await productPage.evaluate(() => {
                  const imageUrls = [];
                  // const imgElements = document.querySelectorAll('img.-fw._ni'); // Target images with class '-fw _ni'
                  const imgElements = document.querySelectorAll(
                    'li._7fdb1_1W4TA picture',
                  ); // Target images with class '-fw _ni'
                  imgElements.forEach((img) => {
                    // const src = img.getAttribute('src');
                    const element = img.querySelector(
                      // 'img.f5e10_VzEXF.cld-responsive.lazyloaded',
                      'img',
                    );
                    const src = element.getAttribute('data-src');
                    if (src) imageUrls.push(src);
                  });
                  console.log(
                    '🚀 ~ KongaScraperService ~ additionalImages ~ imageUrls:',
                    imageUrls,
                  );
                  return imageUrls;
                });

                const name = await productPage.evaluate(() => {
                  return document
                    .querySelector('h4._24849_2Ymhg')
                    .textContent.trim();
                });

                const rating = await productPage.evaluate(() => {
                  const getRating = document
                    .querySelector('div.a353b_2aMCp p')
                    .textContent.trim();
                  const formattedRating = getRating.split('/')[0];
                  return formattedRating;
                });

                const numberOfRatings = await productPage.evaluate(() => {
                  const getRating = document
                    .querySelector('div._2e1f8_1qKx- p')
                    .textContent.trim();
                  const formattedRating = getRating.match(/\((\d+)\)$/);
                  return formattedRating[1];
                });

                // Scraping product description
                const description = await productPage.evaluate(() => {
                  const descriptionElement =
                    document.querySelector('div._3383f_1xAuk');
                  return descriptionElement
                    ? descriptionElement.textContent.trim()
                    : 'No description available';
                });

                // // Scraping key features
                // const keyFeatures = await productPage.evaluate(() => {
                //   const keyFeaturesElement =
                //     document.querySelector('div.markup.-pam');
                //   return keyFeaturesElement
                //     ? keyFeaturesElement.textContent.trim()
                //     : 'No key features available';
                // });

                // // Scraping specifications
                // const specifications = await productPage.evaluate(() => {
                //   const specificationsElement = document.querySelector(
                //     'div.-pvs.-mvxs.-phm.-lsn',
                //   );
                //   return specificationsElement
                //     ? specificationsElement.textContent.trim()
                //     : 'No specifications available';
                // });

                // Merge additional images with the primary image
                product.images.push(...additionalImages); // Append additional images to the existing array
                product.name = name; // Set the product name
                product.rating = rating; // Set the product rating
                product.numberOfRatings = numberOfRatings; // Set the product rating
                product.description = description; // Set the product description
                // product.keyFeatures = keyFeatures; // Set the key features
                // product.specifications = specifications; // Set the specifications

                await productPage.close(); // Close the new page

                // AI Categorization (categories and brand)
                const categories = [
                  'Kitchen utensils',
                  'Home appliances',
                  'Furniture',
                  'Electronics',
                ];
                // const brand = [
                //   'LG',
                //   'Panasonic',
                //   'Dell',
                //   'Hisense',
                //   'Supa master',
                // ];

                try {
                  const category = await this.aiService.categorizeProducts({
                    categories,
                    // brand,
                    product: product.name,
                  });

                  // Use AI categorization for categories and brand
                  const aiBrandName = category.brand; // Brand name from AI service

                  // Create or find the categories in the database
                  const categoryIds = await this.getCreateCategory(
                    category.categories,
                  );

                  // Save the brand to the database
                  const brandId = await this.getCreateBrand(aiBrandName); // Find or create brand

                  // Set the category and brand from AI response
                  product.categories = categoryIds; // Set the category from AI response
                  product.brand = brandId; // Set the brand from AI response
                  // this.logger.log(
                  //   `Categorized product: ${JSON.stringify(product)}`,
                  // );
                } catch (aiError) {
                  this.logger.error('Error categorizing product:', aiError);
                }
              } catch (error) {
                this.logger.error(
                  `Error fetching additional details for product: ${product.name}`,
                  error,
                );
              }
            }

            results.push(...products);

            // Add products to the results
            // if (!results[categoryHeading]) {
            //   results[categoryHeading] = [];
            // }
            // results[categoryHeading].push(...products);

            // Check for next page and update the current URL
            const nextPageRelativeUrl = await page.evaluate(() => {
              const nextPageAnchor = document.querySelector(
                'section.card.-fh div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
              );
              return nextPageAnchor
                ? nextPageAnchor.getAttribute('href')
                : null;
            });

            currentPageUrl = nextPageRelativeUrl
              ? new URL(nextPageRelativeUrl, 'https://www.konga.com').href
              : null;
          } catch (scrapeError) {
            this.logger.error(
              `Error scraping URL ${currentPageUrl}:`,
              scrapeError,
            );
            currentPageUrl = null;
          }
        }
      }
      return results;
    } catch (error) {
      this.logger.error('Error initializing Puppeteer:', error);
      this.eventEmitter.emit(`scrape.result.${payload.slug}`, []);
    } finally {
      await browser.close();
      this.logger.log('Browser closed.');
    }
  }

  private async saveProducts(scrapedData: any[]) {
    this.logger.log(`Saving ${scrapedData.length} products...`);

    for (const product of scrapedData) {
      const createProductDto: CreateProductDto = {
        name: product.name,
        price: this.parsePrice(product.price),
        discountPrice: this.parsePrice(product.discountPrice),
        images: product.images,
        specifications: product.specifications,
        description: product.description,
        brand: product.brand,
        categories: product.categories,
        link: product.link,
        discount: product.discount,
        rating: product.rating,
        numberOfRatings: product.numberOfRatings,
        store: product.store,
        keyFeatures: product.keyFeatures,
      };
      try {
        await this.productService.create(createProductDto);
        this.logger.log(`Product saved: ${createProductDto.name}`);
      } catch (error) {
        this.logger.error('Error saving product:', error);
      }
    }
  }

  private parsePrice(price: string): number {
    return parseFloat(price.replace(/[^\d.-]/g, ''));
  }

  private async getCreateCategory(categoryNames: string[]): Promise<string[]> {
    const categoryIds: string[] = [];

    for (const categoryName of categoryNames) {
      const lowercaseCategory = categoryName.toLowerCase();
      let category =
        await this.productService.findCategoryByName(lowercaseCategory);

      if (!category) {
        category = await this.productService.createCategory({
          name: lowercaseCategory,
        });
        this.logger.log(`Created new category: ${lowercaseCategory}`);
      } else {
        this.logger.log(`Category already exists: ${lowercaseCategory}`);
      }

      categoryIds.push(category._id.toString());
    }

    return categoryIds;
  }

  private async getCreateBrand(brandName: string): Promise<string> {
    const brandId: string = '';

    // for (const brandName of brandNames) {
    const lowercaseBrand = brandName.toLowerCase();
    let brand = await this.productService.findBrandByName(lowercaseBrand);

    if (!brand) {
      brand = await this.productService.createBrand({
        name: lowercaseBrand,
      });
      this.logger.log(`Created new brand: ${lowercaseBrand}`);
    } else {
      this.logger.log(`Brand already exists: ${lowercaseBrand}`);
    }

    // brandIds.push(brand._id.toString());
    // }

    return brandId;
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
// import { OnEvent } from '@nestjs/event-emitter';
// import { Injectable, Logger } from '@nestjs/common';
// import { ProductService } from 'src/product/product.service';
// import { AiService } from 'src/services/ai/ai.service';
// import { EventEmitter2 } from '@nestjs/event-emitter';
// import puppeteer from 'puppeteer';
// import { CompanyDocument } from 'src/company/schemas/company.schema';
// import { Job } from 'bullmq';

// @Injectable()
// @Processor('scraper')
// export class KongaScraperService extends WorkerHost {
//   private readonly logger = new Logger(KongaScraperService.name);

//   constructor(
//     private readonly productService: ProductService,
//     private readonly aiService: AiService,
//     private readonly eventEmitter: EventEmitter2,
//   ) {
//     super();
//   }

//   async process(job: Job<any, any, string>): Promise<any> {
//     this.logger.log(`Processing konga job: ${job.id}`);

//     if (job.data && job.data.company && job.data.company.slug === 'konga') {
//       await this.handleKongaScrape(job.data.company);
//     }

//     return Promise.resolve();
//   }

//   @OnEvent('scrape.company.konga')
//   async handleKongaScrape(company: CompanyDocument): Promise<void> {
//     this.logger.log(`Starting scrape for company: ${company.slug}`);
//     try {
//       const scrapedData = await this.scrapeCompany(company);
//       this.logger.log(`Scraped data: ${JSON.stringify(scrapedData)}`);
//     } catch (error) {
//       this.logger.error(`Error scraping company ${company.slug}:`, error);
//     }
//   }

//   private async scrapeCompany(payload: CompanyDocument): Promise<any> {
//     this.logger.log(`Scraping data for company: ${payload.name}`);
//     const browser = await puppeteer.launch({ headless: true });

//     try {
//       const page = await browser.newPage();
//       for (const url of payload.urls) {
//         let currentPageUrl = url;

//         while (currentPageUrl) {
//           this.logger.log(`Scraping URL: ${currentPageUrl}`);

//           try {
//             await page.goto(currentPageUrl, {
//               waitUntil: 'domcontentloaded',
//               timeout: 30000,
//             });

//             const MAX_RETRIES = 3;
//             let retryCount = 0;
//             // let products = null;

//             while (retryCount < MAX_RETRIES) {
//               try {
//                 await page.waitForSelector(
//                   'div.e5d9e_mwBLu section._588b5_3MtNs ul.b49ee_2pjyI._3b9ce_2Ge9A',
//                   { timeout: 20000 },
//                 );

//                 const products = await page.evaluate(() => {
//                   const productElements = Array.from(
//                     document.querySelectorAll(
//                       'div.e5d9e_mwBLu section._588b5_3MtNs section ul.b49ee_2pjyI._3b9ce_2Ge9A > li',
//                     ),
//                   );

//                   return productElements
//                     .map((li) => {
//                       const anchor = li.querySelector(
//                         'li.bbe45_3oExY._3b9ce_2Ge9A a',
//                       );
//                       if (!anchor) return null;

//                       const discount = anchor
//                         .querySelector('div.s-prc-w div.bdg._dsct._sm')
//                         ?.textContent.trim();
//                       const link =
//                         anchor.querySelector('a')?.getAttribute('href') || '';
//                       const image =
//                         anchor.querySelector('img')?.getAttribute('data-src') ||
//                         'No image';
//                       const name =
//                         anchor
//                           .querySelector('h3.ec84d_3T7LJ')
//                           ?.textContent.trim() || 'No name';
//                       const discountPrice =
//                         anchor.querySelector('div.prc')?.textContent.trim() ||
//                         'No price';
//                       const price =
//                         anchor
//                           .querySelector('div.s-prc-w div.old')
//                           ?.textContent.trim() || 'No old price';
//                       const rating =
//                         anchor.querySelector('div.rev')?.textContent.trim() ||
//                         'No rating';
//                       const store =
//                         anchor
//                           .querySelector('svg use')
//                           ?.getAttribute('xlink:href') || 'No store';

//                       return {
//                         link: link ? `https://www.konga.com${link}` : '',
//                         images: [image],
//                         name,
//                         discountPrice,
//                         price,
//                         discount,
//                         rating,
//                         store,
//                       };
//                     })
//                     .filter((product) => product !== null);
//                 });

//                 // this.logger.log('KONGA Results:', products);
//                 console.log('Scraped Products:', products); // Log in console as well
//                 break; // Exit loop if successful
//               } catch (innerError) {
//                 this.logger.warn(
//                   `Retry ${retryCount + 1}: Selector not found, retrying...`,
//                 );
//                 retryCount += 1;

//                 if (retryCount === MAX_RETRIES) {
//                   this.logger.error(
//                     `Failed to locate the selector after ${MAX_RETRIES} retries.`,
//                   );
//                   currentPageUrl = null; // Move to the next URL
//                 }
//               }
//             }
//           } catch (scrapeError) {
//             this.logger.error(
//               `Error scraping URL ${currentPageUrl}:`,
//               scrapeError,
//             );
//             currentPageUrl = null;
//           }
//         }
//       }
//     } catch (error) {
//       this.logger.error('Error initializing Puppeteer:', error);
//       this.eventEmitter.emit(`scrape.result.${payload.slug}`, []);
//     } finally {
//       await browser.close();
//       this.logger.log('Browser closed.');
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

// import { Processor, WorkerHost } from '@nestjs/bullmq';
// import { OnEvent } from '@nestjs/event-emitter';
// import { Injectable, Logger } from '@nestjs/common';
// import { ProductService } from 'src/product/product.service';
// import { AiService } from 'src/services/ai/ai.service';
// import { EventEmitter2 } from '@nestjs/event-emitter';
// import puppeteer from 'puppeteer';
// import { CompanyDocument } from 'src/company/schemas/company.schema';
// import { CreateProductDto } from 'src/product/dto/create-product.dto';
// import { Job } from 'bullmq';

// @Injectable()
// @Processor('scraper') // BullMQ processor for 'scraper' jobs
// export class KongaScraperService extends WorkerHost {
//   private readonly logger = new Logger(KongaScraperService.name);

//   constructor(
//     private readonly productService: ProductService,
//     private readonly aiService: AiService,
//     private readonly eventEmitter: EventEmitter2,
//   ) {
//     super();
//   }

//   // Implement the process method from WorkerHost
//   async process(job: Job<any, any, string>): Promise<any> {
//     this.logger.log(`Processing konga job: ${job.id}`);

//     if (job.data && job.data.company && job.data.company.slug === 'konga') {
//       await this.handleKongaScrape(job.data.company);
//     }

//     return Promise.resolve();
//   }

//   @OnEvent('scrape.company.konga') // Listening for the specific company's event
//   async handleKongaScrape(company: CompanyDocument): Promise<void> {
//     this.logger.log(`Starting scrape for company: ${company.slug}`);
//     try {
//       const scrapedData = await this.scrapeCompany(company);
//       this.logger.log(`Scraped data: ${JSON.stringify(scrapedData)}`);

//       // Save the scraped data using the ProductService
//       // await this.saveProducts(scrapedData);
//     } catch (error) {
//       this.logger.error(`Error scraping company ${company.slug}:`, error);
//     }
//   }

//   private async scrapeCompany(payload: CompanyDocument): Promise<any> {
//     this.logger.log(`Scraping data for company: ${payload.name}`);
//     const browser = await puppeteer.launch({ headless: true });

//     try {
//       const page = await browser.newPage();
//       const results = {};

//       for (const url of payload.urls) {
//         let currentPageUrl = url;

//         while (currentPageUrl) {
//           this.logger.log(`Scraping URL: ${currentPageUrl}`);

//           try {
//             await page.goto(currentPageUrl, {
//               waitUntil: 'domcontentloaded',
//               timeout: 30000,
//             });

//             // await page
//             //   .waitForSelector(
//             //     'div.e5d9e_mwBLu section._588b5_3MtNs ul.b49ee_2pjyI._3b9ce_2Ge9A',
//             //     { timeout: 20000 },
//             //   )
//             //   .catch(() => {
//             //     this.logger.error(
//             //       `Selector 'section._588b5_3MtNs' not found at URL ${currentPageUrl}. Skipping to next link.`,
//             //     );
//             //     currentPageUrl = null;
//             //     return;
//             //   });

//             await page.waitForSelector(
//               'div.e5d9e_mwBLu section._588b5_3MtNs ul.b49ee_2pjyI._3b9ce_2Ge9A',
//               { timeout: 20000 },
//             );

//             // const categoryHeading = await page.evaluate(() => {
//             //   const header = document.querySelector('section.card.-fh header');
//             //   const heading = header
//             //     ?.querySelector('div h1')
//             //     ?.textContent.trim();
//             //   return heading || 'Unknown Category';
//             // });

//             const products = await page.evaluate(() => {
//               const productElements = Array.from(
//                 document.querySelectorAll(
//                   'div.e5d9e_mwBLu section._588b5_3MtNs section ul.b49ee_2pjyI._3b9ce_2Ge9A > li',
//                 ),
//               );

//               return productElements
//                 .map((li) => {
//                   const anchor = li.querySelector(
//                     'li.bbe45_3oExY._3b9ce_2Ge9A a',
//                   );
//                   if (!anchor) return null;

//                   const discount = anchor
//                     .querySelector('div.s-prc-w div.bdg._dsct._sm')
//                     ?.textContent.trim();
//                   if (!discount) return null;

//                   const link =
//                     'https://www.konga.com/' +
//                     (anchor.getAttribute('href') || '');
//                   const image =
//                     anchor
//                       .querySelector('div.img-c img')
//                       ?.getAttribute('data-src') || 'No image';
//                   const name =
//                     anchor
//                       .querySelector('h3.ec84d_3T7LJ')
//                       ?.textContent.trim() || 'No name';
//                   const discountPrice =
//                     anchor
//                       .querySelector('div.info div.prc')
//                       ?.textContent.trim() || 'No price';
//                   const price =
//                     anchor
//                       .querySelector('div.s-prc-w div.old')
//                       ?.textContent.trim() || 'No old price';
//                   const rating =
//                     anchor
//                       .querySelector('div.info div.rev')
//                       ?.textContent.trim() || 'No rating';
//                   const store =
//                     anchor
//                       .querySelector('svg use')
//                       ?.getAttribute('xlink:href') || 'No store';

//                   return {
//                     link,
//                     images: [image], // Initialize images as an array with the first image
//                     name,
//                     discountPrice,
//                     price,
//                     discount,
//                     rating,
//                     store,
//                     description: '', // Initialize description (will be populated later)
//                     keyFeatures: '', // Initialize key features (will be populated later)
//                     specifications: '', // Initialize specifications (will be populated later)
//                     categories: [''], // Initialize category (will be populated by AI service)
//                     brand: [''], // Initialize brand (will be populated by AI service)
//                   };
//                 })
//                 .filter((product) => product !== null);
//             });

//             // Fetch additional images, description, key features, and specifications from the product link
//             for (const product of products) {
//               try {
//                 const productPage = await browser.newPage();
//                 await productPage.goto(product.link, {
//                   waitUntil: 'domcontentloaded',
//                   timeout: 30000,
//                 });

//                 // Fetch additional product images
//                 const additionalImages = await productPage.evaluate(() => {
//                   const imageUrls = [];
//                   // const imgElements = document.querySelectorAll('img.-fw._ni'); // Target images with class '-fw _ni'
//                   const imgElements =
//                     document.querySelectorAll('label.itm-sel._on'); // Target images with class '-fw _ni'
//                   imgElements.forEach((img) => {
//                     // const src = img.getAttribute('src');
//                     const element = img.querySelector('img.-fw._ni');
//                     const src = element.getAttribute('data-src');
//                     if (src) imageUrls.push(src);
//                   });
//                   return imageUrls;
//                 });

//                 // Scraping product description
//                 const description = await productPage.evaluate(() => {
//                   const descriptionElement = document.querySelector(
//                     'div.markup.-mhm.-pvl.-oxa.-sc',
//                   );
//                   return descriptionElement
//                     ? descriptionElement.textContent.trim()
//                     : 'No description available';
//                 });

//                 // Scraping key features
//                 const keyFeatures = await productPage.evaluate(() => {
//                   const keyFeaturesElement =
//                     document.querySelector('div.markup.-pam');
//                   return keyFeaturesElement
//                     ? keyFeaturesElement.textContent.trim()
//                     : 'No key features available';
//                 });

//                 // Scraping specifications
//                 const specifications = await productPage.evaluate(() => {
//                   const specificationsElement = document.querySelector(
//                     'div.-pvs.-mvxs.-phm.-lsn',
//                   );
//                   return specificationsElement
//                     ? specificationsElement.textContent.trim()
//                     : 'No specifications available';
//                 });

//                 // Merge additional images with the primary image
//                 product.images.push(...additionalImages); // Append additional images to the existing array
//                 product.description = description; // Set the product description
//                 product.keyFeatures = keyFeatures; // Set the key features
//                 product.specifications = specifications; // Set the specifications

//                 await productPage.close(); // Close the new page

//                 // AI Categorization (categories and brand)
//                 const categories = [
//                   'Kitchen utensils',
//                   'Home appliances',
//                   'Furniture',
//                   'Electronics',
//                 ];
//                 // const brand = [
//                 //   'LG',
//                 //   'Panasonic',
//                 //   'Dell',
//                 //   'Hisense',
//                 //   'Supa master',
//                 // ];

//                 try {
//                   const category = await this.aiService.categorizeProducts({
//                     categories,
//                     // brand,
//                     product: product.name,
//                   });

//                   // Use AI categorization for categories and brand
//                   const aiBrandName = category.brand; // Brand name from AI service

//                   // Create or find the categories in the database
//                   const categoryIds = await this.getCreateCategory(
//                     category.categories,
//                   );

//                   // Save the brand to the database
//                   const brandId = await this.getCreateBrand(aiBrandName); // Find or create brand

//                   // Set the category and brand from AI response
//                   product.categories = categoryIds; // Set the category from AI response
//                   product.brand = brandId; // Set the brand from AI response
//                   // this.logger.log(
//                   //   `Categorized product: ${JSON.stringify(product)}`,
//                   // );
//                 } catch (aiError) {
//                   this.logger.error('Error categorizing product:', aiError);
//                 }
//               } catch (error) {
//                 this.logger.error(
//                   `Error fetching additional details for product: ${product.name}`,
//                   error,
//                 );
//               }
//             }

//             // Add products to the results
//             // if (!results[categoryHeading]) {
//             //   results[categoryHeading] = [];
//             // }
//             // results[categoryHeading].push(...products);

//             const nextPageRelativeUrl = await page.evaluate(() => {
//               const nextPageAnchor = document.querySelector(
//                 'section.card.-fh div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
//               );
//               return nextPageAnchor
//                 ? nextPageAnchor.getAttribute('href')
//                 : null;
//             });

//             currentPageUrl = nextPageRelativeUrl
//               ? new URL(nextPageRelativeUrl, 'https://www.konga.com').href
//               : null;
//           } catch (scrapeError) {
//             this.logger.error(
//               `Error scraping URL ${currentPageUrl}:`,
//               scrapeError,
//             );
//             currentPageUrl = null;
//           }
//         }
//       }

//       const formattedResults = Object.entries(results).map(
//         ([category, products]) => ({
//           category,
//           products,
//         }),
//       );

//       this.logger.log('Scraping completed. Results:', formattedResults);
//       this.eventEmitter.emit(`scrape.result.${payload.slug}`, formattedResults);
//       return formattedResults;
//     } catch (error) {
//       this.logger.error('Error initializing Puppeteer:', error);
//       this.eventEmitter.emit(`scrape.result.${payload.slug}`, []);
//     } finally {
//       await browser.close();
//       this.logger.log('Browser closed.');
//     }
//   }

//   private async saveProducts(scrapedData: any) {
//     this.logger.log('Saving products:', scrapedData.products);

//     for (const category of scrapedData) {
//       for (const product of category.products) {
//         console.log(
//           '🚀 ~ KongaScraperService ~ saveProducts ~ product:',
//           product,
//         );
//         const createProductDto: CreateProductDto = {
//           name: product.name,
//           price: this.parsePrice(product.price),
//           discountPrice: this.parsePrice(product.discountPrice),
//           // images: [product.images],
//           images: product.images,
//           specifications: product.specifications,
//           description: product.description,
//           // tags: [],
//           // tagAttributes: [],
//           brand: product.brand,
//           categories: product.categories,
//           link: product.link,
//           discount: product.discount,
//           rating: product.rating,
//           store: product.store,
//           keyFeatures: product.keyFeatures,
//         };
//         try {
//           await this.productService.create(createProductDto);
//           // this.logger.log(`Product saved: ${createProductDto.name}`);
//         } catch (error) {
//           this.logger.error('Error saving product:', error);
//         }
//       }
//     }
//   }

//   private parsePrice(price: string): number {
//     return parseFloat(price.replace(/[^\d.-]/g, ''));
//   }

//   // Method to find or create a category by name
//   private async getCreateCategory(categoryNames: string[]): Promise<string[]> {
//     const categoryIds: string[] = []; // Initialize an array to hold the category IDs

//     for (const categoryName of categoryNames) {
//       console.log(
//         '🚀 ~ KongaScraperService ~ getOrCreateCategory ~ categoryName:',
//         categoryName,
//       );

//       const lowercaseCategory = categoryName.toLowerCase();
//       let category =
//         await this.productService.findCategoryByName(lowercaseCategory);

//       if (!category) {
//         category = await this.productService.createCategory({
//           name: lowercaseCategory,
//         });
//         this.logger.log(`Created new category: ${lowercaseCategory}`);
//       } else {
//         this.logger.log(`Category already exists: ${lowercaseCategory}`);
//       }

//       categoryIds.push(category._id.toString()); // Push the category ID to the array
//     }

//     return categoryIds; // Return the array of category IDs
//   }

//   // Method to find or create brand by name
//   private async getCreateBrand(brandNames: string[]): Promise<string[]> {
//     const brandIds: string[] = [];

//     for (const brandName of brandNames) {
//       const lowercaseBrand = brandName.toLowerCase();
//       let brand = await this.productService.findBrandByName(lowercaseBrand);

//       if (!brand) {
//         brand = await this.productService.createBrand({
//           name: lowercaseBrand,
//         });
//         this.logger.log(`Created new brand: ${lowercaseBrand}`);
//       } else {
//         this.logger.log(`Brand already exists: ${lowercaseBrand}`);
//       }

//       brandIds.push(brand._id.toString());
//     }

//     return brandIds;
//   }
// }

// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
