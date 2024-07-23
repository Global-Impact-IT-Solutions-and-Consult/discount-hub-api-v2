import { Schema } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from '../interfaces/user.interface';
import { UserRoles } from 'src/common/constants/enum';
import * as bcrypt from 'bcryptjs';

function transformValue(doc, ret: { [key: string]: any }) {
  delete ret._id;
}

export const UserSchema: Schema = new Schema<User>(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: [true, 'Email can not be empty'],
      match: [
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Email should be valid',
      ],
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: UserRoles,
      required: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    confirmEmailToken: {
      type: String,
      required: false,
    },
    changePasswordToken: {
      type: String,
      required: false,
    },
    confirmEmailTTL: {
      type: Date,
      required: false,
    },
    changePasswordTokenTTL: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: transformValue,
    },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: transformValue,
    },
  },
);

UserSchema.methods.compareEncryptedPassword = function (
  password: string,
  hashPassword: string,
) {
  return bcrypt.compare(password, hashPassword);
};

export const UserModel = mongoose.model<User>('User', UserSchema);
