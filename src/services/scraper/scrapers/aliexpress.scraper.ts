import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { ProductService } from 'src/product/product.service';
import { AiService } from 'src/services/ai/ai.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import puppeteer from 'puppeteer';
import { CompanyDocument } from 'src/company/schemas/company.schema';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { Job } from 'bullmq';
// import { CreateCompanyDto } from 'src/company/dto/create-company.dto';

@Processor('scraper') // BullMQ processor for 'scraper' jobs
export class AliExpressScraperService extends WorkerHost {
  private readonly logger = new Logger(AliExpressScraperService.name);

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

    if (
      job.data &&
      job.data.company &&
      job.data.company.slug === 'aliexpress'
    ) {
      await this.handleAliexpressScrape(job.data.company);
    }

    return Promise.resolve();
  }

  @OnEvent('scrape.company.aliexpress') // Listening for the specific company's event
  async handleAliexpressScrape(company: CompanyDocument): Promise<void> {
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
    // const browser = await puppeteer.launch({
    //   headless: true,
    //   ignoreDefaultArgs: ['--disable-extensions'],
    // });
    // const browser = await puppeteer.launch({
    //   // executablePath: '/usr/bin/google-chrome', // Use system-installed Chrome
    //   headless: true,
    //   args: [
    //     '--no-sandbox',
    //     '--disable-setuid-sandbox',
    //     '--disable-dev-shm-usage',
    //     '--disable-accelerated-2d-canvas',
    //     '--no-first-run',
    //     '--no-zygote',
    //     '--disable-gpu',
    //   ],
    // });

    // const browser = await puppeteer.launch({
    //   args: chromium.args,
    //   defaultViewport: chromium.defaultViewport,
    //   executablePath: await chromium.executablePath(),
    //   headless: chromium.headless,
    // });

    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: true, // Explicitly set to true for production
      // ignoreHTTPSErrors: true,
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
                .waitForSelector('div.swiper-slide.swiper-slide-active', {
                  timeout: 10000,
                })
                .catch(() => {
                  this.logger.error(
                    `Selector 'div.swiper-slide.swiper-slide-active' not found at URL ${currentPageUrl}. Skipping to next link.`,
                  );
                  currentPageUrl = null;
                  return;
                });

              const categoryHeading = await page.evaluate(() => {
                const header = document.querySelector(
                  'div.swiper-slide.swiper-slide-active header',
                );
                const heading = header
                  ?.querySelector('div h1')
                  ?.textContent.trim();
                return heading || 'Unknown Category';
              });

              const products = await page.evaluate(() => {
                const productElements = Array.from(
                  document.querySelectorAll(
                    // 'div.swiper-slide.swiper-slide-active div div div > div.aec-view[style="display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start"] > div[data-spm]',
                    // 'div.swiper-slide.swiper-slide-active div.aec-view.tabPanel_e296aa94 div.aec-view.virtualListWrapper_e296aa94 div.aec-view > div.aec-view[style="display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start"]',
                    '[data-spm]',
                  ),
                );
                return productElements
                  .map((article) => {
                    const anchor = article.querySelector('a.productContainer');
                    if (!anchor) return null;

                    const discount = anchor
                      .querySelector(
                        'div.aec-view.bottom_container_3b1b3a68 div.aec-view span.aec-text.bottom_discount_3b1b3a68.aec-text--overflow-hidden.aec-text--singleline',
                      )
                      ?.textContent.trim();
                    if (!discount) return null;

                    const link = 'https:' + (anchor.getAttribute('href') || '');
                    const image =
                      'https:' +
                        anchor
                          .querySelector('div.AIC-MI-container img')
                          ?.getAttribute('src') || 'No image';
                    const name =
                      anchor
                        .querySelector(
                          'div.aec-view div.AIC-ATM-container span.AIC-ATM-multiLine span[style="line-height:18px;font-size:16px;font-weight:450"], div.aec-view div.AIC-ATM-container span.AIC-ATM-multiLine',
                          // 'div.aec-view div.AIC-ATM-container div.AIC-ATM-multiLine span[style="line-height:18px;font-size:16px;font-weight:450"], div.aec-view div.AIC-ATM-container.undefined div.AIC-ATM-multiLine span[style="line-height:18px;font-size:14px;font-weight:600"]',
                          // 'div.AIC-ATM-multiLine span',
                        )
                        ?.textContent.trim() || 'No name';
                    const price =
                      anchor
                        .querySelector(
                          'div.aec-view.bottom_container_3b1b3a68 div.aec-view span.aec-text.ori_price_3b1b3a68.aec-text--overflow-hidden.aec-text--singleline',
                        )
                        ?.textContent.trim() || 0;
                    // ||
                    // 'No old price';
                    const discountPrice =
                      anchor
                        .querySelector(
                          'div.aec-view.bottom_container_3b1b3a68 span.aec-text.price_3b1b3a68.aec-text--overflow-hidden.aec-text--singleline',
                        )
                        ?.textContent.trim() ||
                      price ||
                      0;
                    // ||
                    // 'No price';
                    const rating =
                      anchor
                        .querySelector(
                          'div.aec-view.orders_reviews_container_3b1b3a68 span.aec-text.review_Star_3b1b3a68.aec-text--overflow-hidden.aec-text--singleline',
                        )
                        ?.textContent.trim() || 'No rating';

                    // let rating = 'No rating';
                    const numberOfRatings = 'No rating';

                    // if (reviewText !== 'No rating') {
                    //   const match = reviewText.match(/^(.*)\s\((\d+)\)$/);
                    //   if (match) {
                    //     rating = match[1]; // Extracts "3 out of 5"
                    //     numberOfRatings = match[2]; // Extracts "2343"
                    //   }
                    // }

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
                      // store: 'aliexpress',
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

                  // get product name
                  const name = await productPage.evaluate(() => {
                    const titleElement = document.querySelector(
                      // 'div.title--wrap--UUHae_g h1[data-pl]',
                      'h1[data-pl="product-title"][data-tticheck="true"]',
                      // 'div.title--wrap--UUHae_g h1[data-pl], div.title--wrap--UUHae_g h1[data-pl="product-title"], h1[data-pl="product-title"][data-tticheck="true"]',
                      // 'div.pdp-info div.pdp-info-right div.title--wrap--UUHae_g h1[data-pl="product-title"]',
                    );
                    return titleElement && titleElement.textContent
                      ? titleElement.textContent.trim()
                      : 'No name available';
                  });

                  // get number of ratings
                  const numberOfRatings = await productPage.evaluate(() => {
                    const rating = document.querySelector(
                      'a.reviewer--reviews--cx7Zs_V',
                    );
                    return rating ? rating.textContent.trim() : '0';
                  });

                  const discountPrice = await productPage.evaluate(() => {
                    const discountElement = document.querySelector(
                      'span.price--currentPriceText--V8_y_b5.pdp-comp-price-current.product-price-value',
                    );
                    return discountElement
                      ? discountElement.textContent.trim()
                      : product.discountPrice;
                  });

                  const price = await productPage.evaluate(() => {
                    const priceElement = document.querySelector(
                      'span.price--originalText--gxVO5_d',
                    );
                    return priceElement
                      ? priceElement.textContent.trim()
                      : product.price;
                  });

                  // Fetch additional product images
                  const additionalImages = await productPage.evaluate(() => {
                    const imageUrls = [];
                    const imgElements = document.querySelectorAll(
                      'div.slider--img--K0YbWW2',
                    ); // Target images with class '-fw _ni'
                    imgElements.forEach((img) => {
                      const element = img.querySelector('img');
                      const src = element.getAttribute('src');
                      if (src) imageUrls.push(src);
                    });
                    return imageUrls;
                  });

                  // Scraping product description
                  const description = await productPage.evaluate(() => {
                    const descriptionElement = document.querySelector(
                      // 'div.markup.-mhm.-pvl.-oxa.-sc',
                      'div.detail-desc-decorate-richtext, div.description--origin-part--rWy05pE',
                    );
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

                  // Scraping specifications
                  // const specifications = await productPage.evaluate(() => {
                  //   const specificationsElement = document.querySelector(
                  //     // 'ul.specification--list--GZuXzRX > li',
                  //     'div.specification--prop--Jh28bKu',
                  //   );
                  //   return specificationsElement
                  //     ? specificationsElement.textContent.trim()
                  //     : 'No specifications available';
                  // });

                  const specifications = await productPage.evaluate(() => {
                    const specs = [];
                    const specificationElements = document.querySelectorAll(
                      'div.specification--prop--Jh28bKu',
                    );
                    specificationElements.forEach((item) => {
                      const element = item
                        .querySelector('span')
                        .textContent.trim();
                      if (element) specs.push(element);
                    });
                    return specs.join(', '); // Convert the array elements to a string
                  });

                  // // Merge additional images with the primary image
                  product.name = name;
                  product.numberOfRatings = numberOfRatings;
                  product.images.push(...additionalImages); // Append additional images to the existing array
                  product.description = description; // Set the product description
                  // product.keyFeatures = keyFeatures; // Set the key features
                  product.specifications = specifications; // Set the specifications
                  product.price = price; // Set the price
                  product.discountPrice = discountPrice; // Set the discountPrice

                  await productPage.close(); // Close the new page

                  // AI Categorization (categories and brand)
                  try {
                    // TODO Cleanup
                    // const category = await this.aiService.categorizeProducts({
                    //   categories: this.categories,
                    //   product: product.name,
                    // });
                    // const aiBrandName = category.brand; // Brand name from AI service
                    // // Create or find the categories in the database
                    // const categoryIds = await this.getCreateCategory(
                    //   category.categories,
                    // );
                    // // Save the brand to the database
                    // const brandId = await this.getCreateBrand(aiBrandName); // Find or create brand
                    // // const tagId = await this.getCreateTag(specialLink.name); // Find or create tag
                    // // Set the category and brand from AI response
                    // product.categories = categoryIds; // Set the category from AI response
                    // product.brand = brandId; // Set the brand from AI response
                    // // product.tag = tagId; // Set the tag from AI response
                  } catch (aiError) {
                    this.logger.error('Error categorizing product:', aiError);
                  }
                } catch (error) {
                  this.logger.error(
                    `Error fetching additional details for product: ${product.name}`,
                    error,
                  );
                  this.logger.error(`This product has an error: `, product);
                }
              }

              // Add products to the results
              if (!results[categoryHeading]) {
                results[categoryHeading] = [];
              }
              results[categoryHeading].push(...products);

              const nextPageRelativeUrl = await page.evaluate(() => {
                const nextPageAnchor = document.querySelector(
                  'div.swiper-slide.swiper-slide-active div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
                );
                return nextPageAnchor
                  ? nextPageAnchor.getAttribute('href')
                  : null;
              });

              currentPageUrl = nextPageRelativeUrl
                ? new URL(nextPageRelativeUrl, 'https://www.aliexpress.com.ng')
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

      if (payload.special_links) {
        for (const specialLink of payload.special_links) {
          for (const url of specialLink.urls) {
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
                  .waitForSelector('div.swiper-slide.swiper-slide-active', {
                    timeout: 10000,
                  })
                  .catch(() => {
                    this.logger.error(
                      `Selector 'div.swiper-slide.swiper-slide-active' not found at URL ${currentPageUrl}. Skipping to next link.`,
                    );
                    currentPageUrl = null;
                    return;
                  });

                const categoryHeading = await page.evaluate(() => {
                  const header = document.querySelector(
                    'div.swiper-slide.swiper-slide-active header',
                  );
                  const heading = header
                    ?.querySelector('div h1')
                    ?.textContent.trim();
                  return heading || 'Unknown Category';
                });

                const products = await page.evaluate(() => {
                  const productElements = Array.from(
                    document.querySelectorAll(
                      // 'div.swiper-slide.swiper-slide-active div div div > div.aec-view[style="display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start"] > div[data-spm]',
                      // 'div.swiper-slide.swiper-slide-active div.aec-view.tabPanel_e296aa94 div.aec-view.virtualListWrapper_e296aa94 div.aec-view > div.aec-view[style="display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start"]',
                      '[data-spm]',
                    ),
                  );
                  return productElements
                    .map((article) => {
                      const anchor =
                        article.querySelector('a.productContainer');
                      if (!anchor) return null;

                      const discount = anchor
                        .querySelector(
                          'div.aec-view.bottom_container_3b1b3a68 div.aec-view span.aec-text.bottom_discount_3b1b3a68.aec-text--overflow-hidden.aec-text--singleline',
                        )
                        ?.textContent.trim();
                      if (!discount) return null;

                      const link =
                        'https:' + (anchor.getAttribute('href') || '');
                      const image =
                        'https:' +
                          anchor
                            .querySelector('div.AIC-MI-container img')
                            ?.getAttribute('src') || 'No image';
                      const name =
                        anchor
                          .querySelector(
                            'div.aec-view div.AIC-ATM-container span.AIC-ATM-multiLine span[style="line-height:18px;font-size:16px;font-weight:450"], div.aec-view div.AIC-ATM-container span.AIC-ATM-multiLine',
                            // 'div.aec-view div.AIC-ATM-container div.AIC-ATM-multiLine span[style="line-height:18px;font-size:16px;font-weight:450"], div.aec-view div.AIC-ATM-container.undefined div.AIC-ATM-multiLine span[style="line-height:18px;font-size:14px;font-weight:600"]',
                            // 'div.AIC-ATM-multiLine span',
                          )
                          ?.textContent.trim() || 'No name';
                      const price =
                        anchor
                          .querySelector(
                            'div.aec-view.bottom_container_3b1b3a68 div.aec-view span.aec-text.ori_price_3b1b3a68.aec-text--overflow-hidden.aec-text--singleline',
                          )
                          ?.textContent.trim() || 0;
                      // ||
                      // 'No old price';
                      const discountPrice =
                        anchor
                          .querySelector(
                            'div.aec-view.bottom_container_3b1b3a68 span.aec-text.price_3b1b3a68.aec-text--overflow-hidden.aec-text--singleline',
                          )
                          ?.textContent.trim() ||
                        price ||
                        0;
                      // ||
                      // 'No price';
                      const rating =
                        anchor
                          .querySelector(
                            'div.aec-view.orders_reviews_container_3b1b3a68 span.aec-text.review_Star_3b1b3a68.aec-text--overflow-hidden.aec-text--singleline',
                          )
                          ?.textContent.trim() || 'No rating';

                      // let rating = 'No rating';
                      const numberOfRatings = 'No rating';

                      // if (reviewText !== 'No rating') {
                      //   const match = reviewText.match(/^(.*)\s\((\d+)\)$/);
                      //   if (match) {
                      //     rating = match[1]; // Extracts "3 out of 5"
                      //     numberOfRatings = match[2]; // Extracts "2343"
                      //   }
                      // }

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
                        // store: 'aliexpress',
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

                    // get product name
                    const name = await productPage.evaluate(() => {
                      const titleElement = document.querySelector(
                        // 'div.title--wrap--UUHae_g h1[data-pl]',
                        'h1[data-pl="product-title"][data-tticheck="true"]',
                        // 'div.title--wrap--UUHae_g h1[data-pl], div.title--wrap--UUHae_g h1[data-pl="product-title"], h1[data-pl="product-title"][data-tticheck="true"]',
                        // 'div.pdp-info div.pdp-info-right div.title--wrap--UUHae_g h1[data-pl="product-title"]',
                      );
                      return titleElement && titleElement.textContent
                        ? titleElement.textContent.trim()
                        : 'No name available';
                    });

                    // get number of ratings
                    const numberOfRatings = await productPage.evaluate(() => {
                      const rating = document.querySelector(
                        'a.reviewer--reviews--cx7Zs_V',
                      );
                      return rating ? rating.textContent.trim() : '0';
                    });

                    const discountPrice = await productPage.evaluate(() => {
                      const discountElement = document.querySelector(
                        'span.price--currentPriceText--V8_y_b5.pdp-comp-price-current.product-price-value',
                      );
                      return discountElement
                        ? discountElement.textContent.trim()
                        : product.discountPrice;
                    });

                    const price = await productPage.evaluate(() => {
                      const priceElement = document.querySelector(
                        'span.price--originalText--gxVO5_d',
                      );
                      return priceElement
                        ? priceElement.textContent.trim()
                        : product.price;
                    });

                    // Fetch additional product images
                    const additionalImages = await productPage.evaluate(() => {
                      const imageUrls = [];
                      const imgElements = document.querySelectorAll(
                        'div.slider--img--K0YbWW2',
                      ); // Target images with class '-fw _ni'
                      imgElements.forEach((img) => {
                        const element = img.querySelector('img');
                        const src = element.getAttribute('src');
                        if (src) imageUrls.push(src);
                      });
                      return imageUrls;
                    });

                    // Scraping product description
                    const description = await productPage.evaluate(() => {
                      const descriptionElement = document.querySelector(
                        // 'div.markup.-mhm.-pvl.-oxa.-sc',
                        'div.detail-desc-decorate-richtext, div.description--origin-part--rWy05pE',
                      );
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

                    // Scraping specifications
                    // const specifications = await productPage.evaluate(() => {
                    //   const specificationsElement = document.querySelector(
                    //     // 'ul.specification--list--GZuXzRX > li',
                    //     'div.specification--prop--Jh28bKu',
                    //   );
                    //   return specificationsElement
                    //     ? specificationsElement.textContent.trim()
                    //     : 'No specifications available';
                    // });

                    const specifications = await productPage.evaluate(() => {
                      const specs = [];
                      const specificationElements = document.querySelectorAll(
                        'div.specification--prop--Jh28bKu',
                      );
                      specificationElements.forEach((item) => {
                        const element = item
                          .querySelector('span')
                          .textContent.trim();
                        if (element) specs.push(element);
                      });
                      return specs.join(', '); // Convert the array elements to a string
                    });

                    // // Merge additional images with the primary image
                    product.name = name;
                    product.numberOfRatings = numberOfRatings;
                    product.images.push(...additionalImages); // Append additional images to the existing array
                    product.description = description; // Set the product description
                    // product.keyFeatures = keyFeatures; // Set the key features
                    product.specifications = specifications; // Set the specifications
                    product.price = price; // Set the price
                    product.discountPrice = discountPrice; // Set the discountPrice

                    await productPage.close(); // Close the new page

                    // AI Categorization (categories and brand)
                    try {
                      // TODO cleanup
                      // const category = await this.aiService.categorizeProducts({
                      //   categories: this.categories,
                      //   product: product.name,
                      // });
                      // const aiBrandName = category.brand; // Brand name from AI service
                      // // Create or find the categories in the database
                      // const categoryIds = await this.getCreateCategory(
                      //   category.categories,
                      // );
                      // // Save the brand to the database
                      // const brandId = await this.getCreateBrand(aiBrandName); // Find or create brand
                      // const tagId = await this.getCreateTag(specialLink.name); // Find or create tag
                      // Set the category and brand from AI response
                      // product.categories = categoryIds; // Set the category from AI response
                      // product.brand = brandId; // Set the brand from AI response
                      // product.tag = tagId; // Set the tag from AI response
                    } catch (aiError) {
                      this.logger.error('Error categorizing product:', aiError);
                    }
                  } catch (error) {
                    this.logger.error(
                      `Error fetching additional details for product: ${product.name}`,
                      error,
                    );
                    this.logger.error(`This product has an error: `, product);
                  }
                }

                // Add products to the results
                if (!results[categoryHeading]) {
                  results[categoryHeading] = [];
                }
                results[categoryHeading].push(...products);

                const nextPageRelativeUrl = await page.evaluate(() => {
                  const nextPageAnchor = document.querySelector(
                    'div.swiper-slide.swiper-slide-active div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
                  );
                  return nextPageAnchor
                    ? nextPageAnchor.getAttribute('href')
                    : null;
                });

                currentPageUrl = nextPageRelativeUrl
                  ? new URL(
                      nextPageRelativeUrl,
                      'https://www.aliexpress.com.ng',
                    ).href
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

    for (const category of scrapedData) {
      for (const product of category.products) {
        if (
          product.name.toLowerCase() === 'no name available' ||
          product.name.toLowerCase() === 'no name'
        ) {
          this.logger.warn(
            `Skipping product with invalid name: ${product.name}`,
          );
          continue; // Skip saving this product
        }

        console.log(
          '🚀 ~ AliexpressScraperService ~ saveProducts ~ product:',
          product,
        );
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
}

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
// // import { CreateCompanyDto } from 'src/company/dto/create-company.dto';

// @Injectable()
// @Processor('scraper') // BullMQ processor for 'scraper' jobs
// export class AliexpressScraperService extends WorkerHost {
//   private readonly logger = new Logger(AliexpressScraperService.name);
//   private categories: string[] = []; // Store categories from the database

//   constructor(
//     private readonly productService: ProductService,
//     private readonly aiService: AiService,
//     private readonly eventEmitter: EventEmitter2,
//   ) {
//     super();
//   }

//   async onModuleInit() {
//     // Fetch all categories from the database on initialization
//     const categoriesFromDb = await this.productService.findAllCategories();
//     this.categories = categoriesFromDb.map((category) => category.name); // Extracting category names

//     if (this.categories.length === 0) {
//       this.categories = [
//         'electronics',
//         'kitchenware',
//         'home appliances',
//         'personal care',
//         'furniture',
//         'accessories',
//         'health and beauty',
//         'fashion',
//         'groceries',
//         'jewelry',
//         'home and office',
//         'books',
//         'toys',
//         'sports and outdoors',
//         'gaming',
//         'appliances',
//         'fitness and wellness',
//         'beverages',
//         'phones and tablets',
//         'industrial and tools',
//         'beauty and cosmetics',
//         'audio and headphones',
//         'solar products',
//         'footwear',
//         'clothing',
//         'travel and luggage',
//         'automotive',
//         'pet supplies',
//         'office supplies',
//         'gardening',
//         'home decor',
//         'health devices',
//         'art and crafts',
//         'musical instruments',
//         'smart home',
//       ];
//     }
//   }

//   // Implement the process method from WorkerHost
//   async process(job: Job<any, any, string>): Promise<any> {
//     this.logger.log(`Processing aliexpress job: ${job.id}`);

//     if (
//       job.data &&
//       job.data.company &&
//       job.data.company.slug === 'aliexpress'
//     ) {
//       await this.handleAliexpressScrape(job.data.company);
//     }

//     return Promise.resolve();
//   }

//   @OnEvent('scrape.company.aliexpress') // Listening for the specific company's event
//   async handleAliexpressScrape(company: CompanyDocument): Promise<void> {
//     this.logger.log(`Starting scrape for company: ${company.slug}`);
//     try {
//       const scrapedData = await this.scrapeCompany(company);
//       this.logger.log(`Scraped data count: ${scrapedData.length}`);

//       // Save the scraped data using the ProductService
//       // await this.saveProducts(scrapedData, company);
//     } catch (error) {
//       this.logger.error(`Error scraping company ${company.slug}:`, error);
//     }
//   }

//   private async scrapeCompany(payload: CompanyDocument): Promise<any> {
//     this.logger.log(`Scraping data for company: ${payload.name}`);
//     // const browser = await puppeteer.launch({
//     //   headless: true,
//     //   ignoreDefaultArgs: ['--disable-extensions'],
//     // });
//     const browser = await puppeteer.launch({
//       headless: true,
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-accelerated-2d-canvas',
//         '--no-first-run',
//         '--no-zygote',
//         '--disable-gpu',
//       ],
//     });
//     const results: any[] = [];

//     try {
//       const page = await browser.newPage();

//       if (payload.urls) {
//         for (const url of payload.urls) {
//           let currentPageUrl = url;

//           while (currentPageUrl) {
//             this.logger.log(`Scraping URL: ${currentPageUrl}`);

//             try {
//               await page.goto(currentPageUrl, {
//                 waitUntil: 'domcontentloaded',
//                 // timeout: 30000,
//                 timeout: 60000,
//               });

//               const elementsWithCardOutWrapper = await page.evaluate(() => {
//                 return Array.from(
//                   document.querySelectorAll('div._3gA8_.card-out-wrapper'),
//                 );
//               });
//               this.logger.log(
//                 'Elements with card wrapper: ',
//                 elementsWithCardOutWrapper,
//               );

//               await page.waitForSelector('div._3gA8_.card-out-wrapper', {
//                 timeout: 20000,
//               });

//               // const elementsWithDataSpm = await page.evaluate(() => {
//               //   return Array.from(document.querySelectorAll('[data-spm]')).map(
//               //     (el) => el.getAttribute('data-spm'),
//               //   );
//               // });
//               // this.logger.log('Elements with data-spm:', elementsWithDataSpm);

//               // const categoryHeading = await page.evaluate(() => {
//               //   const header = document.querySelector(
//               //     'div.a146d_2EPwb ul._1fce2_1jxDY._923ee_2j7PF li.breadcrumbItem a',
//               //   );
//               //   return header?.textContent.trim() || 'Unknown Category';
//               //   // const heading = header
//               //   //   ?.querySelector('div h1')
//               //   //   ?.textContent.trim();
//               //   // return heading || 'Unknown Category';
//               // });

//               const products = await page.evaluate(() => {
//                 const productElements = Array.from(
//                   document.querySelectorAll(
//                     // 'div.e5d9e_mwBLu section._588b5_3MtNs section ul.b49ee_2pjyI._3b9ce_2Ge9A > li',
//                     'div.aec-view[style="display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start"]',
//                   ),
//                 );

//                 this.logger.log(
//                   `Fetched products Aliexpress: ${productElements.length}`,
//                 );

//                 return productElements
//                   .map((li) => {
//                     const anchor = li.querySelector(
//                       'li.bbe45_3oExY._3b9ce_2Ge9A a',
//                     );
//                     if (!anchor) return null;

//                     const discount =
//                       anchor
//                         .querySelector('span.false._6c244_q2qap._6977e_X5mZi')
//                         ?.textContent.trim() || 'No discount';
//                     const link = anchor.getAttribute('href') || '';
//                     const image =
//                       anchor.querySelector('img')?.getAttribute('data-src') ||
//                       'No image';
//                     const name =
//                       anchor
//                         .querySelector('h3.ec84d_3T7LJ')
//                         ?.textContent.trim() || 'No name';
//                     const discountPrice =
//                       anchor
//                         .querySelector('span.d7c0f_sJAqi')
//                         ?.textContent.trim() || 'No price';
//                     const price =
//                       anchor
//                         .querySelector('span.f6eb3_1MyTu')
//                         ?.textContent.trim() || 'No old price';
//                     const rating =
//                       anchor.querySelector('div.rev')?.textContent.trim() ||
//                       'No rating';

//                     return {
//                       link: link ? `https://www.aliexpress.com${link}` : '',
//                       images: [image],
//                       name,
//                       discountPrice,
//                       price,
//                       discount,
//                       rating,
//                       numberOfRatings: '0',
//                       tag: '',
//                       // store: 'aliexpress',
//                       description: '', // Initialize description (will be populated later)
//                       keyFeatures: '', // Initialize key features (will be populated later)
//                       specifications: '', // Initialize specifications (will be populated later)
//                       categories: [], // Initialize category (will be populated by AI service)
//                       brand: '', // Initialize brand (will be populated by AI service)
//                     };
//                   })
//                   .filter((product) => product !== null)
//                   .filter((product) => product.discount !== 'No discount');
//               });

//               // Fetch additional images, description, key features, and specifications from the product link
//               for (const product of products) {
//                 try {
//                   const productPage = await browser.newPage();
//                   await productPage.goto(product.link, {
//                     waitUntil: 'domcontentloaded',
//                     timeout: 30000,
//                   });

//                   // Fetch additional product images
//                   const additionalImages = await productPage.evaluate(() => {
//                     const imageUrls = [];
//                     const imgElements = document.querySelectorAll(
//                       'li._7fdb1_1W4TA picture',
//                     );
//                     imgElements.forEach((img) => {
//                       const element = img.querySelector('img');
//                       const src = element.getAttribute('data-src');
//                       if (src) imageUrls.push(src);
//                     });
//                     return imageUrls;
//                   });

//                   const name = await productPage.evaluate(() => {
//                     return document
//                       .querySelector('h4._24849_2Ymhg')
//                       .textContent.trim();
//                   });

//                   const rating = await productPage.evaluate(() => {
//                     const getRating = document
//                       .querySelector('div.a353b_2aMCp p')
//                       .textContent.trim();
//                     const formattedRating = getRating.split('/')[0];
//                     return formattedRating;
//                   });

//                   const numberOfRatings = await productPage.evaluate(() => {
//                     const getRating = document
//                       .querySelector('div._2e1f8_1qKx- p')
//                       .textContent.trim();
//                     const formattedRating = getRating.match(/\((\d+)\)$/);
//                     return formattedRating[1];
//                   });

//                   // Scraping product description
//                   const description = await productPage.evaluate(() => {
//                     const descriptionElement =
//                       document.querySelector('div._3383f_1xAuk');
//                     return descriptionElement
//                       ? descriptionElement.textContent.trim()
//                       : 'No description available';
//                   });

//                   // Merge additional images with the primary image
//                   product.images.push(...additionalImages); // Append additional images to the existing array
//                   product.name = name; // Set the product name
//                   product.rating = rating; // Set the product rating
//                   product.numberOfRatings = numberOfRatings; // Set the product rating
//                   product.description = description; // Set the product description

//                   await productPage.close(); // Close the new page

//                   // AI Categorization (categories and brand)
//                   // const categories = [
//                   //   'electronics',
//                   //   'kitchen utensils',
//                   //   'home appliances',
//                   //   'personal care',
//                   //   'furnitures',
//                   //   'accessories',
//                   //   'health and beauty',
//                   //   'fashion',
//                   //   'groceries',
//                   //   'jewelries',
//                   //   'home and office',
//                   //   'books',
//                   //   'toys',
//                   //   'sports and outdoor',
//                   //   'gaming',
//                   //   'appliances',
//                   //   'sports and fitness',
//                   //   'beverages',
//                   //   'phones and tablets',
//                   //   'building and industrial',
//                   // ];

//                   try {
//                     const category = await this.aiService.categorizeProducts({
//                       categories: this.categories,
//                       product: product.name,
//                     });

//                     // Use AI categorization for categories and brand
//                     const aiBrandName = category.brand; // Brand name from AI service

//                     // Create or find the categories in the database
//                     const categoryIds = await this.getCreateCategory(
//                       category.categories,
//                     );

//                     // Save the brand to the database
//                     const brandId = await this.getCreateBrand(aiBrandName); // Find or create brand

//                     // Set the category and brand from AI response
//                     product.categories = categoryIds; // Set the category from AI response
//                     product.brand = brandId; // Set the brand from AI response
//                   } catch (aiError) {
//                     this.logger.error('Error categorizing product:', aiError);
//                   }
//                 } catch (error) {
//                   this.logger.error(
//                     `Error fetching additional details for product: ${product.name}`,
//                     error,
//                   );
//                 }
//               }

//               results.push(...products);

//               // Check for next page and update the current URL
//               const nextPageRelativeUrl = await page.evaluate(() => {
//                 const nextPageAnchor = document.querySelector(
//                   'div.swiper-slide.swiper-slide-active div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
//                 );
//                 return nextPageAnchor
//                   ? nextPageAnchor.getAttribute('href')
//                   : null;
//               });

//               currentPageUrl = nextPageRelativeUrl
//                 ? new URL(nextPageRelativeUrl, 'https://www.aliexpress.com')
//                     .href
//                 : null;
//             } catch (scrapeError) {
//               this.logger.error(
//                 `Error scraping URL ${currentPageUrl}:`,
//                 scrapeError,
//               );
//               currentPageUrl = null;
//             }
//           }
//         }
//       }

//       if (payload.special_links) {
//         for (const specialLink of payload.special_links) {
//           for (const url of specialLink?.urls) {
//             let currentPageUrl = url;

//             while (currentPageUrl) {
//               this.logger.log(`Scraping URL: ${currentPageUrl}`);

//               try {
//                 await page.goto(currentPageUrl, {
//                   waitUntil: 'domcontentloaded',
//                   // timeout: 30000,
//                   timeout: 60000,
//                 });

//                 // // const elementsWithDataSpm = await page.evaluate(() => {
//                 // //   return Array.from(document.querySelectorAll('[data-spm]'))
//                 // //     .map((el) => el.getAttribute('data-spm'))
//                 // //     .filter((dataSpm) => dataSpm && dataSpm.startsWith('d'));
//                 // // });
//                 // const elementsWithDataSpm = await page.evaluate(() => {
//                 //   return Array.from(
//                 //     document.querySelectorAll(
//                 //       'a.productContainer div.aec-view div.AIC-ATM-container',
//                 //     ),
//                 //   );
//                 // });
//                 // // const elementsWithDataSpm = await page.evaluate(() => {
//                 // //   return (
//                 // //     Array.from(document.querySelectorAll('[data-spm]'))
//                 // //       // .map((el) => el.getAttribute('data-spm'))
//                 // //       .filter(
//                 // //         (dataSpm) =>
//                 // //           dataSpm &&
//                 // //           dataSpm.getAttribute('data-spm').startsWith('d'),
//                 // //       )
//                 // //   );
//                 // // });
//                 // this.logger.log(
//                 //   'Elements with data-spm starting with "d": ',
//                 //   elementsWithDataSpm,
//                 // );

//                 // const productsFetch = await page.evaluate(() => {
//                 //   return elementsWithDataSpm.map(() => {
//                 //     const element = document.querySelector(
//                 //       // `a.productContainer div.aec-view div.AIC-ATM-container[data-spm="${dataSpm}"]`,
//                 //       `a.productContainer div.aec-view div.AIC-ATM-container`,
//                 //     );
//                 //     this.logger.log(
//                 //       'Fetched product data: ',
//                 //       element.textContent.trim(),
//                 //     );
//                 //     return element ? element.textContent.trim() : 'No content';
//                 //   });
//                 // });

//                 // this.logger.log('Trying to get product data: ', productsFetch);

//                 // await page.waitForSelector(
//                 //   'div.e5d9e_mwBLu section._588b5_3MtNs ul.b49ee_2pjyI._3b9ce_2Ge9A',
//                 //   { timeout: 20000 },
//                 // );

//                 // // const categoryHeading = await page.evaluate(() => {
//                 // //   const header = document.querySelector(
//                 // //     'div.a146d_2EPwb ul._1fce2_1jxDY._923ee_2j7PF li.breadcrumbItem a',
//                 // //   );
//                 // //   return header?.textContent.trim() || 'Unknown Category';
//                 // //   // const heading = header
//                 // //   //   ?.querySelector('div h1')
//                 // //   //   ?.textContent.trim();
//                 // //   // return heading || 'Unknown Category';
//                 // // });

//                 const products = await page.evaluate(() => {
//                   // const productElements = Array.from(
//                   //   document.querySelectorAll(
//                   //     'a.productContainer div.aec-view div.AIC-ATM-container',
//                   //   ),
//                   // );

//                   const productElements = Array.from(
//                     document.querySelectorAll(
//                       'div.aec-view[style="display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start"]',
//                     ),
//                   );

//                   console.error(
//                     'Products: ',
//                     productElements[0]
//                       ?.querySelector('span.AIC-ATM-multiLine span')
//                       ?.textContent.trim() || 'No name',
//                   );

//                   return productElements
//                     .map((anchor) => {
//                       const discount =
//                         anchor
//                           .querySelector('span.false._6c244_q2qap._6977e_X5mZi')
//                           ?.textContent.trim() || 'No discount';
//                       const link = anchor.getAttribute('href') || '';
//                       const image =
//                         anchor.querySelector('img')?.getAttribute('data-src') ||
//                         'No image';
//                       const name =
//                         anchor
//                           .querySelector('span.AIC-ATM-multiLine span')
//                           ?.textContent.trim() || 'No name';

//                       const discountPrice =
//                         anchor
//                           .querySelector('span.d7c0f_sJAqi')
//                           ?.textContent.trim() || 'No price';
//                       const price =
//                         anchor
//                           .querySelector('span.f6eb3_1MyTu')
//                           ?.textContent.trim() || 'No old price';
//                       const rating =
//                         anchor.querySelector('div.rev')?.textContent.trim() ||
//                         'No rating';

//                       return {
//                         link: link ? `https://www.aliexpress.com${link}` : '',
//                         images: [image],
//                         name,
//                         discountPrice,
//                         price,
//                         discount,
//                         rating,
//                         numberOfRatings: '0',
//                         tag: '',
//                         description: '', // Initialize description (will be populated later)
//                         keyFeatures: '', // Initialize key features (will be populated later)
//                         specifications: '', // Initialize specifications (will be populated later)
//                         categories: [], // Initialize category (will be populated by AI service)
//                         brand: '', // Initialize brand (will be populated by AI service)
//                       };
//                     })
//                     .filter((product) => product !== null)
//                     .filter((product) => product.discount !== 'No discount');
//                 });

//                 // Fetch additional images, description, key features, and specifications from the product link
//                 for (const product of products) {
//                   this.logger.error('One Product: ', product);
//                   try {
//                     const productPage = await browser.newPage();
//                     await productPage.goto(product.link, {
//                       waitUntil: 'domcontentloaded',
//                       timeout: 30000,
//                     });

//                     // Fetch additional product images
//                     const additionalImages = await productPage.evaluate(() => {
//                       const imageUrls = [];
//                       const imgElements = document.querySelectorAll(
//                         'li._7fdb1_1W4TA picture',
//                       );
//                       imgElements.forEach((img) => {
//                         const element = img.querySelector('img');
//                         const src = element.getAttribute('data-src');
//                         if (src) imageUrls.push(src);
//                       });
//                       return imageUrls;
//                     });

//                     const name = await productPage.evaluate(() => {
//                       return document
//                         .querySelector('h4._24849_2Ymhg')
//                         .textContent.trim();
//                     });

//                     const rating = await productPage.evaluate(() => {
//                       const getRating = document
//                         .querySelector('div.a353b_2aMCp p')
//                         .textContent.trim();
//                       const formattedRating = getRating.split('/')[0];
//                       return formattedRating;
//                     });

//                     const numberOfRatings = await productPage.evaluate(() => {
//                       const getRating = document
//                         .querySelector('div._2e1f8_1qKx- p')
//                         .textContent.trim();
//                       const formattedRating = getRating.match(/\((\d+)\)$/);
//                       return formattedRating[1];
//                     });

//                     // Scraping product description
//                     const description = await productPage.evaluate(() => {
//                       const descriptionElement =
//                         document.querySelector('div._3383f_1xAuk');
//                       return descriptionElement
//                         ? descriptionElement.textContent.trim()
//                         : 'No description available';
//                     });

//                     // Merge additional images with the primary image
//                     product.images.push(...additionalImages); // Append additional images to the existing array
//                     product.name = name; // Set the product name
//                     product.rating = rating; // Set the product rating
//                     product.numberOfRatings = numberOfRatings; // Set the product rating
//                     product.description = description; // Set the product description
//                     // product.tag = specialLink.name;

//                     await productPage.close(); // Close the new page

//                     // AI Categorization (categories and brand)
//                     // const categories = [
//                     //   'electronics',
//                     //   'kitchen utensils',
//                     //   'home appliances',
//                     //   'personal care',
//                     //   'furnitures',
//                     //   'accessories',
//                     //   'health and beauty',
//                     //   'fashion',
//                     //   'groceries',
//                     //   'jewelries',
//                     //   'home and office',
//                     //   'books',
//                     //   'toys',
//                     //   'sports and outdoor',
//                     //   'gaming',
//                     //   'appliances',
//                     //   'sports and fitness',
//                     //   'beverages',
//                     //   'phones and tablets',
//                     //   'building and industrial',
//                     // ];

//                     try {
//                       const category = await this.aiService.categorizeProducts({
//                         categories: this.categories,
//                         product: product.name,
//                       });

//                       // Use AI categorization for categories and brand
//                       const aiBrandName = category.brand; // Brand name from AI service

//                       // Create or find the categories in the database
//                       const categoryIds = await this.getCreateCategory(
//                         category.categories,
//                       );

//                       // Save the brand to the database
//                       const brandId = await this.getCreateBrand(aiBrandName); // Find or create brand

//                       const tagId = await this.getCreateTag(specialLink.name); // Find or create tag

//                       // Set the category and brand from AI response
//                       product.categories = categoryIds; // Set the category from AI response
//                       product.brand = brandId; // Set the brand from AI response
//                       product.tag = tagId; // Set the tag from AI response
//                     } catch (aiError) {
//                       this.logger.error('Error categorizing product:', aiError);
//                     }
//                   } catch (error) {
//                     this.logger.error(
//                       `Error fetching additional details for product: ${product.name}`,
//                       error,
//                     );
//                   }
//                 }

//                 results.push(...products);

//                 // Check for next page and update the current URL
//                 const nextPageRelativeUrl = await page.evaluate(() => {
//                   const nextPageAnchor = document.querySelector(
//                     'div.swiper-slide.swiper-slide-active div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
//                   );
//                   return nextPageAnchor
//                     ? nextPageAnchor.getAttribute('href')
//                     : null;
//                 });

//                 currentPageUrl = nextPageRelativeUrl
//                   ? new URL(nextPageRelativeUrl, 'https://www.aliexpress.com')
//                       .href
//                   : null;
//               } catch (scrapeError) {
//                 this.logger.error(
//                   `Error scraping URL ${currentPageUrl}:`,
//                   scrapeError,
//                 );
//                 currentPageUrl = null;
//               }
//             }
//           }
//         }
//       }

//       return results;
//     } catch (error) {
//       this.logger.error('Error initializing Puppeteer:', error);
//       this.eventEmitter.emit(`scrape.result.${payload.slug}`, []);
//     } finally {
//       await browser.close();
//       this.logger.log('Browser closed.');
//     }
//   }

//   private async saveProducts(scrapedData: any[], company: CompanyDocument) {
//     this.logger.log(`Saving ${scrapedData.length} products...`);

//     for (const product of scrapedData) {
//       const createProductDto: CreateProductDto = {
//         name: product.name,
//         price: this.parsePrice(product.price),
//         discountPrice: this.parsePrice(product.discountPrice),
//         images: product.images,
//         specifications: product.specifications,
//         description: product.description,
//         brand: product.brand,
//         categories: product.categories,
//         link: product.link,
//         discount: product.discount,
//         rating: product.rating,
//         numberOfRatings: product.numberOfRatings,
//         // store: company.name,
//         storeBadgeColor: company.badgeColor || 'red', // Use badgeColor from company
//         store: company.id,
//         storeName: company.name,
//         storeLogo: company.logo,
//         keyFeatures: product.keyFeatures,
//         tag: product.tag,
//       };
//       try {
//         await this.productService.create(createProductDto);
//         this.logger.log(`Product saved: ${createProductDto.name}`);
//       } catch (error) {
//         this.logger.error('Error saving product:', error);
//       }
//     }
//   }

//   private parsePrice(price: string): number {
//     return parseFloat(price.replace(/[^\d.-]/g, ''));
//   }

//   private async getCreateCategory(categoryNames: string[]): Promise<string[]> {
//     const categoryIds: string[] = [];

//     for (const categoryName of categoryNames) {
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

//       categoryIds.push(category._id.toString());
//     }

//     return categoryIds;
//   }

//   private async getCreateBrand(brandName: string): Promise<string> {
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

//   // Method to find or create tag by name
//   private async getCreateTag(tagName: string): Promise<string> {
//     // let tagId: string = '';

//     const lowercaseTag = tagName.toLowerCase();
//     let tag = await this.productService.findTagByName(lowercaseTag);

//     if (!tag) {
//       tag = await this.productService.createTag({
//         name: lowercaseTag,
//       });
//       this.logger.log(`Created new tag: ${lowercaseTag}`);
//     } else {
//       this.logger.log(`Tag already exists: ${lowercaseTag}`);
//     }

//     // tagId = tag._id.toString();

//     // return tagId;
//     this.logger.log(`Returning tag: ${tag._id.toString()}`);

//     return tag._id.toString();
//   }
// }
