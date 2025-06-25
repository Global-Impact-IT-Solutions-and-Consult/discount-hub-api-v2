import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CompanyService } from './company/company.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductService } from './product/product.service';
import { TagService } from './product/tag/tag.service';
import { BrandService } from './product/brand/brand.service';
import { CategoryService } from './product/category/category.service';
// import { CompanyService } from './company/company.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly companyService: CompanyService,
    private readonly eventEmitter: EventEmitter2,
    private readonly productService: ProductService,
    private readonly tagService: TagService,
    private readonly brandService: BrandService,
    private readonly categoryService: CategoryService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'scraperJob', // Give the job a name so it can be managed programmatically
  })
  async handleCron() {
    await this.brandService.clearBrands();
    await this.tagService.clearTags();
    await this.categoryService.clearCategories();
    await this.productService.clearProducts();
    this.logger.log('Daily cleanup completed. Starting product scraping...');
    await this.scrapeProducts();
  }

  async scrapeProducts() {
    const companies = await this.companyService.findAll();
    for (const company of companies) {
      this.eventEmitter.emit(`scrape.${company.slug}`, { company });
    }
  }
}
