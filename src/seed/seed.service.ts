import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CompanyService } from 'src/company/company.service';
import { CreateCompanyDto } from 'src/company/dto/create-company.dto';
import { CompanyDocument } from 'src/company/schemas/company.schema';
import { CategoryService } from 'src/product/category/category.service';
import { RoleService } from 'src/user/role/role.service';
import { UserService } from 'src/user/user.service';
import {
  categoryDTOs,
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
    private categoryService: CategoryService,
  ) {}

  async onApplicationBootstrap() {
    // await this.companyService.removeAll(); // disabled on dev
    await this.seedRoles();
    await this.seedSuperAdmin();
    await this.seedCompanies();
    await this.seedCategories();
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
      // this.logger.log(`Company : ${company.special_links}`);
      // console.log(`Company 2 : ${company.special_links?.[0]?.name}`);
      let foundCompany: CompanyDocument = null;
      try {
        foundCompany = await this.companyService.findOneBySlug(company.slug);
        if (foundCompany.urls !== company.urls) {
          foundCompany.urls = company.urls;
          await foundCompany.save();
          this.logger.log(`Company : ${company.name} updated`);
        }
        if (foundCompany.special_links !== company.special_links) {
          foundCompany.special_links = company.special_links;
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
          special_links: company.special_links,
          adminId: superAdmin.id,
        } as CreateCompanyDto);
        this.logger.log(`Company : ${company.name} Seeded`);
      }
    }
  }

  async seedCategories() {
    for (const categoryDto of categoryDTOs) {
      await this.categoryService.findOneOrCreate(categoryDto);
    }
    this.logger.log(`Categories Seeded`);
  }
}
