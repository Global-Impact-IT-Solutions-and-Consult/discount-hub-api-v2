import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import * as redisStore from 'cache-manager-redis-store';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisService } from './redis.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { env } from './common/config/env.config';
// const { MONGO_URI, REDIS_PORT } = env;

@Module({
  // imports: [MongooseModule.forRoot(MONGO_URI), UserModule],
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/nest',
    ),
    UserModule,
    CacheModule.register({
      isGlobal: true,
      store: redisStore as any,
      url: process.env.REDIS_URI,
    }),
    ClientsModule.register([
      {
        name: 'REDIS_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, RedisService],
})
export class AppModule {}
