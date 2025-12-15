import path from 'path';
import fs from 'fs';
import { rm } from 'fs/promises';

const execute = async () => {
  const distDirectory = path.join(__dirname, '..', 'dist');
  const exists = fs.existsSync(distDirectory);
  if (exists) {
    await rm(distDirectory, { recursive: true });
  }
};

execute();
