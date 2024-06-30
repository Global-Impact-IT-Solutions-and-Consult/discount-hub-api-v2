import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
// import { env } from './common/config/env.config';
// const { MONGO_URI } = env;

@Module({
  // imports: [MongooseModule.forRoot(MONGO_URI), UserModule],
  imports: [MongooseModule.forRoot('mongodb://mongodb/nest'), UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
