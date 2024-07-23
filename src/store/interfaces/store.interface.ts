import * as mongoose from 'mongoose';

export interface Store extends mongoose.Document {
  name: string;
  slug: string;
  logo: string;
  admin: string;
  website: string;
  url: string[];
  products: string[];
}
