import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CompanyDocument } from 'src/company/schemas/company.schema';
import { CategoryDocument } from '../category/schemas/category.schema';
import { BrandDocument } from '../brand/schemas/brand.schema';
import { TagDocument } from '../tag/schema/tag.schema';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({
    required: true,
  })
  name: string;

  @Prop({
    required: true,
  })
  price: number;

  @Prop({
    required: true,
  })
  discountPrice: number;

  @Prop({
    required: true,
    type: [{ type: String }],
  })
  images: string[];

  @Prop()
  rating: string;

  @Prop()
  numberOfRatings: string;

  @Prop()
  specifications: string;

  @Prop()
  keyFeatures: string;

  @Prop()
  link: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Company' }] })
  store: CompanyDocument[];

  @Prop()
  description: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  tags: TagDocument[];

  @Prop({ type: Types.ObjectId, ref: 'Brand' })
  brand: BrandDocument;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }] })
  categories: CategoryDocument[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
