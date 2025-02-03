import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { RoleModule } from './role/role.module';
import { Newsletter, NewsletterSchema } from './schemas/newsletter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Newsletter.name, schema: NewsletterSchema },
    ]),
    RoleModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, RoleModule],
})
export class UserModule {}
