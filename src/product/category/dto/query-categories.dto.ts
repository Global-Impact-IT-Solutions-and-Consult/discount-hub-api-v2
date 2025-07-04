import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from 'src/utils/constants';

export class QueryCategoryDto extends BaseQueryDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsBoolean()
  @IsOptional()
  isFeatured: boolean;
}
