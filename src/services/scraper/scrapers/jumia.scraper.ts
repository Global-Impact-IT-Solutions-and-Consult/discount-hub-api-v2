import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
// import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { Job } from 'bullmq';
import puppeteer from 'puppeteer-extra';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { SaveProductConsumerDto } from 'src/product/save-product.consumer';
import { parsePrice } from 'src/utils/misc';
import { ProductService } from 'src/product/product.service';
import { JOB_NAMES } from 'src/utils/constants';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
// import chromium from '@sparticuz/chromium';

@Processor(JOB_NAMES.scraper.SCRAPE_JUMIA) // BullMQ processor for 'scraper' jobs
export class JumiaScraperService extends WorkerHost {
  logger = new Logger(JumiaScraperService.name);
  constructor(private productService: ProductService) {
    super();
  }

  async process(
    job: Job<{ link: string; storeId: string }, any, string>,
  ): Promise<any> {
    let currentPageUrl = job.data.link;
    try {
      puppeteer.use(StealthPlugin());
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          // '--disable-setuid-sandbox',
          // '--disable-dev-shm-usage',
          // '--disable-accelerated-2d-canvas',
          // '--no-first-run',
          // '--no-zygote',
          // '--single-process',
          // '--disable-gpu',
        ],
      });
      try {
        const page = await browser.newPage();
        const fetchedProducts = [];
        while (currentPageUrl) {
          await page.goto(currentPageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 200000,
          });
          console.log(currentPageUrl);
          await page
            .waitForSelector('section.card.-fh', { timeout: 10000 })
            .catch(() => {
              this.logger.error(
                `Selector 'section.card.-fh' not found at URL ${currentPageUrl}. Skipping to next link.`,
              );
              currentPageUrl = null;
              return;
            });

          // const categoryHeading = await page.evaluate(() => {
          //   const header = document.querySelector('section.card.-fh header');
          //   const heading = header?.querySelector('div h1')?.textContent.trim();
          //   return heading || 'Unknown Category';
          // });
          const productsDetails = await page.evaluate(() => {
            const productElements = Array.from(
              document.querySelectorAll('section.card div > article.prd'),
            );
            return productElements.map((article) => {
              const anchor = article.querySelector('a.core');
              if (!anchor) return;

              const discount = anchor
                .querySelector('div.s-prc-w div.bdg._dsct._sm')
                ?.textContent.trim();
              if (!discount) return;

              const link =
                'https://www.jumia.com.ng/' + anchor.getAttribute('href');
              const image = anchor
                .querySelector('div.img-c img')
                ?.getAttribute('data-src');
              const name = anchor
                .querySelector('div.info h3.name')
                ?.textContent.trim();
              const discountPrice = anchor
                .querySelector('div.info div.prc')
                ?.textContent.trim();
              const price = anchor
                .querySelector('div.s-prc-w div.old')
                ?.textContent.trim();
              const reviewText = anchor
                .querySelector('div.info div.rev')
                ?.textContent.trim();

              return {
                anchor,
                discount,
                link,
                image,
                name,
                discountPrice,
                price,
                reviewText,
              };
            });
          });
          productsDetails
            .filter((d) => !!d)
            .forEach(async (productDetail) => {
              const productPage = await browser.newPage();
              try {
                await productPage.goto(productDetail.link, {
                  waitUntil: 'domcontentloaded',
                  // timeout: 200000,
                });
                const extraDetails = await productPage.evaluate(() => {
                  //images
                  const imageUrls = [];
                  const imgElements =
                    document.querySelectorAll('label.itm-sel._on'); // Target images with class '-fw _ni'
                  imgElements.forEach((img) => {
                    const element = img.querySelector('img.-fw._ni');
                    const src = element.getAttribute('data-src');
                    if (src) imageUrls.push(src);
                  });

                  //description
                  const descriptionElement = document.querySelector(
                    'div.markup.-mhm.-pvl.-oxa.-sc',
                  );
                  const description = descriptionElement
                    ? descriptionElement.textContent.trim()
                    : 'No description available';

                  //key features
                  const keyFeaturesElement =
                    document.querySelector('div.markup.-pam');
                  const keyFeatures = keyFeaturesElement
                    ? keyFeaturesElement.textContent.trim()
                    : 'No key features available';

                  // specifications
                  const specificationsElement = document.querySelector(
                    'div.-pvs.-mvxs.-phm.-lsn',
                  );
                  const specifications = specificationsElement
                    ? specificationsElement.textContent.trim()
                    : 'No specifications available';

                  return {
                    description,
                    imageUrls,
                    keyFeatures,
                    specifications,
                  };
                });
                //trigger saveproduct job'
                const saveProductConsumerDto: SaveProductConsumerDto = {
                  createProductDto: {
                    discountPrice: parsePrice(productDetail.discountPrice),
                    name: productDetail.name,
                    price: parsePrice(productDetail.price),
                    description: extraDetails.description,
                    link: productDetail.link,
                    keyFeatures: extraDetails.keyFeatures,
                    image: productDetail.image,
                    images: extraDetails.imageUrls,
                    store: job.data.storeId,
                  },
                };
                fetchedProducts.push(saveProductConsumerDto);
                this.productService.saveProductJob(saveProductConsumerDto);
                if (!productPage.isClosed()) {
                  await productPage.close();
                }
              } catch (error) {
                console.log({ error });
              } finally {
              }
            });

          //pagination
          const nextPageRelativeUrl = await page.evaluate(() => {
            const nextPageAnchor = document.querySelector(
              'section.card.-fh div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
            );
            return nextPageAnchor ? nextPageAnchor.getAttribute('href') : null;
          });

          currentPageUrl = nextPageRelativeUrl
            ? new URL(nextPageRelativeUrl, 'https://www.jumia.com.ng').href
            : null;
        }
        return fetchedProducts;
      } catch (error) {
        console.log(error);
        // throw new InternalServerErrorException(error);
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.log({ error });
    }
  }

  @OnWorkerEvent('error')
  onError(job: Job) {
    console.log(
      `Error with job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(
      `Processed job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }
}
