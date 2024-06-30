import * as mongoose from 'mongoose';

export interface Error extends mongoose.Document {
  message: string;
  path: string;
  statusCode: number;
  readonly createdAt: Date;
}