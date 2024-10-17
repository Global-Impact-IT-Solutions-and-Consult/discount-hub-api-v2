import { CreateCompanyDto } from 'src/company/dto/create-company.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { CreateRoleDto } from 'src/user/role/dto/create-role.dto';

export const POSTGRES_ERROR_CODES = {
  unique_violation: 23505,
};

export const defaultRoles: CreateRoleDto[] = [
  { name: 'super_admin', description: 'Site Super Admin' },
  { name: 'user', description: 'Default user' },
];

export const defaultCompanies: Partial<CreateCompanyDto>[] = [
  {
    name: 'Jumia',
    slug: 'jumia_',
    urls: [
      'https://www.jumia.com.ng',
      // 'https://www.jumia.com.ng/flash-sales',
      // 'https://www.jumia.com.ng/mlp-clearance-sale',
      // 'https://www.jumia.com.ng/mlp-global-best-deal',
      // 'https://www.jumia.com.ng/mlp-appliances',
      // 'https://www.jumia.com.ng/health-beauty',
      // 'https://www.jumia.com.ng/electronics',
      // 'https://www.jumia.com.ng/mlp-beauty-essentials',
      // 'https://www.jumia.com.ng/mlp-screen-and-sound-sale',
      // 'https://www.jumia.com.ng/mlp-smart-phones-smart-discounts',
      // 'https://www.jumia.com.ng/category-fashion-by-jumia',
      // 'https://www.jumia.com.ng/mlp-global-new-arrival/?sort=newest',
      // 'https://www.jumia.com.ng/mlp-beverages-drinks',
      // 'https://www.jumia.com.ng/mlp-best-sellers-in-underwear-accessories-jewelry',
      // 'https://www.jumia.com.ng/catalog/?sort=lowest-price&tag=CP_MT4',
    ],
    website: 'https://www.jumia.com.ng/',
    logoUrl:
      'https://logos-world.net/wp-content/uploads/2022/12/Jumia-Logo-500x281.png',
  },
];

export enum RegistrationTypeEnum {
  EMAIL = 'EMAIL',
  LINKEDIN = 'LINKEDIN',
  GOOGLE = 'GOOGLE',
}

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

export enum CloudinaryFoldersEnum {
  COMPANY_LOGO = 'discount-hub-company-logo',
}
