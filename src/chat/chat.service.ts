/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ProductService } from 'src/product/product.service';
import { AiService } from 'src/services/ai/ai.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat } from './schemas/chat.schema';
import { ChatMessage } from './schemas/chat-message.schema';
import { UserService } from 'src/user/user.service';
import { UserDocument } from 'src/user/schemas/user.schema';
import { MessageTypeEnum } from 'src/utils/constants';
import { QueryChatDto } from './dto/query-chat.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { ChatMemory } from './schemas/memory.schema';
import { add } from 'date-fns';
import { ProductDocument } from 'src/product/schemas/product.schema';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel('Chat') private readonly chatModel: Model<Chat>,
    @InjectModel('ChatMemory')
    private readonly chatMemoryModel: Model<ChatMemory>,
    @InjectModel('ChatMessage')
    private readonly chatMessageModel: Model<ChatMessage>,
    private productService: ProductService,
    private aiService: AiService,
    private userService: UserService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async create(createChatDto: CreateChatDto) {
    let user: UserDocument | undefined;
    try {
      user = await this.userService.findOne(createChatDto.userId);
    } catch (error) {}

    const chat = await this.chatModel.create({
      user,
    });

    return chat;
  }

  async findAll() {
    const chats = await this.chatModel.find().populate('messages').exec();
    return chats;
  }

  async findOne(id: string) {
    const chat = await this.chatModel.findById(id).populate('messages').exec();
    return chat;
  }

  async findByUser(userId: string) {
    const chats = await this.chatModel
      .find({ user: userId })
      .populate('messages')
      .exec();
    return chats;
  }

  update(id: number, updateChatDto: UpdateChatDto) {
    return `This action updates a #${id} chat`;
  }

  async addMessage(chatId: string, addMessageDto: AddMessageDto) {
    const chat = await this.chatModel
      .findById(chatId)
      .populate('messages')
      .exec();

    let productsText = await this.cacheManager.get<string[]>('productsText');
    if (!productsText) {
      const products = await this.productService.findAll();
      const product_texts: string[] = [];

      products.map((product) =>
        product_texts.push(this.convertToProductText(product)),
      );
      productsText = product_texts;
      await this.cacheManager.set('productsText', productsText);
    }

    const message = new this.chatMessageModel({
      content: addMessageDto.content,
      type: MessageTypeEnum.USER,
    });
    chat.messages.push(message);
    const response = await this.aiService.handleQuery(
      chat.messages,
      productsText,
      addMessageDto.content,
    );

    const responseMessage = new this.chatMessageModel({
      content: response.content,
      metaData: response.response_metadata,
      type: MessageTypeEnum.AI,
    });
    chat.messages.push(responseMessage);
    await chat.save();

    return responseMessage;
  }

  async remove(id: string) {
    await this.chatModel.findByIdAndDelete(id);
    return true;
  }

  private convertToProductText = (product: ProductDocument) => {
    return `
        ID: ${product._id},
        Name: ${product.name},
        Price: ${product.price},
        Discount: ${product.discountPrice},
        rating: ${product.rating},
        specifications: ${product.specifications},
        Key Features: ${product.keyFeatures},
        Store: ${product.store.name},
        Description: ${product.description},
        Tags: ${product.tags.map((tag, index) => `${index}-${tag.name}`)},
        Brand: ${
          //product?.brand?.name ||
          ''
        }
        Categories: ${product.categories.map((category, index) => `${index}-${category.name}`)}
        `;
  };
}
