import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ProductModule } from 'src/product/product.module';
import { CompanyModule } from 'src/company/company.module';
import { AiModule } from 'src/services/ai/ai.module';

@Module({
  imports: [ProductModule, CompanyModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
