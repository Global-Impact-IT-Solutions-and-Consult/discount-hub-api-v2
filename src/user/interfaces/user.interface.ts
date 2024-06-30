import * as mongoose from 'mongoose';

export interface User extends mongoose.Document {
  username: string;
  email: string;
  readonly createdAt: Date;
  updatedAt: Date;
}
