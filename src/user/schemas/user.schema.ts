import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Role } from '../role/schemas/role.schema';
import { Exclude, instanceToPlain } from 'class-transformer';

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

  @Exclude({ toPlainOnly: true })
  @Prop()
  confirmEmailToken: string;

  @Exclude({ toPlainOnly: true })
  @Prop()
  confirmEmailTTL: Date;

  @Exclude({ toPlainOnly: true })
  @Prop()
  changePasswordToken: string;

  @Exclude({ toPlainOnly: true })
  @Prop()
  changePasswordTokenTTL: Date;

  @Prop({ type: { type: Types.ObjectId, ref: 'Story' } })
  role: Role;

  comparePassword: (password) => Promise<boolean>;

  toJSON() {
    return instanceToPlain(this);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.methods.comparePassword = async function (password) {
  const result = await bcrypt.compareSync(password, this.password);
  return result;
};

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

UserSchema.pre('updateOne', function (next) {
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
