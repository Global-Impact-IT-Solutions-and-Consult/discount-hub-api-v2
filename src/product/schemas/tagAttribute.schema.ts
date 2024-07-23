import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TagDocument } from './tag.schema';

export type TagAttributeDocument = HydratedDocument<TagAttribute>;

@Schema({ timestamps: true })
export class TagAttribute {
  @Prop({
    type: { type: Types.ObjectId, ref: 'Tag' },
  })
  tag: TagDocument;

  @Prop()
  attributeValue: string;
}

export const TagAttributeSchema = SchemaFactory.createForClass(TagAttribute);
