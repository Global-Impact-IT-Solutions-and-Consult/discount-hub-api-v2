import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SaveProductConsumerDto } from 'src/product/save-product.consumer';
import { ProductService } from 'src/product/product.service';
import { JOB_NAMES } from 'src/utils/constants';
import { LambdaService } from 'src/services/aws/lambda.service';

@Processor(JOB_NAMES.scraper.SCRAPE_JUMIA) // BullMQ processor for 'scraper' jobs
export class JumiaScraperService extends WorkerHost {
  logger = new Logger(JumiaScraperService.name);
  private readonly BATCH_SIZE = 10;
  constructor(
    private productService: ProductService,
    private lambdaService: LambdaService,
  ) {
    super();
  }

  async process(
    job: Job<{ link: string; storeId: string }, any, string>,
  ): Promise<any> {
    const products = await this.scrapePage(job.data.link).catch((error) => {
      console.error('Error scraping page:', error);
    });
    for (const product of products as SaveProductConsumerDto[]) {
      product.createProductDto.store = job.data.storeId;
      this.productService.saveProductJob(product);
    }
    return products;
  }

  async scrapePage(url: string): Promise<SaveProductConsumerDto[]> {
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

    const { products }: { products: Product[] } =
      await this.lambdaService.callFunction('jumia-scraper', {
        url,
      });
    const data: SaveProductConsumerDto[] = [];

    for (let i = 0; i < products.length; i += this.BATCH_SIZE) {
      const batch = products.slice(i, i + this.BATCH_SIZE);
      const promises = batch.map(async (product) => {
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
            tags: [],
          };
        } catch (error) {
          console.error('Error processing product:', error);
          return null;
        }
      });
      const results = await Promise.all(promises);
      data.push(...results.filter((item) => item !== null));
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
