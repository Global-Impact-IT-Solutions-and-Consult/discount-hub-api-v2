import { IsNumber, IsOptional, IsUUID } from 'class-validator';

export class QueryChatDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsNumber()
  @IsOptional()
  take?: number;

  @IsNumber()
  @IsOptional()
  skip?: number;
}
