import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductDocument } from './product.schema';
import { CategoryDocument } from './category.schema';

export type FeaturedCategoryDocument = HydratedDocument<FeaturedCategory>;

@Schema({ timestamps: true })
export class FeaturedCategory {
  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId: CategoryDocument;

  @Prop({
    required: true,
  })
  categoryName: string;

  @Prop()
  items: ProductDocument[];
}

export const FeaturedCategorySchema =
  SchemaFactory.createForClass(FeaturedCategory);
