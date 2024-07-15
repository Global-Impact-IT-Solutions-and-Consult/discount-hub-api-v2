import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { RoleService } from 'src/user/role/role.service';
import { UserService } from 'src/user/user.service';
import { defaultRoles, defaultSuperAdmin } from 'src/utils/constants';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private roleService: RoleService,
    private userService: UserService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
    await this.seedSuperAdmin();
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
}
