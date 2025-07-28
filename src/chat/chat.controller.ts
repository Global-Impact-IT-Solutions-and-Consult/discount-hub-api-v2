import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Sse,
  MessageEvent,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';

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

  @Sse(':id/message')
  async streamMessage(
    @Param('id') chatId: string,
    @Query() addMessageDto: AddMessageDto,
  ) {
    const response$ = await this.chatService.addMessage(chatId, addMessageDto);
    return new Observable<MessageEvent>((subscriber) => {
      response$.subscribe({
        next: (data) => {
          subscriber.next({ data }); // Emit each chunk as an SSE event
        },
        error: (err) => {
          console.error(err);
          subscriber.error(err); // Notify the client of the error
        },
        complete: () => {
          subscriber.complete(); // Signal the end of the stream
        },
      });
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chatService.remove(id);
  }
}
