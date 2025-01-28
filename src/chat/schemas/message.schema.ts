import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { MessageTypeEnum } from 'src/utils/constants';
import { ChatDocument } from './chat.schema';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Chat' })
  chat: ChatDocument;

  @Prop({
    required: true,
  })
  content: string;

  @Prop({
    required: true,
    type: String,
    enum: MessageTypeEnum,
  })
  type: MessageTypeEnum;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  metaData: any;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
