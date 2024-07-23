import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { promisify } from 'util';
import { Logger } from '@nestjs/common';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: RedisClientType;
  private getAsync: (key: string) => Promise<string>;
  private setAsync: (key: string, value: string) => Promise<void>;

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;

    this.client = createClient({ url: `redis://${redisHost}:${redisPort}` });
    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  async onModuleInit() {
    await this.retryConnect();
  }

  private async retryConnect(retries = 5, delay = 2000) {
    while (retries > 0) {
      try {
        await this.client.connect();
        this.getAsync = promisify(this.client.get).bind(this.client);
        this.setAsync = promisify(this.client.set).bind(this.client);
        // console.log('Connected to Redis');
        Logger.log(`
          ************************************************
                        CoNnEcTeD To rEdIs  
          ************************************************
        `);
        break;
      } catch (err) {
        console.error(
          `Failed to connect to Redis. Retrying in ${delay / 1000} seconds...`,
        );
        retries -= 1;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async get(key: string): Promise<string> {
    return this.getAsync(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.setAsync(key, value);
  }
}
