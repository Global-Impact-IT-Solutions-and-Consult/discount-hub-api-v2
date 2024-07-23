import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TagDocument } from './tag.schema';
import { BrandDocument } from './brand.schema';
import { CategoryDocument } from './category.schema';

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
  images: string;

  @Prop()
  specifications: string;

  @Prop()
  description: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  tags: TagDocument[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'TagAttributes' }] })
  tagAtrributes: TagDocument[];

  @Prop({ type: Types.ObjectId, ref: 'Brand' })
  brand: BrandDocument;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }] })
  categories: CategoryDocument[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
