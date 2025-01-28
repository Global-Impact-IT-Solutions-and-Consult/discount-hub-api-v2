/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ProductService } from 'src/product/product.service';
import { AiService } from 'src/services/ai/ai.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat } from './schemas/chat.schema';
import { Message } from './schemas/message.schema';
import { UserService } from 'src/user/user.service';
import { UserDocument } from 'src/user/schemas/user.schema';
import { MessageTypeEnum } from 'src/utils/constants';
import { QueryChatDto } from './dto/query-chat.dto';
import { AddMessageDto } from './dto/add-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel('Chat') private readonly chatModel: Model<Chat>,
    @InjectModel('Message') private readonly messageModel: Model<Message>,
    @InjectModel('ChatMemory') private readonly chatMemoryModel: Model<Message>,
    private productService: ProductService,
    private aiService: AiService,
    private userService: UserService,
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
    // const products = await this.productService.findAll();
    // return await this.aiService.handleQuery(query, products);
    // // return `This action returns all chat`;
  }

  async query(query: QueryChatDto) {
    const chats = await this.chatModel
      .find({
        user: query.userId,
      })
      .skip(query.skip ?? 0)
      .limit(query.take ?? 10)
      .populate('messages')
      .exec();

    return chats;
  }

  async findOne(id: string) {
    const chat = await this.chatModel.findById(id).populate('messages').exec();
    return chat;
  }

  update(id: number, updateChatDto: UpdateChatDto) {
    return `This action updates a #${id} chat`;
  }

  async addMessage(chatId: string, addMessageDto: AddMessageDto) {
    const chat = await this.chatModel.findById(chatId);
    const memoryCollection = this.chatMemoryModel.collection;
    // const userMessage = await this.messageModel.create({
    //   chat: chat._id,
    //   content: addMessageDto.content,
    //   type: MessageTypeEnum.USER,
    // });
    const products = await this.productService.findAll();
    // const response = await this.aiService.handleQuery(
    //   userMessage.content,
    //   chat.id,
    //   memoryCollection,
    //   products,
    // );
    // const AIMessage = await this.messageModel.create({
    //   chat: chat._id,
    //   content: response,
    //   type: MessageTypeEnum.AI,
    // });

    // chat.messages.push(userMessage, AIMessage);
    // await chat.save();
    // return this.aiService.handleQuery(
    //   addMessageDto.content,
    //   chat.id,
    //   memoryCollection,
    //   products,
    // );
    return null;
  }

  async remove(id: string) {
    await this.chatModel.findByIdAndDelete(id);
    return true;
  }
}
