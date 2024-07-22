import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CompanyService } from 'src/company/company.service';
import { CreateCompanyDto } from 'src/company/dto/create-company.dto';
import { CompanyDocument } from 'src/company/schemas/company.schema';
import { RoleService } from 'src/user/role/role.service';
import { UserService } from 'src/user/user.service';
import {
  defaultCompanies,
  defaultRoles,
  defaultSuperAdmin,
} from 'src/utils/constants';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private roleService: RoleService,
    private companyService: CompanyService,
    private userService: UserService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
    await this.seedSuperAdmin();
    await this.seedCompanies();
  }

  async seedRoles() {
    for (const role of defaultRoles) {
      let foundRole = null;
      try {
        foundRole = await this.roleService.findOneByName(role.name);
      } catch (error) {}
      if (!foundRole) {
        await this.roleService.create(role);
        this.logger.log(`Role : ${role.name} Seeded`);
      }
    }
  }

  async seedSuperAdmin() {
    let foundSuperAdmin = null;
    try {
      foundSuperAdmin = await this.userService.findOneByEmail(
        defaultSuperAdmin.email,
      );
    } catch (error) {}
    if (!foundSuperAdmin) {
      await this.userService.create(defaultSuperAdmin);
      this.logger.log(`User : ${defaultSuperAdmin.email} Seeded`);
    }
  }

  async seedCompanies() {
    for (const company of defaultCompanies) {
      let foundCompany: CompanyDocument = null;
      try {
        foundCompany = await this.companyService.findOneBySlug(company.slug);
        if (foundCompany.urls !== company.urls) {
          foundCompany.urls = company.urls;
          await foundCompany.save();
          this.logger.log(`Company : ${company.name} updated`);
        }
      } catch (error) {}
      if (!foundCompany) {
        const superAdmin = await this.userService.findOneByEmail(
          defaultSuperAdmin.email,
        );
        await this.companyService.create({
          ...company,
          adminId: superAdmin.id,
        } as CreateCompanyDto);
        this.logger.log(`Company : ${company.name} Seeded`);
      }
    }
  }
}
