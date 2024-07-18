import { CanActivate, ExecutionContext, mixin, Type } from '@nestjs/common';
import { RoleService } from 'src/user/role/role.service';
import { User } from 'src/user/schemas/user.schema';

const RoleGuard = (roles: string[]): Type<CanActivate> => {
  class RoleGuardMixin implements CanActivate {
    constructor(private roleService: RoleService) {}
    async canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest();
      const user = request.user as User;
      // const role = await this.roleService.findOne(user.role.)
      return roles.includes(user?.role.name);
    }
  }
  return mixin(RoleGuardMixin);
};

export default RoleGuard;
