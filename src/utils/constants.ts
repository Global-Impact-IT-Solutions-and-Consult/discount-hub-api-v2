import { CreateCompanyDto } from 'src/company/dto/create-company.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { CreateRoleDto } from 'src/user/role/dto/create-role.dto';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateCategoryDTO } from 'src/product/category/dto/create-category.dto';

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
    slug: 'jumia',
    badgeColor: 'blue',
    urls: [
      // 'https://www.jumia.com.ng',
      // 'https://www.jumia.com.ng/mlp-appliances',
      // 'https://www.jumia.com.ng/health-beauty',
      // 'https://www.jumia.com.ng/electronics',
      // 'https://www.jumia.com.ng/mlp-beauty-essentials',
      // 'https://www.jumia.com.ng/mlp-screen-and-sound-sale',
      // 'https://www.jumia.com.ng/mlp-smart-phones-smart-discounts',
      // 'https://www.jumia.com.ng/category-fashion-by-jumia',
      // 'https://www.jumia.com.ng/mlp-beverages-drinks',
      // 'https://www.jumia.com.ng/mlp-best-sellers-in-underwear-accessories-jewelry',
      // 'https://www.jumia.com.ng/catalog/?sort=lowest-price&tag=CP_MT4',
      // 'https://www.jumia.com.ng/flash-sales',
      // 'https://www.jumia.com.ng/mlp-clearance-sale',
      // 'https://www.jumia.com.ng/mlp-global-best-deal',
      // 'https://www.jumia.com.ng/mlp-global-new-arrival/?sort=newest',
    ],
    special_links: [
      {
        name: 'Jumia Flash Sales',
        urls: ['https://www.jumia.com.ng/flash-sales'],
      },
      {
        name: 'Global New Arrival',
        urls: ['https://www.jumia.com.ng/mlp-global-new-arrival/?sort=newest'],
      },
      {
        name: 'Jumia Clearance Sale',
        urls: ['https://www.jumia.com.ng/mlp-clearance-sale'],
      },
      {
        name: 'Global Best Deals',
        urls: ['https://www.jumia.com.ng/mlp-global-best-deal'],
      },
    ],
    website: 'https://www.jumia.com.ng/',
    logoUrl:
      'https://logos-world.net/wp-content/uploads/2022/12/Jumia-Logo-500x281.png',
  },
  {
    name: 'Konga',
    slug: 'konga',
    badgeColor: 'emerald',
    urls: [
      // 'https://www.konga.com',
      // 'https://www.konga.com'
    ],
    special_links: [
      {
        name: 'Konga Daily Deals',
        urls: ['https://www.konga.com/deals/daily'],
      },
    ],
    website: 'https://www.konga.com/',
    logoUrl:
      'https://www.konga.com/_next/static/images/62f8a0d88e07573b4d46735aa24f3f04.png',
  },
  // {
  //   name: 'Temu',
  //   slug: 'temu',
  //   badgeColor: 'orange',
  //   urls: ['https://www.temu.com/ng'],
  //   special_links: [
  //     // {
  //     //   name: 'Temu Best Sellers',
  //     //   urls: ['https://www.temu.com/ng/channel/best-sellers.html'],
  //     // },
  //     // {
  //     //   name: 'Temu New Arrivals',
  //     //   urls: ['https://www.temu.com/ng/channel/new-in.html'],
  //     // },
  //   ],
  //   website: 'https://www.temu.com/ng',
  //   logoUrl:
  //     'https://seeklogo.com/images/T/temu-logo-B5FE5A9A56-seeklogo.com.png',
  // },
  {
    name: 'Aliexpress',
    slug: 'aliexpress',
    badgeColor: 'red',
    urls: [
      // 'https://www.aliexpress.com/',
      // 'https://www.aliexpress.com/'
    ],
    special_links: [
      {
        name: 'Aliexpress Best Sellers',
        urls: ['https://www.aliexpress.com/ssr/300000444/GSDWp3p6aC'],
      },
      {
        name: 'AliExpress Bundle Deals',
        urls: ['https://www.aliexpress.com/ssr/300000512/BundleDeals2'],
      },
      {
        name: 'AliExpress Choices',
        urls: ['https://www.aliexpress.com/ssr/300000556/zQFHEaEPNJ'],
      },
    ],
    website: 'https://www.aliexpress.com/',
    logoUrl:
      'https://w7.pngwing.com/pngs/453/223/png-transparent-aliexpress-hd-logo-thumbnail.png',
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

export enum MessageTypeEnum {
  SYSTEM = 'SYSTEM',
  AI = 'AI',
  USER = 'USER',
}

export enum QueryOrderEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class BaseQueryDto {
  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsString()
  @IsOptional()
  sortBy: string;

  @IsEnum(QueryOrderEnum)
  @IsOptional()
  order: QueryOrderEnum;
}

export const categoryDTOs: CreateCategoryDTO[] = [
  { name: 'electronics', isSeeded: true },
  { name: 'kitchenware', isSeeded: true },
  { name: 'home appliances', isSeeded: true },
  { name: 'personal care', isSeeded: true },
  { name: 'furniture', isSeeded: true },
  { name: 'accessories', isSeeded: true },
  { name: 'health and beauty', isSeeded: true },
  { name: 'fashion', isSeeded: true },
  { name: 'groceries', isSeeded: true },
  { name: 'jewelry', isSeeded: true },
  { name: 'home and office', isSeeded: true },
  { name: 'books', isSeeded: true },
  { name: 'toys', isSeeded: true },
  { name: 'sports and outdoors', isSeeded: true },
  { name: 'gaming', isSeeded: true },
  { name: 'appliances', isSeeded: true },
  { name: 'fitness and wellness', isSeeded: true },
  { name: 'beverages', isSeeded: true },
  { name: 'phones and tablets', isSeeded: true },
  { name: 'industrial and tools', isSeeded: true },
  { name: 'beauty and cosmetics', isSeeded: true },
  { name: 'audio and headphones', isSeeded: true },
  { name: 'solar products', isSeeded: true },
  { name: 'footwear', isSeeded: true },
  { name: 'clothing', isSeeded: true },
  { name: 'travel and luggage', isSeeded: true },
  { name: 'automotive', isSeeded: true },
  { name: 'pet supplies', isSeeded: true },
  { name: 'office supplies', isSeeded: true },
  { name: 'gardening', isSeeded: true },
  { name: 'home decor', isSeeded: true },
  { name: 'health devices', isSeeded: true },
  { name: 'art and crafts', isSeeded: true },
  { name: 'musical instruments', isSeeded: true },
  { name: 'smart home', isSeeded: true },
];
