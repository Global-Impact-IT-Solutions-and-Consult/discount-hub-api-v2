import * as mongoose from 'mongoose';

export interface User extends mongoose.Document {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  isEmailVerified: boolean;
  confirmEmailToken: string;
  changePasswordToken: string;
  readonly confirmEmailTTL: Date;
  readonly changePasswordTokenTTL: Date;
  readonly createdAt: Date;
  updatedAt: Date;
}
