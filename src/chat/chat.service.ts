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
import { ChatMemory } from './schemas/memory.schema';
import { add } from 'date-fns';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel('Chat') private readonly chatModel: Model<Chat>,
    @InjectModel('ChatMemory')
    private readonly chatMemoryModel: Model<ChatMemory>,
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
    const chat = await this.chatModel.findById(chatId);
    const products = await this.productService.findAll();
    return this.aiService.handleQuery(
      addMessageDto.content,
      chat.id,
      this.chatMemoryModel.collection,
      products,
    );
  }

  async testChat(addMessageDto: AddMessageDto) {
    return await this.aiService.testChat({ chat: addMessageDto.content });
  }

  async remove(id: string) {
    await this.chatModel.findByIdAndDelete(id);
    return true;
  }
}
