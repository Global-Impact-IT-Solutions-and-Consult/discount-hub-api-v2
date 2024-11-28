import { Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ProductService } from 'src/product/product.service';
import { AiService } from 'src/services/ai/ai.service';

@Injectable()
export class ChatService {
  constructor(
    private productService: ProductService,
    private aiService: AiService,
  ) {}
  create(createChatDto: CreateChatDto) {
    return 'This action adds a new chat';
  }

  async findAll(query: string) {
    const products = await this.productService.findAll();
    return await this.aiService.handleQuery(query, products);
    // return `This action returns all chat`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chat`;
  }

  update(id: number, updateChatDto: UpdateChatDto) {
    return `This action updates a #${id} chat`;
  }

  remove(id: number) {
    return `This action removes a #${id} chat`;
  }
}
