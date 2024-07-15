import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],
  providers: [SeedService],
})
export class SeedModule {}
