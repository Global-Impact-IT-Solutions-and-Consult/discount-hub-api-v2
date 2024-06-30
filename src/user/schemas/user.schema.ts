import { Schema } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from '../interfaces/user.interface';

function transformValue(doc, ret: { [key: string]: any }) {
  delete ret._id;
}

export const UserSchema: Schema = new Schema<User>(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
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
export const UserModel = mongoose.model<User>('User', UserSchema);
