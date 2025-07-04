import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  image: string;

  @Prop({
    default: false,
  })
  isFeatured: boolean;

  @Prop({
    default: false,
  })
  isSeeded: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
  })
  parentCategory?: CategoryDocument;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'categories',
  count: true,
});

// Include virtuals in JSON output
CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });
