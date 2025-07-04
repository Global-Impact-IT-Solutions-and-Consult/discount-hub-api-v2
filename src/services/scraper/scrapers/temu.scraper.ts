import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { ProductService } from 'src/product/product.service';
import { AiService } from 'src/services/ai/ai.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import puppeteer from 'puppeteer';
import { CompanyDocument } from 'src/company/schemas/company.schema';
import { Job } from 'bullmq';

@Injectable()
@Processor('scraper') // BullMQ processor for 'scraper' jobs
export class TemuScraperService extends WorkerHost {
  private readonly logger = new Logger(TemuScraperService.name);
  private categories: string[] = []; // Store categories from the database

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

    if (job.data && job.data.company && job.data.company.slug === 'temu') {
      await this.handleTemuScrape(job.data.company);
    }

    return Promise.resolve();
  }

  @OnEvent('scrape.company.temu') // Listening for the specific company's event
  async handleTemuScrape(company: CompanyDocument): Promise<void> {
    this.logger.log(`Starting scrape for company: ${company.slug}`);
    try {
      // const scrapedData = await this.scrapeCompany(company);
      // const scrapedData = await this.crawlReactSPA(
      //   'https://www.temu.com/ng/channel/best-sellers.html',
      // );
      // this.logger.log(`Scraped data: ${JSON.stringify(scrapedData)}`);
      // Save the scraped data using the ProductService
      // await this.saveProducts(scrapedData, company);
    } catch (error) {
      this.logger.error(`Error scraping company ${company.slug}:`, error);
    }
  }

  // private async crawlReactSPA(url: string): Promise<string> {
  //   const browser = await puppeteer.launch({ headless: true });
  //   const page = await browser.newPage();

  //   try {
  //     // Navigate to the SPA
  //     await page.goto(url, { waitUntil: 'networkidle0' });

  //     // Wait for the React app to fully load
  //     // await page.waitForSelector('#main_scale'); // Adjust if necessary
  //     await page.waitForSelector('.mainContent'); // Adjust if necessary
  //     // await page.waitForSelector('.t33rbhT3.autoFitList'); // Adjust if necessary

  //     // Wait for 5 seconds using page.evaluate()
  //     await page.evaluate(
  //       () => new Promise((resolve) => setTimeout(resolve, 5000)),
  //     );

  //     // Extract page content (DOM as HTML)
  //     const content = await page.content();

  //     await browser.close();
  //     return content;
  //   } catch (error) {
  //     await browser.close();
  //     throw new Error(`Error crawling SPA: ${error.message}`);
  //   }
  // }

  private async crawlReactSPA(url: string): Promise<string> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Navigate to the SPA
      await page.goto(url, { waitUntil: 'networkidle0' });

      // Wait for the React app to fully load
      await page.waitForSelector('.mainContent', { timeout: 15000 });

      // Wait for 5 seconds
      await page.evaluate(
        () => new Promise((resolve) => setTimeout(resolve, 5000)),
      );

      // Extract content of .mainContent
      const extractedContent = await page.evaluate(() => {
        const targetElement = document.querySelector('.mainContent');
        return targetElement ? targetElement.innerHTML : 'No content found';
      });

      await browser.close();
      return extractedContent;
    } catch (error) {
      await browser.close();
      throw new Error(`Error crawling SPA: ${error.message}`);
    }
  }

  private async scrapeCompany(payload: CompanyDocument): Promise<any> {
    this.logger.log(`Scraping data for company: ${payload.name}`);
    // const browser = await puppeteer.launch({
    //   headless: true,
    //   ignoreDefaultArgs: ['--disable-extensions'],
    // });
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome', // Use system-installed Chrome
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
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
                timeout: 60000,
              });

              await page
                .waitForSelector('div._6q6qVUF5_1UrrHYym', { timeout: 10000 })
                .catch(() => {
                  this.logger.error(
                    `Selector 'div._6q6qVUF5._1UrrHYym' not found at URL ${currentPageUrl}. Skipping to next link.`,
                  );
                  currentPageUrl = null;
                  return;
                });

              // Wait for the js-goods-list to be fully loaded
              await page.waitForFunction(
                () => {
                  return document.querySelector('div.js-goods-list') !== null;
                },
                { timeout: 10000 },
              );

              const categoryHeading = await page.evaluate(() => {
                const header = document.querySelector(
                  'div.t33rbhT3.autoFitList header',
                );
                const heading = header
                  ?.querySelector('div h1')
                  ?.textContent.trim();
                return heading || 'Unknown Category';
              });

              const products = await page.evaluate(() => {
                const productElements = Array.from(
                  document.querySelectorAll(
                    'div.t33rbhT3.autoFitList > div.EKDT7a3v',
                  ),
                );
                this.logger.log(`Found products: ${productElements}`);
                return productElements
                  .map((productHolder) => {
                    const item = productHolder.querySelector(
                      'div.Ois68FAW._3qGJLBpe._2Y2Y4-8H.GLHvMp17 div._6q6qVUF5._1UrrHYym',
                    );
                    if (!item) return null;

                    const discount = item
                      .querySelector('div._7LLqXcNd')
                      ?.textContent.trim();
                    if (!discount) return null;

                    const link =
                      payload.website + (item.getAttribute('href') || '');
                    const image =
                      item
                        .querySelector('div.img-c img')
                        ?.getAttribute('data-src') || 'No image';
                    const name =
                      item
                        .querySelector('div.info h3.name')
                        ?.textContent.trim() || 'No name';
                    const discountPrice =
                      item
                        .querySelector('div.info div.prc')
                        ?.textContent.trim() || 'No price';
                    const price =
                      item
                        .querySelector('div.s-prc-w div.old')
                        ?.textContent.trim() || 'No old price';
                    const reviewText =
                      item
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
                      // store: 'temu',
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
                  'div.t33rbhT3.autoFitList div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
                );
                return nextPageAnchor
                  ? nextPageAnchor.getAttribute('href')
                  : null;
              });

              currentPageUrl = nextPageRelativeUrl
                ? new URL(nextPageRelativeUrl, payload.website).href
                : null;
            } catch (scrapeError) {
              this.logger.error(
                `Error scraping URL ${currentPageUrl}: `,
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
                  // waitUntil: 'networkidle2', // Wait for network to be idle
                  waitUntil: 'domcontentloaded',
                  timeout: 60000,
                });

                // Wait for the js-goods-list to be fully loaded
                // await page.waitForSelector(
                //   'div.t33rbhT3[role="region"], div.t33rbhT3.autoFitList[role="region"]',
                //   {
                //     timeout: 20000,
                //   },
                // );

                await page
                  .waitForSelector('div.EKDT7a3v', {
                    timeout: 10000,
                  })
                  .catch(() => {
                    this.logger.error(
                      `Selector 'div.EKDT7a3v' not found at URL ${currentPageUrl}. Skipping to next link.`,
                    );
                    currentPageUrl = null;
                    return;
                  });

                // Fetch all products with class .EKDT7a3v using page.evaluate
                const allProducts = await page.evaluate(() => {
                  return Array.from(
                    document.querySelectorAll('div._6q6qVUF5_1UrrHYym'),
                  ).map((product) => product.outerHTML);
                });

                this.logger.log(`Fetched products: ${allProducts.length}`);

                const categoryHeading = await page.evaluate(() => {
                  const header = document.querySelector(
                    'div._6q6qVUF5_1UrrHYym header',
                  );
                  const heading = header
                    ?.querySelector('div h1')
                    ?.textContent.trim();
                  return heading || 'Unknown Category';
                });

                const products = await page.evaluate(() => {
                  const productElements = Array.from(
                    document.querySelectorAll('div._6q6qVUF5_1UrrHYym'),
                  );
                  return productElements
                    .map((productHolder) => {
                      const item = productHolder.querySelector(
                        'div.EKDT7a3v div.Ois68FAW._3qGJLBpe._2Y2Y4-8H.GLHvMp17 div._6q6qVUF5._1UrrHYym',
                      );
                      if (!item) return null;

                      const discount = item
                        .querySelector('div.s-prc-w div.bdg._dsct._sm')
                        ?.textContent.trim();
                      if (!discount) return null;

                      const link =
                        'https://www.temu.com.ng/' +
                        (item.getAttribute('href') || '');
                      const image =
                        item
                          .querySelector('div.img-c img')
                          ?.getAttribute('data-src') || 'No image';
                      const name =
                        item
                          .querySelector('div.info h3.name')
                          ?.textContent.trim() || 'No name';
                      const discountPrice =
                        item
                          .querySelector('div.info div.prc')
                          ?.textContent.trim() || 'No price';
                      const price =
                        item
                          .querySelector('div.s-prc-w div.old')
                          ?.textContent.trim() || 'No old price';
                      const reviewText =
                        item
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
                    'div.t33rbhT3.autoFitList div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
                  );
                  return nextPageAnchor
                    ? nextPageAnchor.getAttribute('href')
                    : null;
                });

                currentPageUrl = nextPageRelativeUrl
                  ? new URL(nextPageRelativeUrl, payload.website).href
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
    this.logger.log('Saving products:', scrapedData);
    this.logger.log('Company: ', company);

    // for (const category of scrapedData) {
    //   for (const product of category.products) {
    //     // console.log(
    //     //   '🚀 ~ TemuScraperService ~ saveProducts ~ product:',
    //     //   product,
    //     // );
    //     const createProductDto: CreateProductDto = {
    //       name: product.name,
    //       price: this.parsePrice(product.price),
    //       discountPrice: this.parsePrice(product.discountPrice),
    //       images: product.images,
    //       specifications: product.specifications,
    //       description: product.description,
    //       brand: product.brand,
    //       categories: product.categories,
    //       link: product.link,
    //       discount: product.discount,
    //       rating: product.rating,
    //       numberOfRatings: product.numberOfRatings,
    //       // store: company.name,
    //       storeBadgeColor: company.badgeColor || 'red', // Use badgeColor from company
    //       store: company.id,
    //       storeName: company.name,
    //       storeLogo: company.logo,
    //       keyFeatures: product.keyFeatures,
    //       tag: product.tag,
    //     };

    //     try {
    //       await this.productService.create(createProductDto);
    //     } catch (error) {
    //       this.logger.error('Error saving product:', error);
    //     }
    //   }
    // }
  }

  private parsePrice(price: string): number {
    return parseFloat(price.replace(/[^\d.-]/g, ''));
  }
}
