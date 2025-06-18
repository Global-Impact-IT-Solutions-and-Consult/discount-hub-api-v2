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
    // const browser = await puppeteer.launch({
    //   // executablePath: '/usr/bin/google-chrome', // Use system-installed Chrome
    //   headless: true,
    //   ignoreDefaultArgs: ['--disable-extensions'],
    //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
                  // 'div.e5d9e_mwBLu section._588b5_3MtNs ul.b49ee_2pjyI._3b9ce_2Ge9A',
                  'div.e5d9e_mwBLu section ul.b49ee_2pjyI',
                  { timeout: 20000 },
                );

                // <div class="e5d9e_mwBLu">
                //   <section class>
                //     <ul class="b49ee_2pjyI">
                //       <li class="bbe45_3oExY">
                //         <a class="a2cf5_2S5q5 _2b5c5_1Qou0"></a>
                //       </li>
                //       <li class="bbe45_3oExY">
                //         <a class="a2cf5_2S5q5 _2b5c5_1Qou0"></a>
                //       </li>
                //       <li class="bbe45_3oExY">
                //         <a class="a2cf5_2S5q5 _2b5c5_1Qou0"></a>
                //       </li>
                //     </ul>
                //   </section>
                // </div>

                const products = await page.evaluate(() => {
                  const productElements = Array.from(
                    document.querySelectorAll(
                      // 'div.e5d9e_mwBLu section._588b5_3MtNs section ul.b49ee_2pjyI._3b9ce_2Ge9A > li',
                      'div.e5d9e_mwBLu section ul.b49ee_2pjyI > li',
                    ),
                  );

                  return productElements
                    .map((li) => {
                      const anchor = li.querySelector(
                        // 'li.bbe45_3oExY._3b9ce_2Ge9A a',
                        'li.bbe45_3oExY a',
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
        image: '',
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
        // storeBadgeColor: company.badgeColor || 'red', // Use badgeColor from company
        // store: company.id,
        // storeName: company.name,
        // storeLogo: company.logo,
        // keyFeatures: product.keyFeatures,
        // tag: product.tag,
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
}
