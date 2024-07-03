import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(@Inject('REDIS_SERVICE') private readonly client: ClientProxy) {}

  async onModuleInit() {
    await this.client.connect();
  }

  async setCache(key: string, value: string): Promise<void> {
    await firstValueFrom(this.client.send({ cmd: 'set' }, { key, value }));
  }

  async getCache(key: string): Promise<string> {
    return firstValueFrom(this.client.send({ cmd: 'get' }, key));
  }
}
