import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RedisService } from './redis.service';

@Controller()
export class AppController {
  constructor(private readonly redisService: RedisService) {}

  @MessagePattern({ cmd: 'set' })
  async set({ key, value }: { key: string; value: string }): Promise<void> {
    await this.redisService.set(key, value);
  }

  @MessagePattern({ cmd: 'get' })
  async get(key: string): Promise<string> {
    return this.redisService.get(key);
  }
}
