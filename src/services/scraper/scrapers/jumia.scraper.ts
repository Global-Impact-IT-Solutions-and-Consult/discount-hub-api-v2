import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SaveProductConsumerDto } from 'src/product/save-product.consumer';
import { ProductService } from 'src/product/product.service';
import { JOB_NAMES } from 'src/utils/constants';
import { LambdaService } from 'src/services/aws/lambda.service';
import { normalizeTagName } from 'src/utils/tag.utils';

@Processor(JOB_NAMES.scraper.SCRAPE_JUMIA) // BullMQ processor for 'scraper' jobs
export class JumiaScraperService extends WorkerHost {
  logger = new Logger(JumiaScraperService.name);
  private readonly BATCH_SIZE = 2; // Reduced to 2 to avoid Lambda concurrent invocation limits
  constructor(
    private productService: ProductService,
    private lambdaService: LambdaService,
  ) {
    super();
  }

  async process(
    job: Job<{ link: string; storeId: string; tagName?: string }, any, string>,
  ): Promise<any> {
    const normalizedTag = job.data.tagName
      ? normalizeTagName(job.data.tagName)
      : null;

    try {
      const products = await this.scrapePage(job.data.link, normalizedTag);

      if (products && products.length > 0) {
        this.logger.log(
          `Successfully scraped ${products.length} products from ${job.data.link}`,
        );
        for (const product of products) {
          product.createProductDto.store = job.data.storeId;
          this.productService.saveProductJob(product);
        }
      } else {
        this.logger.warn(`No products scraped from ${job.data.link}`);
      }

      return products || [];
    } catch (error) {
      this.logger.error(
        `Failed to scrape ${job.data.link}: ${error.message || error}`,
      );
      // Return empty array to prevent downstream errors
      // The job will be marked as failed but won't crash
      return [];
    }
  }

  async scrapePage(
    url: string,
    normalizedTag?: string,
  ): Promise<SaveProductConsumerDto[]> {
    type Product = {
      anchor: any;
      discount: string;
      link: string;
      image: string;
      name: string;
      discountPrice: string;
      price: string;
      reviewText: string;
    };

    let products: Product[] = [];
    try {
      // Add a limit parameter to reduce Lambda execution time
      // This limits the number of products scraped per page to prevent timeouts
      const MAX_PRODUCTS_PER_PAGE = 50; // Limit to 50 products per page to avoid timeouts

      const response = await this.lambdaService.callFunction('jumia-scraper', {
        url,
        limit: MAX_PRODUCTS_PER_PAGE, // Pass limit to Lambda to reduce scraping time
      });
      products = response.products || [];

      if (products.length >= MAX_PRODUCTS_PER_PAGE) {
        this.logger.warn(
          `Page ${url} has ${products.length} products (limited to ${MAX_PRODUCTS_PER_PAGE}). ` +
            `Consider scraping in smaller batches or increasing Lambda timeout.`,
        );
      }
    } catch (error) {
      this.logger.error(`Error scraping page ${url}:`, error);
      // If it's a timeout, provide helpful guidance
      if (error.message && error.message.includes('timed out')) {
        this.logger.warn(
          `Lambda timeout for ${url}. ` +
            `Solutions: 1) Increase Lambda timeout in AWS Console (max 900s), ` +
            `2) Reduce products per page, 3) Optimize Lambda function.`,
        );
      }
      // Re-throw to let the caller handle it
      throw error;
    }

    if (!products || products.length === 0) {
      this.logger.warn(`No products found for URL: ${url}`);
      return [];
    }

    const data: SaveProductConsumerDto[] = [];

    // Process products with limited concurrency to avoid Lambda rate limits
    // Use a semaphore-like pattern to limit concurrent Lambda invocations
    const processProduct = async (
      product: Product,
    ): Promise<SaveProductConsumerDto | null> => {
      try {
        const {
          productDetails,
        }: {
          productDetails: {
            description: string;
            imageUrls: string[];
            keyFeatures: string;
            specifications: string;
          };
        } = await this.lambdaService.callFunction('jumia-scraper', {
          url: product.link,
          isProductPage: true,
        });
        return {
          createProductDto: {
            discountPrice: parseFloat(
              product.discountPrice.replace(/[^0-9.-]+/g, ''),
            ),
            name: product.name,
            price: parseFloat(product.price.replace(/[^0-9.-]+/g, '')),
            description: productDetails.description,
            link: product.link,
            keyFeatures: productDetails.keyFeatures,
            image: product.image,
            images: productDetails.imageUrls,
          },
          brand: null,
          categories: [],
          tags: normalizedTag ? [normalizedTag] : [],
        };
      } catch (error: any) {
        // Handle rate limit errors specifically
        const isRateLimitError =
          (error.message &&
            (error.message.includes('ConcurrentInvocationLimitExceeded') ||
              error.message.includes('Rate Exceeded') ||
              error.message.includes('429') ||
              error.message.includes('TooManyRequestsException'))) ||
          error.$metadata?.httpStatusCode === 429 ||
          error.Reason === 'ConcurrentInvocationLimitExceeded' ||
          error.Type === 'User';

        if (isRateLimitError) {
          this.logger.warn(
            `Rate limit hit for product ${product.link}. Waiting before retry...`,
          );
          // Wait longer for rate limit errors
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
          // Retry once
          try {
            const {
              productDetails,
            }: {
              productDetails: {
                description: string;
                imageUrls: string[];
                keyFeatures: string;
                specifications: string;
              };
            } = await this.lambdaService.callFunction('jumia-scraper', {
              url: product.link,
              isProductPage: true,
            });
            return {
              createProductDto: {
                discountPrice: parseFloat(
                  product.discountPrice.replace(/[^0-9.-]+/g, ''),
                ),
                name: product.name,
                price: parseFloat(product.price.replace(/[^0-9.-]+/g, '')),
                description: productDetails.description,
                link: product.link,
                keyFeatures: productDetails.keyFeatures,
                image: product.image,
                images: productDetails.imageUrls,
              },
              brand: null,
              categories: [],
              tags: normalizedTag ? [normalizedTag] : [],
            };
          } catch (retryError) {
            this.logger.error(
              `Error processing product ${product.link} after retry:`,
              retryError,
            );
            return null;
          }
        } else {
          this.logger.error(`Error processing product ${product.link}:`, error);
          return null;
        }
      }
    };

    // Process products with limited concurrency using batches
    for (let i = 0; i < products.length; i += this.BATCH_SIZE) {
      const batch = products.slice(i, i + this.BATCH_SIZE);

      // Process batch with limited concurrency
      const batchPromises = batch.map((product) => processProduct(product));
      const results = await Promise.all(batchPromises);
      data.push(...results.filter((item) => item !== null));

      // Add delay between batches to avoid rate limits
      if (i + this.BATCH_SIZE < products.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay between batches
      }
    }

    return data;
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
