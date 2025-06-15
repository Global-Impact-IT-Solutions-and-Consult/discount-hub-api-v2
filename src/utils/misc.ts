import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { QueryOrderEnum } from './constants';

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
