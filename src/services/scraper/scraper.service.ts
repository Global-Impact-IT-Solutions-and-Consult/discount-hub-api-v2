import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { CompanyService } from 'src/company/company.service';

@Processor('scraper')
export class ScraperService extends WorkerHost {
  constructor(
    private eventEmitter: EventEmitter2,
    private companyService: CompanyService,
  ) {
    super();
  }
  async process(job: Job<any, any, string>): Promise<any> {
    // do some stuff
    switch (job.name) {
      case 'scrape':
        const companies = await this.companyService.findAll();
        for (const company of companies) {
          this.eventEmitter.emit(`scrape.${company.slug}`, company);
        }
        break;
      default:
        console.log('defualt');
    }
  }
}
