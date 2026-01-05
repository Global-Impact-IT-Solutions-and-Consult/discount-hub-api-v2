import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { QueryTool } from './tools/query.tool';
import { FormatTool } from './tools/format.tool';
import { ProductModule } from 'src/product/product.module';

@Module({
  imports: [ProductModule],
  providers: [AiService, QueryTool, FormatTool],
  exports: [AiService],
})
export class AiModule {}
