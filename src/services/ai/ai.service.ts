/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGroq } from '@langchain/groq';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { ProductDocument } from 'src/product/schemas/product.schema';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { createRetrieverTool } from 'langchain/tools/retriever';
import { createHistoryAwareRetriever } from 'langchain/chains/history_aware_retriever';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
// import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { PromptTemplate } from '@langchain/core/prompts';
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import { BufferMemory } from 'langchain/memory';
// import { MemorySaver } from '@langchain/langgraph';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { MemorySaver } from '@langchain/langgraph';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import {} from 'langchain/chains';
import { Collection } from 'mongoose';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { EmbeddingsInterface } from '@langchain/core/embeddings';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { Subject } from 'rxjs';

@Injectable()
export class AiService {
  embeddings: EmbeddingsInterface;
  constructor(private configService: ConfigService) {
    this.embeddings = new OllamaEmbeddings({ model: 'nomic-embed-text' });
  }

  async categorizeProducts(input: {
    categories: string[];
    // brands: string[];
    product: string;
  }): Promise<any> {
    try {
      const llm = new ChatOllama({
        baseUrl: this.configService.get('AI_URL'), // Default Ollama URL
        temperature: 0,
        model: this.configService.get('AI_MODEL') || 'llama3.2',
      });

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
        new SystemMessage(
          'You are an AI trained to categorize products into a list of given categories and assign a brand from the product name. Always prioritize existing categories unless there is absolutely no match. Return only a JSON response.',
        ),
        new HumanMessage(prompt),
      ];

      const response = await llm.invoke(messages);

      const formattedResponse = JSON.parse(
        response.content.toString().replace(/(\r\n|\n|\r)/gm, ''),
      );

      // Validate AI response
      if (
        !formattedResponse.categories ||
        !Array.isArray(formattedResponse.categories) ||
        !formattedResponse.brand
      ) {
        console.error(
          'Invalid AI response format:',
          response.content.toString(),
        );
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

    // try {
    //   // const openai = new OpenAI({
    //   //   apiKey: this.configService.get('AI_API_KEY'),
    //   //   baseURL: this.configService.get('AI_URL'),
    //   // });

    //   const groq = new Groq({ apiKey: this.configService.get('AI_API_KEY') });

    //   // Convert the input object into a string format suitable for the AI model
    //   // const { categories, brands, product } = input;
    //   const { categories, product } = input;

    //   // const prompt = `
    //   //   You are an AI model trained to categorize a product based on given categories and also suggest a brand from the product name.
    //   //   Categories: ${categories.join(', ')}
    //   //   Product: ${product}
    //   //   decide which categories and brand the product falls under and return the product categorized under the given categories and brand in this format:
    //   //   {
    //   //     "categories": ["Category1", "Category2", ...],
    //   //     "brand": "Brand"
    //   //   }
    //   //   Do not include any other explanations. suggest new categories and the brand for products that do not fit into any of the given categories and assign the products to them appropraitely but still under the categories key though. Only suggest new categories strictly when they there is no matching category.
    //   // `;

    //   // const chatCompletion = await groq.chat.completions.create({
    //   //   // const chatCompletion = await openai.chat.completions.create({
    //   //   // model: 'mistralai/Mistral-7B-Instruct-v0.2',
    //   //   model: 'llama3-8b-8192',
    //   //   messages: [
    //   //     {
    //   //       role: 'system',
    //   //       content:
    //   //         'You are an AI model trained to categorize products into provided categories and assign brands.',
    //   //     },
    //   //     {
    //   //       role: 'user',
    //   //       content: prompt,
    //   //     },
    //   //   ],
    //   //   temperature: 0.7,
    //   //   max_tokens: 512, // Increased token limit to handle more complex responses
    //   // });

    //   const prompt = `
    //     You are an AI model trained to classify products into existing categories and suggest a brand from the product name.
    //     Categories: ${categories.join(', ')}
    //     Product: ${product}

    //     Your task is to:
    //     1. Assign the product to the most relevant categories from the given list. Select as few categories as necessary.
    //     2. Suggest a brand based on the product name.
    //     3. Only create a new category if there is no close match among the existing categories.

    //     Return the result in the following format:
    //     {
    //       "categories": ["Category1", "Category2"],
    //       "brand": "Brand"
    //     }
    //     Do not provide any additional explanations or outputs beyond the specified format.
    //   `;

    //   const chatCompletion = await groq.chat.completions.create({
    //     model: 'llama3-8b-8192', // Ensure your model choice is appropriate for the task
    //     messages: [
    //       {
    //         role: 'system',
    //         content:
    //           'You are an AI trained to categorize products into a list of given categories and assign a brand from the product name. Always prioritize existing categories unless there is absolutely no match. Return only a JSON response.',
    //       },
    //       {
    //         role: 'user',
    //         content: prompt,
    //       },
    //     ],
    //     temperature: 0.6, // Adjusted for better consistency
    //     max_tokens: 512, // Keep an eye on prompt length to avoid truncation
    //   });

    //   const aiResponse = chatCompletion.choices[0].message.content.trim();
    //   console.log(
    //     '🚀 ~ AiService ~ categorizeProducts ~ aiResponse:',
    //     aiResponse,
    //   );

    //   // Parse the AI response into a JavaScript object
    //   const formattedResponse = JSON.parse(
    //     aiResponse.replace(/(\r\n|\n|\r)/gm, ''),
    //   );

    //   console.log('Categorized Products:', formattedResponse);
    //   return formattedResponse;
    // } catch (error) {
    //   console.error('Error communicating with AIML API', error);
    //   if (error.response) {
    //     console.error('Response data:', error.response.data);
    //     console.error('Response status:', error.response.status);
    //     console.error('Response headers:', error.response.headers);
    //   } else if (error.request) {
    //     console.error('Request data:', error.request);
    //   } else {
    //     console.error('Error message:', error.message);
    //   }
    //   throw new Error('Failed to categorize products');
    // }
  }

  async handleQuery(
    query: string,
    chatId: string,
    collection: Collection,
    products: ProductDocument[],
  ) {
    // const memory = new MongoDBChatMessageHistory({
    //   collection,
    //   sessionId: chatId,
    // });

    // const subject = new Subject<string>();

    try {
      const llm = new ChatOllama({
        baseUrl: this.configService.get('AI_URL'), // Default Ollama URL
        temperature: 0.7,
        model: this.configService.get('AI_MODEL') || 'llama3.2',
      });

      const product_texts: string[] = [];

      products.map((product) =>
        product_texts.push(this.convertToProductText(product)),
      );

      const text_splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });

      const product_chunks = await text_splitter.splitText(
        product_texts.join('\n'),
      );

      const productVectorStore = await FaissStore.fromTexts(
        product_chunks,
        {},
        this.embeddings,
      );

      const productRetriever = productVectorStore.asRetriever();

      // Contextualize question
      const contextualizeQSystemPrompt2 =
        'Given a chat history and the latest user question ' +
        'which might reference context in the chat history, ' +
        'formulate a standalone question which can be understood ' +
        'without the chat history. Do NOT answer the question, ' +
        'just reformulate it if needed and otherwise return it as is.';

      const contextualizeQPrompt2 = ChatPromptTemplate.fromMessages([
        ['system', contextualizeQSystemPrompt2],
        new MessagesPlaceholder('chat_history'),
        ['human', '{input}'],
      ]);

      const historyAwareRetriever2 = await createHistoryAwareRetriever({
        llm: llm,
        retriever: productRetriever,
        rephrasePrompt: contextualizeQPrompt2,
      });

      // Answer question
      const systemPrompt2 =
        'You are an assistant for question-answering tasks. ' +
        'Use the following pieces of retrieved context to answer ' +
        "the question. If you don't know the answer, say that you " +
        "don't know." +
        '\n\n' +
        '{context}';

      const qaPrompt2 = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt2],
        new MessagesPlaceholder('chat_history'),
        ['human', '{input}'],
      ]);

      const questionAnswerChain3 = await createStuffDocumentsChain({
        llm: llm,
        prompt: qaPrompt2,
      });

      const ragChain3 = await createRetrievalChain({
        retriever: historyAwareRetriever2,
        combineDocsChain: questionAnswerChain3,
      });

      const conversationalRagChain2 = new RunnableWithMessageHistory({
        runnable: ragChain3,
        getMessageHistory: (sessionId) =>
          new MongoDBChatMessageHistory({
            collection,
            sessionId,
          }),
        inputMessagesKey: 'input',
        historyMessagesKey: 'chat_history',
        outputMessagesKey: 'answer',
      });

      // Example usage

      // for await (const s of await conversationalRagChain2.stream(
      //   { input: query },
      //   { configurable: { sessionId: chatId } },
      // )) {
      //   console.log(s);
      //   subject.next(s.answer);
      //   console.log('----');
      // }

      // const messageHistory = conversationalRagChain2.getMessageHistory();
      // console.log(messageHistory);

      // async function getSessionHistory2(sessionId: string) {
      //   const sessionHistory = await memory.(sessionId);
      //   if (!sessionHistory) {
      //     await memory.saveMessages(sessionId, []); // Create an empty history if none exists
      //   }
      //   return sessionHistory;
      // }
      // subject.complete();
    } catch (error) {
      console.error('Error handling query:', error);
      throw new Error('Failed to handle query');
    }
  }

  private convertToProductText = (product: ProductDocument) => {
    return `
        ID: ${product._id},
        Name: ${product.name},
        Price: ${product.price},
        Discount: ${product.discountPrice},
        rating: ${product.rating},
        specifications: ${product.specifications},
        Key Features: ${product.keyFeatures},
        Store: ${product.store.name},
        Description: ${product.description},
        Tags: ${product.tags.map((tag, index) => `${index}-${tag.name}`)},
        Brand: ${
          //product?.brand?.name ||
          ''
        }
        Categories: ${product.categories.map((category, index) => `${index}-${category.name}`)}
        `;
  };

  async testChat({ chat }: { chat: string }) {
    const llm = new ChatOllama({
      baseUrl: this.configService.get('AI_URL'), // Default Ollama URL
      temperature: 0.7,
      model: this.configService.get('AI_MODEL') || 'llama3.2',
    });

    const embeddings = new OllamaEmbeddings({ model: 'nomic-embed-text' });

    const vectorStore = new FaissStore(embeddings, {});

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }
}
