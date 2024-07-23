import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { CloudinaryFoldersEnum } from 'src/utils/constants';
import * as toStream from 'buffer-to-stream';
import { EnvironmentVariables } from 'src/common/config/env.config';

@Injectable()
export class CloudinaryService {
  private logger = new Logger(CloudinaryService.name);
  constructor(private configService: ConfigService<EnvironmentVariables>) {
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_NAME'),
      api_key: configService.get('CLOUDINARY_API_KEY'),
      api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(file: Express.Multer.File, folder: CloudinaryFoldersEnum) {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: `cash-get-${folder}`,
        },
        (error, response) => {
          if (error) reject(error);
          return resolve(response);
        },
      );
      toStream(file.buffer).pipe(upload);
    })
      .then((response: UploadApiResponse) => {
        this.logger.log(
          `Buffer upload_stream wth promise success - ${response.public_id}`,
        );
        return response.url;
      })
      .catch((error: UploadApiErrorResponse) => {
        throw new InternalServerErrorException(error.message);
      });
  }
}
