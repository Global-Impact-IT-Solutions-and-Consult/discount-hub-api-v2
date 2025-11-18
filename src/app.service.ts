import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CompanyService } from './company/company.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductService } from './product/product.service';
import { TagService } from './product/tag/tag.service';
import { BrandService } from './product/brand/brand.service';
import { CategoryService } from './product/category/category.service';
import { BedRockService } from './services/aws/bedrock.service';
import { ConversationRole } from '@aws-sdk/client-bedrock-runtime';
import { JumiaScraperService } from './services/scraper/scrapers/jumia.scraper';
import { SeedService } from './seed/seed.service';
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
    private readonly jumiaScraperService: JumiaScraperService,
    private readonly seedService: SeedService,
    //Test AI Integration
    private readonly bedrockService: BedRockService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'scraperJob', // Give the job a name so it can be managed programmatically
  })
  async handleCron() {
    await this.brandService.clearBrands();
    await this.tagService.clearTags();
    await this.categoryService.clearCategories();
    await this.productService.clearProducts();
    await this.seedService.scrapeProducts();
  }

  async testAIIntegration(prompt: string) {
    this.logger.log('Testing AI integration...');
    const response = await this.bedrockService.invokeConverseModel([
      { role: ConversationRole.USER, content: [{ text: prompt }] },
    ]);
    return response;
    // Implement AI integration test logic here
  }

  async testScraper() {
    this.logger.log('Testing Scraper...');
    return await this.jumiaScraperService.scrapePage(
      'https://www.jumia.com.ng/flash-sales',
    );
    // Implement scraper test logic here
  }
}
