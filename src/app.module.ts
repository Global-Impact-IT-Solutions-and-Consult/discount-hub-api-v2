import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { CacheModule } from '@nestjs/cache-manager';
import type { RedisClientOptions } from 'redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { EnvironmentVariables, validateEnv } from './common/config/env.config';
import { BullModule } from '@nestjs/bullmq';
import { ServicesModule } from './services/services.module';
import { CompanyModule } from './company/company.module';
import { ProductModule } from './product/product.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { NotificationModule } from './notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AiModule } from './services/ai/ai.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService<EnvironmentVariables>,
      ) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService<EnvironmentVariables>,
      ) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          username: configService.get('REDIS_USERNAME'),
          // Add retry strategy and error handling
          retryStrategy: (times) => {
            return Math.min(times * 50, 2000); // Adjust retry strategy as needed
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'scraper',
    }),
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService<EnvironmentVariables>,
      ) => {
        const store = await redisStore({
          url: `redis://${configService.get('REDIS_USERNAME')}:${configService.get('REDIS_PASSWORD')}@${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`,
          ttl: configService.get<number>('CACHE_TTL'),
        });

        return {
          store: () => store,
          // Add error handling here
          onClientReady: (client) => {
            client.on('error', (err) =>
              console.error('Redis Client Error', err),
            );
          },
        };
      },
      inject: [ConfigService],
    }),
    UserModule,
    ServicesModule,
    CompanyModule,
    ProductModule,
    AuthModule,
    SeedModule,
    NotificationModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
    }),
    AiModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
