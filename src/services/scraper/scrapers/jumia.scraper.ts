import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { SaveProductConsumerDto } from 'src/product/save-product.consumer';
import { ProductService } from 'src/product/product.service';
import { JOB_NAMES } from 'src/utils/constants';
import { Worker } from 'worker_threads';

import path from 'path';
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
    const products = await this.scrapePage(job.data.link).catch((error) => {
      console.error('Error scraping page:', error);
    });
    // console.log({ products });
    for (const product of products as SaveProductConsumerDto[]) {
      product.createProductDto.store = job.data.storeId;
      this.productService.saveProductJob(product);
    }
    return products;
  }

  async scrapePage(url: string): Promise<SaveProductConsumerDto[]> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        path.join(__dirname, '../', 'workers', 'jumia.worker.js'),
        {
          workerData: { url },
        },
      );

      worker.on('message', (result: SaveProductConsumerDto[]) => {
        console.log('Worker finished processing:', result);
        resolve(result);
      });

      worker.on('error', (error) => {
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
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
