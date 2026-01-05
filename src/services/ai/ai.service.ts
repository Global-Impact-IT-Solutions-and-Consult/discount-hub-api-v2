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
import { QueryTool } from './tools/query.tool';
import { FormatTool } from './tools/format.tool';

@Injectable()
export class AiService {
  constructor(
    private BedrockService: BedRockService,
    private configService: ConfigService,
    private queryTool: QueryTool,
    private formatTool: FormatTool,
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

  /**
   * Enhanced chatbot method that uses tools to query and format products
   * This method handles user queries about products using AI with tool calling
   */
  async handleChatbotQuery(
    messages: MessageDocument[],
    userQuery: string,
  ): Promise<any> {
    try {
      const llm = new ChatOllama({
        baseUrl: this.configService.get('AI_URL'),
        temperature: 0.7,
        model: this.configService.get('AI_MODEL') || 'llama3.2',
      });

      // Bind tools to the LLM
      // @ts-ignore - LangChain tool types are complex and cause TS2589
      const llmWithTools = llm.bindTools([
        this.queryTool.queryProductsTool,
        this.formatTool.formatProductCardTool,
      ]);

      // Build chat history
      const chatMessages = [
        new SystemMessage(
          `You are a helpful shopping assistant for a discount hub platform. Your role is to help users find products they're looking for.
          
          When users ask for products:
          1. Use the query_products tool to search for products with appropriate filters (brand, category, price range, etc.)
          2. After getting product results, use the format_product_card tool for each product ID to generate markdown cards
          3. Present the results in a friendly, conversational way with the markdown product cards
          4. For price-related queries like "cheap" or "affordable", use appropriate maxPrice filters
          5. Extract brand names and category names from user queries (e.g., "LG fridges" means brandName="LG", categoryName="Refrigerators")
          
          Example flow for "I need cheap LG fridges":
          - Use query_products with: brandName="LG", categoryName="Refrigerators", maxPrice=1000, sortBy="discountPrice", order="asc"
          - Format the top 3-5 results using format_product_card for each productId
          - Present with friendly text like "Here are some affordable LG refrigerators I found for you:"
          `,
        ),
        ...messages.map((msg) => {
          if (msg.type === MessageTypeEnum.USER) {
            return new HumanMessage(msg.content);
          } else if (msg.type === MessageTypeEnum.AI) {
            return new AIMessage(msg.content);
          }
        }),
        new HumanMessage(userQuery),
      ];

      // Invoke the LLM with tools
      let response = await llmWithTools.invoke(chatMessages);
      let iterations = 0;
      const maxIterations = 10;

      // Handle tool calls iteratively
      while (
        response.tool_calls &&
        response.tool_calls.length > 0 &&
        iterations < maxIterations
      ) {
        iterations++;

        // Execute all tool calls
        const toolMessages = [];
        for (const toolCall of response.tool_calls) {
          let toolResult;

          if (toolCall.name === 'query_products') {
            // @ts-ignore - Tool invoke method exists but TypeScript has type issues
            toolResult = await this.queryTool.queryProductsTool.invoke(
              toolCall.args,
            );
          } else if (toolCall.name === 'format_product_card') {
            // @ts-ignore - Tool invoke method exists but TypeScript has type issues
            toolResult = await this.formatTool.formatProductCardTool.invoke(
              toolCall.args,
            );
          }

          toolMessages.push({
            role: 'tool',
            content: toolResult,
            tool_call_id: toolCall.id,
          });
        }

        // Continue the conversation with tool results
        chatMessages.push(response);
        chatMessages.push(...(toolMessages as any));
        response = await llmWithTools.invoke(chatMessages);
      }

      return response;
    } catch (error) {
      console.error('Error handling chatbot query:', error);
      throw new Error('Failed to handle chatbot query');
    }
  }
}
