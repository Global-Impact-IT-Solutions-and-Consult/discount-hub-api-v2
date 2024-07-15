/* eslint-disable @typescript-eslint/no-this-alias */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserDocument } from 'src/user/schemas/user.schema';
import { AppNotificationEnum } from 'src/utils/constants';

export type AppNotificationDocument = HydratedDocument<AppNotification>;

@Schema({
  timestamps: true,
})
export class AppNotification {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: UserDocument;

  @Prop({
    required: true,
  })
  summary: string;

  @Prop({ required: true })
  notificationType: string;

  @Prop()
  notificationRef: string;

  @Prop({
    default: AppNotificationEnum.CREATED,
  })
  status: AppNotificationEnum;

  @Prop({ type: Object })
  data: any;
}

export const AppNotificationSchema =
  SchemaFactory.createForClass(AppNotification);
