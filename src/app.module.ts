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
        // uri: `mongodb://mongodb:27017/discount-hub`,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD') ?? undefined,
          username: configService.get('REDIS_USERNAME') ?? undefined,
          maxRetriesPerRequest: null, // 🛠️ Prevents creating new clients when a request fails
          enableOfflineQueue: false, // 🚀 Prevents unnecessary queuing when Redis is down
          retryStrategy: (times) => Math.min(times * 50, 2000),
        },
        sharedConnection: true, // ✅ Use a single Redis connection for all queues
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'scraper',
    }),
    // CacheModule.registerAsync<RedisClientOptions>({
    //   isGlobal: true,
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => {
    //     const redisUrl = configService.get('REDIS_USERNAME')
    //       ? `redis://${configService.get('REDIS_USERNAME')}:${configService.get('REDIS_PASSWORD')}@${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`
    //       : `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`;

    //     // ✅ Store a single Redis connection
    //     const store = await redisStore({
    //       url: redisUrl,
    //       ttl: configService.get<number>('CACHE_TTL'),
    //       socket: {
    //         reconnectStrategy: (retries) => Math.min(retries * 50, 2000), // Retry logic
    //       },
    //     });

    //     return {
    //       store: () => store,
    //       isGlobal: true,
    //       onClientReady: (client) => {
    //         console.log('✅ Redis Client Connected');

    //         client.on('error', (err) => {
    //           console.error('❌ Redis Client Error:', err);
    //         });

    //         client.on('reconnecting', () => {
    //           console.warn('🔄 Redis Client Reconnecting...');
    //         });
    //       },
    //     };
    //   },
    //   inject: [ConfigService],
    // }),
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST');
        const redisPort = configService.get('REDIS_PORT');
        const redisUsername = configService.get('REDIS_USERNAME');
        const redisPassword = configService.get('REDIS_PASSWORD');

        // Construct the Redis URL
        let redisUrl: string;
        if (redisUsername && redisPassword) {
          redisUrl = `redis://${redisUsername}:${redisPassword}@${redisHost}:${redisPort}`;
        } else if (redisPassword) {
          redisUrl = `redis://:${redisPassword}@${redisHost}:${redisPort}`;
        } else {
          redisUrl = `redis://${redisHost}:${redisPort}`;
        }

        // console.log('Redis URL:', redisUrl); // Debugging

        // ✅ Store a single Redis connection
        const store = await redisStore({
          url: redisUrl,
          ttl: configService.get<number>('CACHE_TTL'),
          socket: {
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000), // Retry logic
          },
        });

        return {
          store: () => store,
          isGlobal: true,
          onClientReady: (client) => {
            console.log('✅ Redis Client Connected');

            client.on('error', (err) => {
              console.error('❌ Redis Client Error:', err);
            });

            client.on('reconnecting', () => {
              console.warn('🔄 Redis Client Reconnecting...');
            });
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

// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// import { UserModule } from './user/user.module';
// import { CacheModule } from '@nestjs/cache-manager';
// import type { RedisClientOptions } from 'redis';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { redisStore } from 'cache-manager-redis-yet';
// import { EnvironmentVariables, validateEnv } from './common/config/env.config';
// import { BullModule } from '@nestjs/bullmq';
// import { ServicesModule } from './services/services.module';
// import { CompanyModule } from './company/company.module';
// import { ProductModule } from './product/product.module';
// import { AuthModule } from './auth/auth.module';
// import { SeedModule } from './seed/seed.module';
// import { NotificationModule } from './notification/notification.module';
// import { ScheduleModule } from '@nestjs/schedule';
// import { EventEmitterModule } from '@nestjs/event-emitter';
// import { AiModule } from './services/ai/ai.module';
// import { ChatModule } from './chat/chat.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//       validate: validateEnv,
//     }),
//     MongooseModule.forRootAsync({
//       imports: [ConfigModule],
//       useFactory: async (
//         configService: ConfigService<EnvironmentVariables>,
//       ) => ({
//         uri: configService.get<string>('MONGODB_URI'),
//         // uri: `mongodb://mongodb:27017/discount-hub`,
//       }),
//       inject: [ConfigService],
//     }),
//     BullModule.forRootAsync({
//       imports: [ConfigModule],
//       useFactory: async (
//         configService: ConfigService<EnvironmentVariables>,
//       ) => ({
//         connection: {
//           host: configService.get('REDIS_HOST'),
//           port: configService.get('REDIS_PORT'),
//           password: configService.get('REDIS_PASSWORD') ?? undefined,
//           username: configService.get('REDIS_USERNAME') ?? undefined,
//           // Add retry strategy and error handling
//           retryStrategy: (times) => {
//             return Math.min(times * 50, 2000); // Adjust retry strategy as needed
//           },
//         },
//       }),
//       inject: [ConfigService],
//     }),
//     // BullModule.forRootAsync({
//     //   imports: [ConfigModule],
//     //   useFactory: async (
//     //     configService: ConfigService<EnvironmentVariables>,
//     //   ) => ({
//     //     connection: {
//     //       host: configService.get('REDIS_HOST'),
//     //       port: configService.get('REDIS_PORT'),
//     //       password: configService.get('REDIS_PASSWORD') ?? undefined,
//     //       username: configService.get('REDIS_USERNAME') ?? undefined,
//     //       // 👇 Add connection pool settings
//     //       maxRetriesPerRequest: null, // Important for BullMQ
//     //       enableOfflineQueue: false, // Disable queuing when Redis is down
//     //     },
//     //     // 👇 Shared Redis connection for all queues
//     //     sharedConnection: true,
//     //   }),
//     //   inject: [ConfigService],
//     // }),
//     BullModule.registerQueue({
//       name: 'scraper',
//     }),
//     // CacheModule.registerAsync<RedisClientOptions>({
//     //   isGlobal: true,
//     //   imports: [ConfigModule],
//     //   useFactory: async (
//     //     configService: ConfigService<EnvironmentVariables>,
//     //   ) => {
//     //     const store = await redisStore({
//     //       url: configService.get('REDIS_USERNAME')
//     //         ? `redis://${configService.get('REDIS_USERNAME')}:${configService.get('REDIS_PASSWORD')}@${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`
//     //         : `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`,
//     //       ttl: configService.get<number>('CACHE_TTL'),
//     //     });

//     //     return {
//     //       store: () => store,
//     //       // Add error handling here
//     //       onClientReady: (client) => {
//     //         client.on('error', (err) =>
//     //           console.error('Redis Client Error', err),
//     //         );
//     //       },
//     //     };
//     //   },
//     //   inject: [ConfigService],
//     // }),
//     CacheModule.registerAsync<RedisClientOptions>({
//       isGlobal: true,
//       imports: [ConfigModule],
//       useFactory: async (configService: ConfigService) => {
//         const redisUrl = configService.get('REDIS_USERNAME')
//           ? `redis://${configService.get('REDIS_USERNAME')}:${configService.get('REDIS_PASSWORD')}@${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`
//           : `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`;

//         // 🔹 Ensure a single connection is reused
//         const store = await redisStore({
//           url: redisUrl,
//           ttl: configService.get<number>('CACHE_TTL'),
//         });

//         // 🔹 Return store function instead of a new instance each time
//         return {
//           store: () => store,
//           isGlobal: true,
//           onClientReady: (client) => {
//             console.log('✅ Redis Client Connected');

//             client.on('error', (err) => {
//               console.error('❌ Redis Client Error:', err);
//             });

//             // 🔹 Optional: Handle reconnects
//             client.on('reconnecting', () => {
//               console.warn('🔄 Redis Client Reconnecting...');
//             });
//           },
//         };
//       },
//       inject: [ConfigService],
//     }),
//     UserModule,
//     ServicesModule,
//     CompanyModule,
//     ProductModule,
//     AuthModule,
//     SeedModule,
//     NotificationModule,
//     ScheduleModule.forRoot(),
//     EventEmitterModule.forRoot({
//       wildcard: false,
//       delimiter: '.',
//     }),
//     AiModule,
//     ChatModule,
//   ],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}
