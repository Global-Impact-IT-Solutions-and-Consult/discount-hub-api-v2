import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { Brand, BrandSchema } from './schemas/brand.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { Tag, TagSchema } from './schemas/tag.schema';
import {
  TagAttribute,
  TagAttributeSchema,
} from './schemas/tagAttribute.schema';
import { AiModule } from 'src/services/ai/ai.module';
import {
  FeaturedItem,
  FeaturedItemSchema,
} from './schemas/featuredItems.schema';
import {
  FeaturedCategory,
  FeaturedCategorySchema,
} from './schemas/featuredCategory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Tag.name, schema: TagSchema },
      { name: TagAttribute.name, schema: TagAttributeSchema },
      { name: FeaturedItem.name, schema: FeaturedItemSchema },
      { name: FeaturedCategory.name, schema: FeaturedCategorySchema },
    ]),
    AiModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
