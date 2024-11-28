import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ProductModule } from 'src/product/product.module';
import { CompanyModule } from 'src/company/company.module';

@Module({
  imports: [ProductModule, CompanyModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
