import { Injectable } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  ConversationRole,
  ConverseCommand,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/common/config/env.config';

interface Message {
  role: 'user' | 'system' | 'assistant';
  content: { type: 'text' | 'image'; text: string };
}

interface BedrockRequestBody {
  max_tokens: number;
  temperature: number;
  top_p?: number;
  top_k?: number;
  messages: Message[];
  system?: string;
}

@Injectable()
export class BedRockService {
  private bedrockClient: BedrockRuntimeClient;

  constructor(private configService: ConfigService<EnvironmentVariables>) {
    this.bedrockClient = new BedrockRuntimeClient({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY'),
        secretAccessKey: this.configService.get('AWS_SECRET_KEY'),
      },
    });
  }

  // Add methods to interact with Bedrock as needed
  // Add a method to invoke a Bedrock model
  public invokeChatModel = async (
    messages: Message[],
    modelId: string = 'openai.gpt-oss-20b-1:0',
    maxTokens = 1024,
    temperature = 1.0,
  ) => {
    const requestBody: BedrockRequestBody = {
      max_tokens: maxTokens,
      temperature,
      messages: messages,
    };
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });
    try {
      const response = await this.bedrockClient.send(command);
      return response;
    } catch (error) {
      console.error('Error invoking Bedrock model:', error);
    }
  };

  public invokeConverseModel = async (
    messages: {
      role: ConversationRole;
      content: { text: string }[];
    }[],
    modelId = 'amazon.nova-micro-v1:0',
  ) => {
    const command = new ConverseCommand({
      modelId,
      messages,
      inferenceConfig: {
        maxTokens: 1024,
        temperature: 1.0,
      },
    });
    try {
      const response = await this.bedrockClient.send(command);
      return response.output.message.content[0].text;
    } catch (error) {
      console.error('Error invoking Bedrock converse model:', error);
    }
  };

  public invokeEmbeddingModel = async (text: string) => {
    const modelId = 'amazon.titan-embed-text-v2:0';
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify({ inputText: text }),
    });
    try {
      // Invoke the model with the request.
      const response = await this.bedrockClient.send(command);

      // Decode the model's native response body.
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract the generated embedding and the input text token count.
      const embedding = responseBody.embedding;
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
    }
  };
}
