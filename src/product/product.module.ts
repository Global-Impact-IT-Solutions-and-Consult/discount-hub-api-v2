import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { TagModule } from './tag/tag.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    CategoryModule,
    BrandModule,
    TagModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService, CategoryModule, BrandModule, TagModule],
})
export class ProductModule {}
