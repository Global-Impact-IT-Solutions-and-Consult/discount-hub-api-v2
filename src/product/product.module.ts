import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { TagModule } from './tag/tag.module';
import { JOB_NAMES } from 'src/utils/constants';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    CategoryModule,
    BrandModule,
    TagModule,
    ...Object.values(JOB_NAMES.product).map((name) =>
      BullModule.registerQueue({
        name,
      }),
    ),
    ...Object.values(JOB_NAMES.product).map((name) =>
      BullBoardModule.forFeature({
        name,
        adapter: BullMQAdapter, //or use BullAdapter if you're using bull instead of bullMQ
      }),
    ),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService, CategoryModule, BrandModule, TagModule],
})
export class ProductModule {}
