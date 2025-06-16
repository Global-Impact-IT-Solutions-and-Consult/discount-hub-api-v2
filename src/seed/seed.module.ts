import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { UserModule } from 'src/user/user.module';
import { CompanyModule } from 'src/company/company.module';
import { ProductModule } from 'src/product/product.module';

@Module({
  imports: [UserModule, CompanyModule, ProductModule],
  providers: [SeedService],
})
export class SeedModule {}
