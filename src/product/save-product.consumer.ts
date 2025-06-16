import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_NAMES } from 'src/utils/constants';

@Processor(JOB_NAMES.product.PRODUCT_SAVE_PRODUCT)
export class SaveProductConsumer extends WorkerHost {
  process(job: Job, token?: string): Promise<any> {
    return Promise.resolve({});
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
