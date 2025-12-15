/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { MessageDocument } from 'src/chat/schemas/chat-message.schema';
import { MessageTypeEnum } from 'src/utils/constants';
import { BedRockService } from '../aws/bedrock.service';
import { ConversationRole } from '@aws-sdk/client-bedrock-runtime';

@Injectable()
export class AiService {
  constructor(
    private BedrockService: BedRockService,
    private configService: ConfigService,
  ) {}

  async categorizeProducts(input: {
    categories: string[];
    // brands: string[];
    product: string;
  }): Promise<any> {
    try {
      const { categories, product } = input;
      const prompt = `
        You are an AI model trained to classify products into existing categories and suggest a brand from the product name.
        Categories: ${categories.join(', ')}
        Product: ${product}

        Your task is to:
        1. Assign the product to the most relevant categories from the given list. Select as few categories as necessary.
        2. Suggest a brand based on the product name.
        3. Only create a new category if there is no close match among the existing categories.

        Return the result in the following format:
        {
          "categories": ["Category1", "Category2"],
          "brand": "Brand"
        }
        Do not provide any additional explanations or outputs beyond the specified format.
      `;

      const messages = [
        {
          role: ConversationRole.USER,
          content: [
            {
              text: 'You are an AI trained to categorize products into a list of given categories and assign a brand from the product name. Always prioritize existing categories unless there is absolutely no match. Return only a JSON response.',
            },
          ],
        },
        {
          role: ConversationRole.USER,
          content: [
            {
              text: prompt,
            },
          ],
        },
      ];

      const response = await this.BedrockService.invokeConverseModel(messages);
      const formattedResponse = JSON.parse(
        response?.replace(/(\r\n|\n|\r)/gm, ''),
      );

      // Validate AI response
      if (
        !formattedResponse.categories ||
        !Array.isArray(formattedResponse.categories) ||
        !formattedResponse.brand
      ) {
        console.error('Invalid AI response format:', response.toString());
        throw new Error('AI response is missing required fields');
      }

      // Normalize categories
      formattedResponse.categories = formattedResponse.categories.map(
        (category) => category.trim().toLowerCase(),
      );

      console.log('Categorized Products:', formattedResponse);
      return formattedResponse;
    } catch (error) {
      console.error('Error communicating with AI API', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Request data:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      throw new Error('Failed to categorize products');
    }
  }

  async handleQuery(
    messages: MessageDocument[],
    productsText: string[],
    message: string,
  ) {
    try {
      const llm = new ChatOllama({
        baseUrl: this.configService.get('AI_URL'), // Default Ollama URL
        temperature: 0.7,
        model: this.configService.get('AI_MODEL') || 'llama3.2',
      });

      const chatMessages = messages.map((msg) => {
        if (msg.type === MessageTypeEnum.USER) {
          return new HumanMessage(msg.content);
        } else if (msg.type === MessageTypeEnum.SYSTEM) {
          return new SystemMessage(msg.content);
        } else if (msg.type === MessageTypeEnum.AI) {
          // For assistant messages, we'll use HumanMessage with a prefix
          return new AIMessage(msg.content);
        }
      });

      const response = await llm.invoke(chatMessages);
      return response;
    } catch (error) {
      console.error('Error handling query:', error);
      throw new Error('Failed to handle query');
    }
  }
}
