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
export class JumiaScraperService extends WorkerHost {
  private readonly logger = new Logger(JumiaScraperService.name);
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
    this.logger.log(`Processing job: ${job.id}`);

    if (job.data && job.data.company && job.data.company.slug === 'jumia') {
      await this.handleJumiaScrape(job.data.company);
    }

    return Promise.resolve();
  }

  @OnEvent('scrape.company.jumia') // Listening for the specific company's event
  async handleJumiaScrape(company: CompanyDocument): Promise<void> {
    this.logger.log(`Starting scrape for company: ${company.slug}`);
    try {
      const scrapedData = await this.scrapeCompany(company);
      // this.logger.log(`Scraped data: ${JSON.stringify(scrapedData)}`);

      // Save the scraped data using the ProductService
      await this.saveProducts(scrapedData, company);
    } catch (error) {
      this.logger.error(`Error scraping company ${company.slug}:`, error);
    }
  }

  private async scrapeCompany(payload: CompanyDocument): Promise<any> {
    this.logger.log(`Scraping data for company: ${payload.name}`);
    const browser = await puppeteer.launch({
      // executablePath: '/usr/bin/google-chrome', // Use system-installed Chrome
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      const results = {};

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
                const header = document.querySelector(
                  'section.card.-fh header',
                );
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
                    const reviewText =
                      anchor
                        .querySelector('div.info div.rev')
                        ?.textContent.trim() || 'No rating';

                    let rating = 'No rating';
                    let numberOfRatings = 'No rating';

                    if (reviewText !== 'No rating') {
                      const match = reviewText.match(/^(.*)\s\((\d+)\)$/);
                      if (match) {
                        rating = match[1]; // Extracts "3 out of 5"
                        numberOfRatings = match[2]; // Extracts "2343"
                      }
                    }

                    return {
                      link,
                      images: [image], // Initialize images as an array with the first image
                      name,
                      discountPrice,
                      price,
                      discount,
                      rating,
                      numberOfRatings,
                      // tag: categoryHeading,
                      tag: '',
                      // store: 'jumia',
                      description: '', // Initialize description (will be populated later)
                      keyFeatures: '', // Initialize key features (will be populated later)
                      specifications: '', // Initialize specifications (will be populated later)
                      // categories: this.categories, // Use categories from the database or default
                      categories: [''], // Use categories from the database or default
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
                    const imgElements =
                      document.querySelectorAll('label.itm-sel._on'); // Target images with class '-fw _ni'
                    imgElements.forEach((img) => {
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
                  try {
                    const category = await this.aiService.categorizeProducts({
                      categories: this.categories,
                      product: product.name,
                    });

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
      }

      if (payload.special_links) {
        for (const specialLink of payload.special_links) {
          for (const url of specialLink.urls) {
            let currentPageUrl = url;

            while (currentPageUrl) {
              this.logger.log(`Scraping URL: ${currentPageUrl}`);

              try {
                await page.goto(currentPageUrl, {
                  waitUntil: 'domcontentloaded',
                  timeout: 60000,
                });

                await page
                  .waitForSelector('section.card.-fh', { timeout: 20000 })
                  .catch(() => {
                    this.logger.error(
                      `Selector 'section.card.-fh' not found at URL ${currentPageUrl}. Skipping to next link.`,
                    );
                    currentPageUrl = null;
                    return;
                  });

                const categoryHeading = await page.evaluate(() => {
                  const header = document.querySelector(
                    'section.card.-fh header',
                  );
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
                      const reviewText =
                        anchor
                          .querySelector('div.info div.rev')
                          ?.textContent.trim() || 'No rating';

                      let rating = 'No rating';
                      let numberOfRatings = 'No rating';

                      if (reviewText !== 'No rating') {
                        const match = reviewText.match(/^(.*)\s\((\d+)\)$/);
                        if (match) {
                          rating = match[1]; // Extracts "3 out of 5"
                          numberOfRatings = match[2]; // Extracts "2343"
                        }
                      }

                      return {
                        link,
                        images: [image], // Initialize images as an array with the first image
                        name,
                        discountPrice,
                        price,
                        discount,
                        rating,
                        numberOfRatings,
                        // tag: specialLink.name,
                        tag: '',
                        description: '', // Initialize description (will be populated later)
                        keyFeatures: '', // Initialize key features (will be populated later)
                        specifications: '', // Initialize specifications (will be populated later)
                        categories: [''], // Use categories from the database or default
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
                      const imgElements =
                        document.querySelectorAll('label.itm-sel._on'); // Target images with class '-fw _ni'
                      imgElements.forEach((img) => {
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
                    // product.tag = specialLink.name;

                    await productPage.close(); // Close the new page

                    // AI Categorization (categories and brand)
                    try {
                      const category = await this.aiService.categorizeProducts({
                        categories: this.categories,
                        product: product.name,
                      });

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
                  ? new URL(nextPageRelativeUrl, 'https://www.jumia.com.ng')
                      .href
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

      const formattedResults = Object.entries(results).map(
        ([category, products]) => ({
          category,
          products,
        }),
      );

      // this.logger.log('Scraping completed. Results:', formattedResults);
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

  private async saveProducts(scrapedData: any, company: CompanyDocument) {
    // this.logger.log('Saving products:', scrapedData.products);
    this.logger.log('Company: ', company);
    this.logger.log('Company Special Link: ', company.special_links);

    for (const category of scrapedData) {
      for (const product of category.products) {
        // console.log(
        //   '🚀 ~ JumiaScraperService ~ saveProducts ~ product:',
        //   product,
        // );
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
      // console.log(
      //   '🚀 ~ JumiaScraperService ~ getOrCreateCategory ~ categoryName:',
      //   categoryName,
      // );

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
    let brandId: string = '';

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

    brandId = brand._id.toString();

    return brandId;
  }

  // Method to find or create tag by name
  private async getCreateTag(tagName: string): Promise<string> {
    let tagId: string = '';

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

    tagId = tag._id.toString();

    return tagId;
  }
}
