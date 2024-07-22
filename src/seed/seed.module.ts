import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { UserModule } from 'src/user/user.module';
import { CompanyModule } from 'src/company/company.module';

@Module({
  imports: [UserModule, CompanyModule],
  providers: [SeedService],
})
export class SeedModule {}
