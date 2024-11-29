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
export class JumiaScraperService extends WorkerHost {
  private readonly logger = new Logger(JumiaScraperService.name);

  constructor(
    private readonly productService: ProductService,
    private readonly aiService: AiService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  // Implement the process method from WorkerHost
  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job: ${job.id}`);

    if (job.data && job.data.company && job.data.company.slug === 'jumia_') {
      await this.handleJumiaScrape(job.data.company);
    }

    return Promise.resolve();
  }

  @OnEvent('scrape.company.jumia_') // Listening for the specific company's event
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

            const products = await page.evaluate(() => {
              const productElements = Array.from(
                document.querySelectorAll('section.card div > article.prd'),
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
                  // const rating =
                  //   anchor
                  //     .querySelector('div.info div.rev')
                  //     ?.textContent.trim() || 'No rating';
                  const reviewText =
                    anchor
                      .querySelector('div.info div.rev')
                      ?.textContent.trim() || 'No rating';

                  // Extract "3 out of 5" and "2343" from the reviewText
                  let rating = 'No rating';
                  let numberOfRatings = 'No rating';

                  if (reviewText !== 'No rating') {
                    const match = reviewText.match(/^(.*)\s\((\d+)\)$/);
                    if (match) {
                      rating = match[1]; // Extracts "3 out of 5"
                      numberOfRatings = match[2]; // Extracts "2343"
                    }
                  }
                  // const store =
                  //   anchor
                  //     .querySelector('svg use')
                  //     ?.getAttribute('xlink:href') || 'No store';

                  return {
                    link,
                    images: [image], // Initialize images as an array with the first image
                    name,
                    discountPrice,
                    price,
                    discount,
                    rating,
                    numberOfRatings,
                    // store,
                    store: 'jumia',
                    description: '', // Initialize description (will be populated later)
                    keyFeatures: '', // Initialize key features (will be populated later)
                    specifications: '', // Initialize specifications (will be populated later)
                    categories: [''], // Initialize category (will be populated by AI service)
                    brand: '', // Initialize brand (will be populated by AI service)
                  };
                })
                .filter((product) => product !== null);
            });

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
                  const imgElements =
                    document.querySelectorAll('label.itm-sel._on'); // Target images with class '-fw _ni'
                  imgElements.forEach((img) => {
                    // const src = img.getAttribute('src');
                    const element = img.querySelector('img.-fw._ni');
                    const src = element.getAttribute('data-src');
                    if (src) imageUrls.push(src);
                  });
                  return imageUrls;
                });

                // Scraping product description
                const description = await productPage.evaluate(() => {
                  const descriptionElement = document.querySelector(
                    'div.markup.-mhm.-pvl.-oxa.-sc',
                  );
                  return descriptionElement
                    ? descriptionElement.textContent.trim()
                    : 'No description available';
                });

                // Scraping key features
                const keyFeatures = await productPage.evaluate(() => {
                  const keyFeaturesElement =
                    document.querySelector('div.markup.-pam');
                  return keyFeaturesElement
                    ? keyFeaturesElement.textContent.trim()
                    : 'No key features available';
                });

                // Scraping specifications
                const specifications = await productPage.evaluate(() => {
                  const specificationsElement = document.querySelector(
                    'div.-pvs.-mvxs.-phm.-lsn',
                  );
                  return specificationsElement
                    ? specificationsElement.textContent.trim()
                    : 'No specifications available';
                });

                // Merge additional images with the primary image
                product.images.push(...additionalImages); // Append additional images to the existing array
                product.description = description; // Set the product description
                product.keyFeatures = keyFeatures; // Set the key features
                product.specifications = specifications; // Set the specifications

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

            // Add products to the results
            if (!results[categoryHeading]) {
              results[categoryHeading] = [];
            }
            results[categoryHeading].push(...products);

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
            currentPageUrl = null;
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
      this.eventEmitter.emit(`scrape.result.${payload.slug}`, formattedResults);
      return formattedResults;
    } catch (error) {
      this.logger.error('Error initializing Puppeteer:', error);
      this.eventEmitter.emit(`scrape.result.${payload.slug}`, []);
    } finally {
      await browser.close();
      this.logger.log('Browser closed.');
    }
  }

  private async saveProducts(scrapedData: any) {
    this.logger.log('Saving products:', scrapedData.products);

    for (const category of scrapedData) {
      for (const product of category.products) {
        console.log(
          '🚀 ~ JumiaScraperService ~ saveProducts ~ product:',
          product,
        );
        const createProductDto: CreateProductDto = {
          name: product.name,
          price: this.parsePrice(product.price),
          discountPrice: this.parsePrice(product.discountPrice),
          // images: [product.images],
          images: product.images,
          specifications: product.specifications,
          description: product.description,
          // tags: [],
          // tagAttributes: [],
          brand: product.brand,
          categories: product.categories,
          link: product.link,
          discount: product.discount,
          rating: product.rating,
          numberOfRatings: product.numberOfRatings,
          store: product.store,
          keyFeatures: product.keyFeatures,
        };

        //  const createProductDto: CreateProductDto = {
        //           name: product.name,
        //           price: product.price,
        //           discountPrice: product.discountPrice,
        //           discount: product.discount,
        //           rating: product.rating,
        //           images: product.images,
        //           description: product.description,
        //           keyFeatures: product.keyFeatures,
        //           specifications: product.specifications,
        //           categories: [categoryId], // Associate category ID
        //           brand: brandId, // Associate brand ID
        //           store: product.store,
        //         };

        try {
          await this.productService.create(createProductDto);
          // this.logger.log(`Product saved: ${createProductDto.name}`);
        } catch (error) {
          this.logger.error('Error saving product:', error);
        }
      }
    }
  }

  private parsePrice(price: string): number {
    return parseFloat(price.replace(/[^\d.-]/g, ''));
  }

  // Method to find or create a category by name
  private async getCreateCategory(categoryNames: string[]): Promise<string[]> {
    const categoryIds: string[] = []; // Initialize an array to hold the category IDs

    for (const categoryName of categoryNames) {
      console.log(
        '🚀 ~ JumiaScraperService ~ getOrCreateCategory ~ categoryName:',
        categoryName,
      );

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

      categoryIds.push(category._id.toString()); // Push the category ID to the array
    }

    return categoryIds; // Return the array of category IDs
  }

  // Method to find or create brand by name
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

// SOME CRAP FIRST

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
// export class JumiaScraperService extends WorkerHost {
//   private readonly logger = new Logger(JumiaScraperService.name);

//   constructor(
//     private readonly productService: ProductService,
//     private readonly aiService: AiService,
//     private readonly eventEmitter: EventEmitter2,
//   ) {
//     super();
//   }

//   // Implement the process method from WorkerHost
//   async process(job: Job<any, any, string>): Promise<any> {
//     this.logger.log(`Processing job: ${job.id}`);

//     if (job.data && job.data.company && job.data.company.slug === 'jumia_') {
//       await this.handleJumiaScrape(job.data.company);
//     }

//     return Promise.resolve();
//   }

//   @OnEvent('scrape.company.jumia_') // Listening for the specific company's event
//   async handleJumiaScrape(company: CompanyDocument): Promise<void> {
//     this.logger.log(`Starting scrape for company: ${company.slug}`);
//     try {
//       const scrapedData = await this.scrapeCompany(company);
//       this.logger.log(`Scraped data: ${JSON.stringify(scrapedData)}`);

//       // Save the scraped data using the ProductService
//       await this.saveProducts(scrapedData);
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

//             await page
//               .waitForSelector('section.card.-fh', { timeout: 10000 })
//               .catch(() => {
//                 this.logger.error(
//                   `Selector 'section.card.-fh' not found at URL ${currentPageUrl}. Skipping to next link.`,
//                 );
//                 currentPageUrl = null;
//                 return;
//               });

//             const categoryHeading = await page.evaluate(() => {
//               const header = document.querySelector('section.card.-fh header');
//               const heading = header
//                 ?.querySelector('div h1')
//                 ?.textContent.trim();
//               return heading || 'Unknown Category';
//             });

//             const products = await page.evaluate(() => {
//               const productElements = Array.from(
//                 document.querySelectorAll('section.card.-fh div > article'),
//               );
//               return productElements
//                 .map((article) => {
//                   const anchor = article.querySelector('a.core');
//                   if (!anchor) return null;

//                   const discount = anchor
//                     .querySelector('div.s-prc-w div.bdg._dsct._sm')
//                     ?.textContent.trim();
//                   if (!discount) return null;

//                   const link =
//                     'https://www.jumia.com.ng/' +
//                     (anchor.getAttribute('href') || '');
//                   const image =
//                     anchor
//                       .querySelector('div.img-c img')
//                       ?.getAttribute('data-src') || 'No image';
//                   const name =
//                     anchor
//                       .querySelector('div.info h3.name')
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
//                     category: '', // Initialize category (will be populated by AI service)
//                     brand: '', // Initialize brand (will be populated by AI service)
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
//                   const imgElements = document.querySelectorAll('img.-fw._ni'); // Target images with class '-fw _ni'
//                   imgElements.forEach((img) => {
//                     const src = img.getAttribute('src');
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

//                 try {
//                   const category = await this.aiService.categorizeProducts({
//                     categories,
//                     product: product.name,
//                   });

//                   // Use AI categorization for categories and brand
//                   const aiBrandName = category.brand; // Brand name from AI service

//                   // Create or find the categories in the database
//                   const categoryIds = await this.getOrCreateCategory(
//                     category.categories,
//                   );

//                   // Save the brand to the database
//                   const brandId = await this.getOrCreateBrand(aiBrandName); // Find or create brand

//                   // Set the category and brand from AI response
//                   product.categories = categoryIds; // Set the category from AI response
//                   product.brand = brandId; // Set the brand from AI response

//                   // product.category = category.categories; // Set the category from AI response
//                   // product.brand = category.brand; // Set the brand from AI response
//                   this.logger.log(
//                     `Categorized product: ${JSON.stringify(product)}`,
//                   );
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
//             if (!results[categoryHeading]) {
//               results[categoryHeading] = [];
//             }
//             results[categoryHeading].push(...products);

//             const nextPageRelativeUrl = await page.evaluate(() => {
//               const nextPageAnchor = document.querySelector(
//                 'section.card.-fh div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
//               );
//               return nextPageAnchor
//                 ? nextPageAnchor.getAttribute('href')
//                 : null;
//             });

//             currentPageUrl = nextPageRelativeUrl
//               ? new URL(nextPageRelativeUrl, 'https://www.jumia.com.ng').href
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
//     } finally {
//       await browser.close();
//     }
//   }

//   // Method to save scraped products
//   private async saveProducts(scrapedData: any): Promise<void> {
//     for (const categoryData of scrapedData) {
//       const { category, products } = categoryData;
//       console.log(
//         '🚀 ~ JumiaScraperService ~ saveProducts ~ category:',
//         category,
//       );

//       // Create or find the category in the database
//       const categoryId = await this.getOrCreateCategory(category);

//       for (const product of products) {
//         // Create or find the brand in the database
//         const brandId = await this.getOrCreateBrand(product.brand);

//         // Create a product DTO for saving
//         const createProductDto: CreateProductDto = {
//           name: product.name,
//           price: product.price,
//           discountPrice: product.discountPrice,
//           discount: product.discount,
//           rating: product.rating,
//           images: product.images,
//           description: product.description,
//           keyFeatures: product.keyFeatures,
//           specifications: product.specifications,
//           categories: [categoryId], // Associate category ID
//           brand: brandId, // Associate brand ID
//           store: product.store,
//         };

//         // Save the product using the ProductService
//         await this.productService.create(createProductDto);
//       }
//     }
//   }

//   // Method to find or create a category by name
//   private async getOrCreateCategory(
//     categoryNames: string[],
//   ): Promise<string[]> {
//     const categoryIds: string[] = []; // Initialize an array to hold the category IDs

//     for (const categoryName of categoryNames) {
//       console.log(
//         '🚀 ~ JumiaScraperService ~ getOrCreateCategory ~ categoryName:',
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

//   // Method to find or create a brand by name
//   private async getOrCreateBrand(brandName: string): Promise<string> {
//     const lowercaseBrand = brandName.toLowerCase();
//     let brand = await this.productService.findBrandByName(lowercaseBrand);

//     if (!brand) {
//       brand = await this.productService.createBrand({
//         name: lowercaseBrand,
//       });
//       this.logger.log(`Created new brand: ${lowercaseBrand}`);
//     } else {
//       this.logger.log(`Brand already exists: ${lowercaseBrand}`);
//     }

//     return brand._id.toString(); // Return the brand ID
//   }
// }

// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //
// ***************************** //

// WORKING MODEL

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
// export class JumiaScraperService extends WorkerHost {
//   private readonly logger = new Logger(JumiaScraperService.name);

//   constructor(
//     private readonly productService: ProductService,
//     private readonly aiService: AiService,
//     private readonly eventEmitter: EventEmitter2,
//   ) {
//     super();
//   }

//   // Implement the process method from WorkerHost
//   async process(job: Job<any, any, string>): Promise<any> {
//     this.logger.log(`Processing job: ${job.id}`);

//     if (job.data && job.data.company && job.data.company.slug === 'jumia_') {
//       await this.handleJumiaScrape(job.data.company);
//     }

//     return Promise.resolve();
//   }

//   @OnEvent('scrape.company.jumia_') // Listening for the specific company's event
//   async handleJumiaScrape(company: CompanyDocument): Promise<void> {
//     this.logger.log(`Starting scrape for company: ${company.slug}`);
//     try {
//       const scrapedData = await this.scrapeCompany(company);
//       this.logger.log(`Scraped data: ${JSON.stringify(scrapedData)}`);

//       // Save the scraped data using the ProductService
//       await this.saveProducts(scrapedData);
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

//             await page
//               .waitForSelector('section.card.-fh', { timeout: 10000 })
//               .catch(() => {
//                 this.logger.error(
//                   `Selector 'section.card.-fh' not found at URL ${currentPageUrl}. Skipping to next link.`,
//                 );
//                 currentPageUrl = null;
//                 return;
//               });

//             const categoryHeading = await page.evaluate(() => {
//               const header = document.querySelector('section.card.-fh header');
//               const heading = header
//                 ?.querySelector('div h1')
//                 ?.textContent.trim();
//               return heading || 'Unknown Category';
//             });

//             const products = await page.evaluate(() => {
//               const productElements = Array.from(
//                 document.querySelectorAll('section.card.-fh div > article'),
//               );
//               return productElements
//                 .map((article) => {
//                   const anchor = article.querySelector('a.core');
//                   if (!anchor) return null;

//                   const discount = anchor
//                     .querySelector('div.s-prc-w div.bdg._dsct._sm')
//                     ?.textContent.trim();
//                   if (!discount) return null;

//                   const link =
//                     'https://www.jumia.com.ng/' +
//                     (anchor.getAttribute('href') || '');
//                   const image =
//                     anchor
//                       .querySelector('div.img-c img')
//                       ?.getAttribute('data-src') || 'No image';
//                   const name =
//                     anchor
//                       .querySelector('div.info h3.name')
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
//                     category: '', // Initialize category (will be populated by AI service)
//                     brand: '', // Initialize brand (will be populated by AI service)
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
//                   const imgElements = document.querySelectorAll('img.-fw._ni'); // Target images with class '-fw _ni'
//                   imgElements.forEach((img) => {
//                     const src = img.getAttribute('src');
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

//                   product.category = category.categories; // Set the category from AI response
//                   product.brand = category.brand; // Set the brand from AI response
//                   this.logger.log(
//                     `Categorized product: ${JSON.stringify(product)}`,
//                   );
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
//             if (!results[categoryHeading]) {
//               results[categoryHeading] = [];
//             }
//             results[categoryHeading].push(...products);

//             const nextPageRelativeUrl = await page.evaluate(() => {
//               const nextPageAnchor = document.querySelector(
//                 'section.card.-fh div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
//               );
//               return nextPageAnchor
//                 ? nextPageAnchor.getAttribute('href')
//                 : null;
//             });

//             currentPageUrl = nextPageRelativeUrl
//               ? new URL(nextPageRelativeUrl, 'https://www.jumia.com.ng').href
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
//         const createProductDto: CreateProductDto = {
//           name: product.name,
//           price: this.parsePrice(product.price),
//           discountPrice: this.parsePrice(product.discountPrice),
//           images: [product.image],
//           specifications: '',
//           description: '',
//           tags: [],
//           tagAttributes: [],
//           brand: product.brand,
//           categories: [product.category],
//         };

//         try {
//           await this.productService.create(createProductDto);
//           this.logger.log(`Product saved: ${createProductDto.name}`);
//         } catch (error) {
//           this.logger.error('Error saving product:', error);
//         }
//       }
//     }
//   }

//   private parsePrice(price: string): number {
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

// import { Injectable } from '@nestjs/common';
// import { OnEvent } from '@nestjs/event-emitter';
// import puppeteer from 'puppeteer';
// import { CompanyDocument } from 'src/company/schemas/company.schema';

// @Injectable()
// export class JumiaScraper {
//   @OnEvent('scrape.jumia_')
//   async scrapeJumia(payload: CompanyDocument) {
//     console.log('Starting Jumia scraping...');
//     const browser = await puppeteer.launch({ headless: true });

//     try {
//       const page = await browser.newPage();
//       const results = {}; // Object to store results by category name

//       for (const url of payload.urls) {
//         console.log(`Scraping URL: ${url}`);
//         let currentPageUrl = url;

//         while (currentPageUrl) {
//           console.log(`Scraping URL: ${currentPageUrl}`);

//           try {
//             await page.goto(currentPageUrl, {
//               waitUntil: 'domcontentloaded',
//               timeout: 30000,
//             });

//             // Wait for the main section to load and handle if the selector is not found
//             await page
//               .waitForSelector('section.card.-fh', { timeout: 10000 })
//               .catch(() => {
//                 console.error(
//                   `Selector 'section.card.-fh' not found at URL ${currentPageUrl}. Skipping to next link.`,
//                 );
//                 currentPageUrl = null; // Exit pagination loop for this URL
//                 return;
//               });

//             // Extract the category heading
//             const categoryHeading = await page.evaluate(() => {
//               const header = document.querySelector('section.card.-fh header');
//               const heading = header
//                 ?.querySelector('div h1')
//                 ?.textContent.trim();
//               return heading || 'Unknown Category'; // Default value if not found
//             });

//             // Extract the products from article elements, filtering out articles without a discount
//             const products = await page.evaluate(() => {
//               const productElements = Array.from(
//                 document.querySelectorAll('section.card.-fh div > article'),
//               );
//               return productElements
//                 .map((article) => {
//                   const anchor = article.querySelector('a.core');
//                   if (!anchor) return null; // Skip if anchor is not found

//                   // Extract discount to decide whether to include this product
//                   const discount = anchor
//                     .querySelector('div.s-prc-w div.bdg._dsct._sm')
//                     ?.textContent.trim();
//                   if (!discount) return null; // Skip products without a discount

//                   // Extracting data from within the anchor element.
//                   const link =
//                     'https://www.jumia.com.ng/' +
//                     (anchor.getAttribute('href') || ''); // Prepend base URL
//                   const image =
//                     anchor
//                       .querySelector('div.img-c img')
//                       ?.getAttribute('data-src') || 'No image';
//                   const name =
//                     anchor
//                       .querySelector('div.info h3.name')
//                       ?.textContent.trim() || 'No name';
//                   const discountPrice =
//                     anchor
//                       .querySelector('div.info div.prc')
//                       ?.textContent.trim() || 'No price';

//                   // Extract old price
//                   const price =
//                     anchor
//                       .querySelector('div.s-prc-w div.old')
//                       ?.textContent.trim() || 'No old price';

//                   // Extract rating
//                   const rating =
//                     anchor
//                       .querySelector('div.info div.rev')
//                       ?.textContent.trim() || 'No rating';

//                   // Extract store from the SVG
//                   const store =
//                     anchor
//                       .querySelector('svg use')
//                       ?.getAttribute('xlink:href') || 'No store';

//                   return {
//                     link,
//                     image,
//                     name,
//                     discountPrice,
//                     price,
//                     discount,
//                     rating,
//                     store,
//                   };
//                 })
//                 .filter((product) => product !== null); // Filter out null values
//             });

//             // Merge products into the same category array
//             if (!results[categoryHeading]) {
//               results[categoryHeading] = []; // Initialize category array if it doesn't exist
//             }
//             results[categoryHeading].push(...products); // Add products to the existing category array

//             // Find the URL for the next page and append it correctly
//             const nextPageRelativeUrl = await page.evaluate(() => {
//               const nextPageAnchor = document.querySelector(
//                 'section.card.-fh div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
//               );
//               return nextPageAnchor
//                 ? nextPageAnchor.getAttribute('href')
//                 : null;
//             });

//             // Update the current page URL by appending the relative path to the base URL
//             currentPageUrl = nextPageRelativeUrl
//               ? new URL(nextPageRelativeUrl, 'https://www.jumia.com.ng').href
//               : null;
//           } catch (scrapeError) {
//             console.error(`Error scraping URL ${currentPageUrl}:`, scrapeError);
//             break; // Exit pagination loop if there's an issue on the page
//           }
//         }
//       }

//       // Convert results object to an array of categories with their products
//       const formattedResults = Object.entries(results).map(
//         ([category, products]) => ({
//           category,
//           products,
//         }),
//       );

//       console.log('Scraping completed. Results:', formattedResults);
//       console.log(
//         'Scraping completed. One Result: ',
//         formattedResults?.[0]?.products?.[0],
//       );
//       return formattedResults; // Return the formatted results array
//     } catch (error) {
//       console.error('Error initializing Puppeteer:', error);
//     } finally {
//       await browser.close();
//       console.log('Browser closed.');
//     }
//   }
// }
