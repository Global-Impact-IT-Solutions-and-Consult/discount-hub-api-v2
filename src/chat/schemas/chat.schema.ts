import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserDocument } from 'src/user/schemas/user.schema';
import { MessageDocument } from './message.schema';

export type ChatDocument = HydratedDocument<Chat>;

@Schema({ timestamps: true })
export class Chat {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: UserDocument;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }] })
  messages: MessageDocument[];
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
