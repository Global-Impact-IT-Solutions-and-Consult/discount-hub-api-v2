import { IsMongoId, IsOptional } from 'class-validator';

export class CreateChatDto {
  @IsMongoId()
  @IsOptional()
  userId: string;
}
