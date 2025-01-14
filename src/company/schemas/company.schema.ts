import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserDocument } from 'src/user/schemas/user.schema';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({ timestamps: true })
export class Company {
  @Prop({
    required: true,
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
  })
  slug: string;

  @Prop({
    type: { type: Types.ObjectId, ref: 'User' },
  })
  admin: UserDocument;

  @Prop({ required: true })
  website: string;

  @Prop({ required: true })
  apiKey: string;

  @Prop()
  logo: string;

  @Prop()
  badgeColor: string;

  @Prop({ type: [{ type: String }] })
  urls: string[];

  @Prop({ default: false })
  isDeleted: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.pre('find', function () {
  this.where({ isDeleted: false });
});

CompanySchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});
