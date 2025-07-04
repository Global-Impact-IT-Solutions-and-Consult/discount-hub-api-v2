import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Company {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  // logoUrl?: string;
  logo?: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ required: false })
  adminId?: string;

  @Prop({ required: true })
  website: string;

  @Prop({ required: true })
  badgeColor: string;

  // @Prop({ type: Object, required: false })
  // urls?: {
  //   links?: string[];
  //   special_links?: Array<{
  //     name: string;
  //     urls: string[];
  //   }>;
  // };

  @Prop({ type: [String], required: true })
  urls: string[];

  @Prop({ type: [{ name: String, urls: [String] }], required: false })
  special_links?: Array<{
    name: string;
    urls: string[];
  }>;

  // @Prop({ type: [String], required: true })
  // urls: string[];
}

export type CompanyDocument = Company & Document;
export const CompanySchema = SchemaFactory.createForClass(Company);
