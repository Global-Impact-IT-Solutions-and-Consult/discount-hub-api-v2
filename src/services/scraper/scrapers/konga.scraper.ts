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
// import { CreateCompanyDto } from 'src/company/dto/create-company.dto';

@Injectable()
@Processor('scraper') // BullMQ processor for 'scraper' jobs
export class KongaScraperService extends WorkerHost {
  private readonly logger = new Logger(KongaScraperService.name);
  private categories: string[] = []; // Store categories from the database

  constructor(
    private readonly productService: ProductService,
    private readonly aiService: AiService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async onModuleInit() {
    // Fetch all categories from the database on initialization
    const categoriesFromDb = await this.productService.findAllCategories();
    this.categories = categoriesFromDb.map((category) => category.name); // Extracting category names

    if (this.categories.length === 0) {
      this.categories = [
        'electronics',
        'kitchenware',
        'home appliances',
        'personal care',
        'furniture',
        'accessories',
        'health and beauty',
        'fashion',
        'groceries',
        'jewelry',
        'home and office',
        'books',
        'toys',
        'sports and outdoors',
        'gaming',
        'appliances',
        'fitness and wellness',
        'beverages',
        'phones and tablets',
        'industrial and tools',
        'beauty and cosmetics',
        'audio and headphones',
        'solar products',
        'footwear',
        'clothing',
        'travel and luggage',
        'automotive',
        'pet supplies',
        'office supplies',
        'gardening',
        'home decor',
        'health devices',
        'art and crafts',
        'musical instruments',
        'smart home',
      ];
    }
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
      // this.logger.log(`Scraped data count: ${scrapedData.length}`);

      // Save the scraped data using the ProductService
      await this.saveProducts(scrapedData, company);
    } catch (error) {
      this.logger.error(`Error scraping company ${company.slug}:`, error);
    }
  }

  private async scrapeCompany(payload: CompanyDocument): Promise<any> {
    this.logger.log(`Scraping data for company: ${payload.name}`);
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome', // Use system-installed Chrome
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
    });
    const results: any[] = [];

    try {
      const page = await browser.newPage();

      if (payload.urls) {
        for (const url of payload.urls) {
          let currentPageUrl = url;

          while (currentPageUrl) {
            this.logger.log(`Scraping URL: ${currentPageUrl}`);

            try {
              await page.goto(currentPageUrl, {
                waitUntil: 'domcontentloaded',
                // timeout: 30000,
                timeout: 60000,
              });

              await page.waitForSelector(
                'div.e5d9e_mwBLu section._588b5_3MtNs ul.b49ee_2pjyI._3b9ce_2Ge9A',
                { timeout: 20000 },
              );

              // const categoryHeading = await page.evaluate(() => {
              //   const header = document.querySelector(
              //     'div.a146d_2EPwb ul._1fce2_1jxDY._923ee_2j7PF li.breadcrumbItem a',
              //   );
              //   return header?.textContent.trim() || 'Unknown Category';
              //   // const heading = header
              //   //   ?.querySelector('div h1')
              //   //   ?.textContent.trim();
              //   // return heading || 'Unknown Category';
              // });

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
                      tag: '',
                      // store: 'konga',
                      description: '', // Initialize description (will be populated later)
                      keyFeatures: '', // Initialize key features (will be populated later)
                      specifications: '', // Initialize specifications (will be populated later)
                      categories: [], // Initialize category (will be populated by AI service)
                      brand: '', // Initialize brand (will be populated by AI service)
                    };
                  })
                  .filter((product) => product !== null)
                  .filter((product) => product.discount !== 'No discount');
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
                    const imgElements = document.querySelectorAll(
                      'li._7fdb1_1W4TA picture',
                    );
                    imgElements.forEach((img) => {
                      const element = img.querySelector('img');
                      const src = element.getAttribute('data-src');
                      if (src) imageUrls.push(src);
                    });
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

                  // Merge additional images with the primary image
                  product.images.push(...additionalImages); // Append additional images to the existing array
                  product.name = name; // Set the product name
                  product.rating = rating; // Set the product rating
                  product.numberOfRatings = numberOfRatings; // Set the product rating
                  product.description = description; // Set the product description

                  await productPage.close(); // Close the new page

                  // AI Categorization (categories and brand)
                  // const categories = [
                  //   'electronics',
                  //   'kitchen utensils',
                  //   'home appliances',
                  //   'personal care',
                  //   'furnitures',
                  //   'accessories',
                  //   'health and beauty',
                  //   'fashion',
                  //   'groceries',
                  //   'jewelries',
                  //   'home and office',
                  //   'books',
                  //   'toys',
                  //   'sports and outdoor',
                  //   'gaming',
                  //   'appliances',
                  //   'sports and fitness',
                  //   'beverages',
                  //   'phones and tablets',
                  //   'building and industrial',
                  // ];

                  try {
                    const category = await this.aiService.categorizeProducts({
                      categories: this.categories,
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
      }

      if (payload.special_links) {
        for (const specialLink of payload.special_links) {
          for (const url of specialLink?.urls) {
            let currentPageUrl = url;

            while (currentPageUrl) {
              this.logger.log(`Scraping URL: ${currentPageUrl}`);

              try {
                await page.goto(currentPageUrl, {
                  waitUntil: 'domcontentloaded',
                  // timeout: 30000,
                  timeout: 60000,
                });

                await page.waitForSelector(
                  'div.e5d9e_mwBLu section._588b5_3MtNs ul.b49ee_2pjyI._3b9ce_2Ge9A',
                  { timeout: 20000 },
                );

                // const categoryHeading = await page.evaluate(() => {
                //   const header = document.querySelector(
                //     'div.a146d_2EPwb ul._1fce2_1jxDY._923ee_2j7PF li.breadcrumbItem a',
                //   );
                //   return header?.textContent.trim() || 'Unknown Category';
                //   // const heading = header
                //   //   ?.querySelector('div h1')
                //   //   ?.textContent.trim();
                //   // return heading || 'Unknown Category';
                // });

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
                        // tag: specialLink.name,
                        tag: '',
                        // store: 'konga',
                        description: '', // Initialize description (will be populated later)
                        keyFeatures: '', // Initialize key features (will be populated later)
                        specifications: '', // Initialize specifications (will be populated later)
                        categories: [], // Initialize category (will be populated by AI service)
                        brand: '', // Initialize brand (will be populated by AI service)
                      };
                    })
                    .filter((product) => product !== null)
                    .filter((product) => product.discount !== 'No discount');
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
                      const imgElements = document.querySelectorAll(
                        'li._7fdb1_1W4TA picture',
                      );
                      imgElements.forEach((img) => {
                        const element = img.querySelector('img');
                        const src = element.getAttribute('data-src');
                        if (src) imageUrls.push(src);
                      });
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

                    // Merge additional images with the primary image
                    product.images.push(...additionalImages); // Append additional images to the existing array
                    product.name = name; // Set the product name
                    product.rating = rating; // Set the product rating
                    product.numberOfRatings = numberOfRatings; // Set the product rating
                    product.description = description; // Set the product description
                    // product.tag = specialLink.name;

                    await productPage.close(); // Close the new page

                    // AI Categorization (categories and brand)
                    // const categories = [
                    //   'electronics',
                    //   'kitchen utensils',
                    //   'home appliances',
                    //   'personal care',
                    //   'furnitures',
                    //   'accessories',
                    //   'health and beauty',
                    //   'fashion',
                    //   'groceries',
                    //   'jewelries',
                    //   'home and office',
                    //   'books',
                    //   'toys',
                    //   'sports and outdoor',
                    //   'gaming',
                    //   'appliances',
                    //   'sports and fitness',
                    //   'beverages',
                    //   'phones and tablets',
                    //   'building and industrial',
                    // ];

                    try {
                      const category = await this.aiService.categorizeProducts({
                        categories: this.categories,
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

                      const tagId = await this.getCreateTag(specialLink.name); // Find or create tag

                      // Set the category and brand from AI response
                      product.categories = categoryIds; // Set the category from AI response
                      product.brand = brandId; // Set the brand from AI response
                      product.tag = tagId; // Set the tag from AI response
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

  private async saveProducts(scrapedData: any[], company: CompanyDocument) {
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
        // store: company.name,
        storeBadgeColor: company.badgeColor || 'red', // Use badgeColor from company
        store: company.id,
        storeName: company.name,
        storeLogo: company.logo,
        keyFeatures: product.keyFeatures,
        tag: product.tag,
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

    return brand._id.toString(); // Return the brand ID
  }

  // Method to find or create tag by name
  private async getCreateTag(tagName: string): Promise<string> {
    // let tagId: string = '';

    const lowercaseTag = tagName.toLowerCase();
    let tag = await this.productService.findTagByName(lowercaseTag);

    if (!tag) {
      tag = await this.productService.createTag({
        name: lowercaseTag,
      });
      this.logger.log(`Created new tag: ${lowercaseTag}`);
    } else {
      this.logger.log(`Tag already exists: ${lowercaseTag}`);
    }

    // tagId = tag._id.toString();

    // return tagId;
    this.logger.log(`Returning tag: ${tag._id.toString()}`);

    return tag._id.toString();
  }
}
