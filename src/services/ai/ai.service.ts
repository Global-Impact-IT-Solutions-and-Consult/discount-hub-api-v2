import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { OpenAI } from 'openai';
import { Groq } from 'groq-sdk';
import { ChatGroq } from '@langchain/groq';
import { OllamaEmbeddings } from '@langchain/ollama';
import { ProductDocument } from 'src/product/schemas/product.schema';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { createRetrieverTool } from 'langchain/tools/retriever';
import { ChatPromptTemplate } from '@langchain/core/prompts';
// import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { PromptTemplate } from '@langchain/core/prompts';
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import { BufferMemory } from 'langchain/memory';
import { MemorySaver } from '@langchain/langgraph';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import {} from 'langchain/chains';
import { Collection } from 'mongoose';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

@Injectable()
export class AiService {
  constructor(private configService: ConfigService) {}

  async categorizeProducts(input: {
    categories: string[];
    // brands: string[];
    product: string;
  }): Promise<any> {
    try {
      // const openai = new OpenAI({
      //   apiKey: this.configService.get('AI_API_KEY'),
      //   baseURL: this.configService.get('AI_URL'),
      // });

      const groq = new Groq({ apiKey: this.configService.get('AI_API_KEY') });

      // Convert the input object into a string format suitable for the AI model
      // const { categories, brands, product } = input;
      const { categories, product } = input;

      const prompt = `
        You are an AI model trained to categorize a product based on given categories and also suggest a brand from the product name.
        Categories: ${categories.join(', ')}
        Product: ${product}
        decide which categories and brand the product falls under and return the product categorized under the given categories and brand in this format:
        {
          "categories": ["Category1", "Category2", ...],
          "brand": "Brand"
        }
        Do not include any other explanations. suggest new categories and the brand for products that do not fit into any of the given categories and assign the products to them appropraitely but still under the categories key though.
      `;

      // const prompt = `
      //   You are an AI model trained to categorize a product based on given categories and brands.
      //   Categories: ${categories.join(', ')}
      //   Brands: ${brands.join(', ')}
      //   Product: ${product}
      //   decide which categories and brands the product falls under and return the product categorized under the given categories and brands in this format:
      //   {
      //     "categories": ["Category1", "Category2", ...],
      //     "brands": ["Brand1", "Brand2", ... ]
      //   }
      //   Do not include any other explanations. suggest new categories for products that do not fit into any of the given categories and assign the products to them appropraitely but still under the categories key though.
      // `;

      const chatCompletion = await groq.chat.completions.create({
        // const chatCompletion = await openai.chat.completions.create({
        // model: 'mistralai/Mistral-7B-Instruct-v0.2',
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content:
              'You are an AI model trained to categorize products into provided categories and brands.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 512, // Increased token limit to handle more complex responses
      });

      const aiResponse = chatCompletion.choices[0].message.content.trim();
      console.log(
        '🚀 ~ AiService ~ categorizeProducts ~ aiResponse:',
        aiResponse,
      );

      // Parse the AI response into a JavaScript object
      const formattedResponse = JSON.parse(
        aiResponse.replace(/(\r\n|\n|\r)/gm, ''),
      );

      console.log('Categorized Products:', formattedResponse);
      return formattedResponse;
    } catch (error) {
      console.error('Error communicating with AIML API', error);
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
    query: string,
    chatId: string,
    collection: Collection,
    products: ProductDocument[],
  ) {
    const memory = new Mon();
    try {
      console.log(products);
      const llm = new ChatGroq({
        // model: "mixtral-8x7b-32768",
        model: 'llama3-70b-8192',
        temperature: 0,
        apiKey: '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',
      });
      const embeddings = new OllamaEmbeddings({ model: 'nomic-embed-text' });
      const product_texts: string[] = [];

      const convertToProductText = (product: ProductDocument) => {
        return `
        ID: ${product._id}, 
        Name: ${product.name}, 
        Price: ${product.price},
        Discount: ${product.discountPrice},
        rating: ${product.rating},
        specifications: ${product.specifications},
        Key Features: ${product.keyFeatures},
        Store: ${product.store},
        Description: ${product.description},
        Tags: ${product.tags.map((tag, index) => `${index}-${tag.name}`)},
        Brand: ${product?.brand?.name || ''} 
        Categories: ${product.categories.map((category, index) => `${index}-${category.name}`)}
        `;
      };
      products.map((product) =>
        product_texts.push(convertToProductText(product)),
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
        embeddings,
      );

      const productRetriever = productVectorStore.asRetriever();

      // const questionAnswerChain = await createStuffDocumentsChain({
      //   llm,
      //   prompt,
      // });

      // const ragChain = await createRetrievalChain({
      //   retriever,
      //   combineDocsChain: questionAnswerChain,
      // });

      const tool = createRetrieverTool(productRetriever, {
        name: 'product_retriever',
        description: 'Searches and returns relevant products.',
      });
      const tools = [tool];

      const agentExecutor = createReactAgent({
        llm,
        tools,
        checkpointSaver: memory,
      });

      // return await tool.invoke({ query: 'fridges' });
      // const chatHistory = [
      //   new SystemMessage({
      //     content: `
      //       You are a requst processing engine,
      //       Our customers would make requests about products that they want to get and you ar return your recomendation and a list of the products you recommend to the user,
      //       if you determine that the user did not make a request please prompt the user to make a request
      //     `,
      //   }),
      // ];

      // const systemPrompt =
      //   'You are an assistant for question-answering tasks. ' +
      //   'Use the following pieces of retrieved context to answer ' +
      //   "the question. If you don't know the answer, say that you " +
      //   "don't know. Use three sentences maximum and keep the " +
      //   'answer concise.' +
      //   '\n\n' +
      //   '{context}';

      // const prompt = ChatPromptTemplate.fromMessages([
      //   ['system', systemPrompt],
      //   ['human', '{input}'],
      // ]);

      // const questionAnswerChain = await createStuffDocumentsChain({
      //   llm,
      //   prompt,
      // });

      // const ragChain = await createRetrievalChain({
      //   retriever: productRetriever,
      //   combineDocsChain: questionAnswerChain,
      // });

      // const response = await ragChain.invoke({
      //   input: query,
      // });

      // return response.answer;

      // const prompt = PromptTemplate.fromTemplate(
      //   `You are a rqust processing engine,
      //       Our customers would make requests about products that they want to get and you ar return your recomendation and a list of the products you recommend to the user,
      //       if you determine that the user did not make a request please prompt the user to make a request`,

      // );

      // const ragChain =
    } catch (error) {
      console.log(error);
    }
  }
}
