import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({
    required: true,
    unique: true,
  })
  name: string;

  @Prop({
    type: { type: Types.ObjectId, ref: 'Category', default: null },
  })
  parentCategory: CategoryDocument;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Category' }],
  })
  subCategories: CategoryDocument[];
}

export const CategorySchema = SchemaFactory.createForClass(Category);
