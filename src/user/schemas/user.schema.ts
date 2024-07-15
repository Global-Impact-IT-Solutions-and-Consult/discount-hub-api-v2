import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Role } from '../role/schemas/role.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({
    required: true,
    unique: true,
  })
  email: string;

  @Prop({
    required: true,
  })
  password: string;

  @Prop({
    required: true,
  })
  firstName: string;

  @Prop({
    required: true,
  })
  lastName: string;

  @Prop({
    default: false,
  })
  isEmailVerified: boolean;

  @Prop()
  confirmEmailToken: string;

  @Prop()
  confirmEmailTTL: Date;

  @Prop()
  changePasswordToken: string;

  @Prop()
  changePasswordTokenTTL: Date;

  @Prop({ type: { type: Types.ObjectId, ref: 'Story' } })
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function (next) {
  // only hash the password if it has been modified (or is new)
  if (this.isModified('password')) return next();

  // generate a salt
  bcrypt.genSalt(5, function (err, salt) {
    if (err) return next(err);

    // hash the password using our new salt
    bcrypt.hash(this.password, salt, function (err, hash) {
      if (err) return next(err);
      // override the cleartext password with the hashed one
      this.password = hash;
      next();
    });
  });
});
