import { Schema } from 'mongoose';
import * as mongoose from 'mongoose';
import { Error } from '../interfaces/error.interface';

function transformValue(doc, ret: { [key: string]: any }) {
  delete ret._id;
}

export const ErrorSchema: Schema = new Schema<Error>(
  {
    message: {
      type: String,
      required: true,
    },
    statusCode: {
        type: Number,
        required: true,
    },
    path: {
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
export const ErrorModel = mongoose.model<Error>('Error', ErrorSchema);
