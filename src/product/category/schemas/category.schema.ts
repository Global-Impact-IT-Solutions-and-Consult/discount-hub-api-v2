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

  @Prop()
  description?: string;

  @Prop()
  image: string;

  @Prop({
    default: false,
  })
  isFeatured: boolean;

  @Prop({
    type: { type: Types.ObjectId, ref: 'Category', default: null },
  })
  parentCategory: CategoryDocument;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
