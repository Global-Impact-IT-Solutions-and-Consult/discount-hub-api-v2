import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ProductModule } from 'src/product/product.module';
import { CompanyModule } from 'src/company/company.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './schemas/chat.schema';
import { ChatMessage, MessageSchema } from './schemas/chat-message.schema';
import { UserModule } from 'src/user/user.module';
import { ChatMemory, ChatMemorySchema } from './schemas/memory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: ChatMessage.name, schema: MessageSchema },
      { name: ChatMemory.name, schema: ChatMemorySchema },
    ]),
    ProductModule,
    CompanyModule,
    UserModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
