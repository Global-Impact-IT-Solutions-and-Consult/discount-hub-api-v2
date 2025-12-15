/* eslint-disable prefer-const */
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_NAMES } from 'src/utils/constants';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';
import { AiService } from 'src/services/ai/ai.service';
import { CategoryService } from './category/category.service';
import { BrandService } from './brand/brand.service';
import { TagService } from './tag/tag.service';

export class SaveProductConsumerDto {
  createProductDto: CreateProductDto;
  brand?: string;
  tags?: string[];
  categories?: string[];
}

@Processor(JOB_NAMES.product.PRODUCT_SAVE_PRODUCT)
export class SaveProductConsumer extends WorkerHost {
  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private tagService: TagService,
    private brandService: BrandService,
    private aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<SaveProductConsumerDto, any, any>): Promise<any> {
    const { brand, createProductDto, tags, categories } = job.data;

    let brandId,
      categoriesIds = [],
      tagIds = [];

    // Check if we need AI categorization (if brand is missing OR categories array is empty/missing)
    const needsAICategorization =
      !brand || !categories || categories.length === 0;

    if (needsAICategorization) {
      const dbCategories = await this.categoryService.findAll();
      const aiResponse = await this.aiService.categorizeProducts({
        categories: dbCategories.map((c) => c.name),
        product: createProductDto.name,
      });

      if (!brand) {
        const newBrand = await this.brandService.findOrCreate({
          name: aiResponse.brand,
        });
        brandId = newBrand._id;
      } else {
        const newBrand = await this.brandService.findOrCreate({ name: brand });
        brandId = newBrand._id;
      }

      // Always use AI categories if we're using AI (categories array was empty/missing)
      if (!categories || categories.length === 0) {
        for (const cat of aiResponse.categories) {
          const cate = await this.categoryService.findOneOrCreate({
            name: cat,
          });
          categoriesIds.push(cate._id);
        }
      } else {
        // If categories were provided, use them
        for (const cat of categories) {
          const cate = await this.categoryService.findOneOrCreate({
            name: cat,
          });
          categoriesIds.push(cate._id);
        }
      }
    } else {
      // Brand and categories are provided, use them directly
      const newBrand = await this.brandService.findOrCreate({ name: brand });
      brandId = newBrand._id;

      for (const cat of categories) {
        const cate = await this.categoryService.findOneOrCreate({
          name: cat,
        });
        categoriesIds.push(cate._id);
      }
    }

    // Process tags - always use findOrCreate for tags
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        const newTag = await this.tagService.findOrCreate({ name: tag });
        tagIds.push(newTag._id);
      }
    }

    const product = await this.productService.create({
      ...createProductDto,
      brand: brandId,
      categories: categoriesIds,
      tags: tagIds,
    });
    return product;
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
