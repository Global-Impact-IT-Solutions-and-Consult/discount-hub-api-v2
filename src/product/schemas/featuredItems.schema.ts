import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductDocument } from './product.schema';
import { TagDocument } from './tag.schema';

export type FeaturedItemDocument = HydratedDocument<FeaturedItem>;

@Schema({ timestamps: true })
export class FeaturedItem {
  @Prop({ type: Types.ObjectId, ref: 'Tag' })
  tagId: TagDocument;

  @Prop({
    required: true,
  })
  tagName: string;

  @Prop()
  items: ProductDocument[];
}

export const FeaturedItemSchema = SchemaFactory.createForClass(FeaturedItem); // Changed CategorySchema to FeaturedItemSchema
