import { Injectable } from '@nestjs/common';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/common/config/env.config';

@Injectable()
export class LambdaService {
  private calls = 0;
  private lambdaClient: LambdaClient;

  constructor(private configService: ConfigService<EnvironmentVariables>) {
    this.lambdaClient = new LambdaClient({
      region: this.configService.get('AWS_REGION')!,
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY')!,
        secretAccessKey: this.configService.get('AWS_SECRET_KEY')!,
      },
    });
  }

  public callFunction = async (
    functionName: string,
    payload: Record<string, any>,
  ) => {
    const params = {
      FunctionName: functionName,
      Payload: JSON.stringify(payload),
    };
    try {
      const command = new InvokeCommand(params);
      const response = await this.lambdaClient.send(command);
      const payload = JSON.parse(new TextDecoder().decode(response.Payload));
      this.calls++;
      console.log(`Lambda function ${functionName} called ${this.calls} times`);
      return JSON.parse(payload.body);
    } catch (error) {
      console.error('Error invoking Lambda:', error);
      throw new Error(`${error}`);
    }
  };
}
