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
      const decodedPayload = new TextDecoder().decode(response.Payload);
      const parsedPayload = JSON.parse(decodedPayload);
      this.calls++;
      console.log(`Lambda function ${functionName} called ${this.calls} times`);

      // Check for Lambda errors
      if (response.FunctionError) {
        const errorMessage =
          parsedPayload.errorMessage ||
          parsedPayload.errorType ||
          'Unknown Lambda error';
        throw new Error(`Lambda error: ${errorMessage}`);
      }

      // Handle different response formats
      if (parsedPayload.body) {
        return typeof parsedPayload.body === 'string'
          ? JSON.parse(parsedPayload.body)
          : parsedPayload.body;
      } else if (parsedPayload.errorMessage) {
        throw new Error(`Lambda error: ${parsedPayload.errorMessage}`);
      } else {
        // If no body, return the payload directly (might already be parsed)
        return parsedPayload;
      }
    } catch (error) {
      console.error('Error invoking Lambda:', error);

      // Check if it's a timeout error
      if (error.message && error.message.includes('timed out')) {
        throw new Error(
          `Lambda function "${functionName}" timed out after 120 seconds. ` +
            `Please increase the Lambda timeout in AWS Console (max 900 seconds) or optimize the Lambda function.`,
        );
      }

      throw error;
    }
  };
}
