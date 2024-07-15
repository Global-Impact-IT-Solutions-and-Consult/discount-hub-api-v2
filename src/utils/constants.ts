import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { CreateRoleDto } from 'src/user/role/dto/create-role.dto';

export const POSTGRES_ERROR_CODES = {
  unique_violation: 23505,
};

export const defaultRoles: CreateRoleDto[] = [
  { name: 'super_admin', description: 'Site Super Admin' },
  { name: 'user', description: 'Default user' },
];

interface IDefaultSuperAdmin extends CreateUserDto {
  isEmailVerified: boolean;
  roleName: string;
}

export const defaultSuperAdmin: IDefaultSuperAdmin = {
  email: 'super-admin@guideli.com',
  password: 'Admin_123',
  isEmailVerified: true,
  roleName: 'super_admin',
  firstName: 'Super',
  lastName: 'Admin',
};

export enum AppNotificationEnum {
  CREATED = 'CREATED',
  SEEN = 'SEEN',
}
