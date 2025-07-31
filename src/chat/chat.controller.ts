import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  create(@Body() createChatDto: CreateChatDto) {
    return this.chatService.create(createChatDto);
  }

  @Get()
  findAll() {
    return this.chatService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatService.findOne(id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.chatService.findByUser(userId);
  }

  @Post(':id/message')
  async streamMessage(
    @Param('id') chatId: string,
    @Body() addMessageDto: AddMessageDto,
  ) {
    const response = await this.chatService.addMessage(chatId, addMessageDto);
    return response;
  }

  @Post('chat/test')
  async testChat(@Body() addMessageDto: AddMessageDto) {
    const response = await this.chatService.testChat(addMessageDto);
    return response;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chatService.remove(id);
  }
}
