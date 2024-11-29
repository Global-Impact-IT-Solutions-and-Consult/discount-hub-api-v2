import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { QueryChatDto } from './dto/query-chat.dto';
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

  @Get('query')
  query(@Query() queryChatDto: QueryChatDto) {
    return this.chatService.query(queryChatDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChatDto: UpdateChatDto) {
    return this.chatService.update(+id, updateChatDto);
  }

  @Post(':id/message')
  addMessage(
    @Param('id') chatId: string,
    @Body() addMessageDto: AddMessageDto,
  ) {
    return this.chatService.addMessage(chatId, addMessageDto);
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
