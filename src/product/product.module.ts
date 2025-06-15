import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import {
  FeaturedItem,
  FeaturedItemSchema,
} from './schemas/featuredItems.schema';
import {
  FeaturedCategory,
  FeaturedCategorySchema,
} from './schemas/featuredCategory.schema';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { TagModule } from './tag/tag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: FeaturedItem.name, schema: FeaturedItemSchema },
      { name: FeaturedCategory.name, schema: FeaturedCategorySchema },
    ]),
    CategoryModule,
    BrandModule,
    TagModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
