import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatMemoryDocument = HydratedDocument<ChatMemory>;

@Schema({ timestamps: true })
export class ChatMemory {}

export const ChatMemorySchema = SchemaFactory.createForClass(ChatMemory);
