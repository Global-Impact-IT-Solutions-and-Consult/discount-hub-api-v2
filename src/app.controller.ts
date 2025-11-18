import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('test-ai')
  async testAIIntegration(@Body() body: { prompt: string }) {
    const response = await this.appService.testAIIntegration(body.prompt);
    return response;
  }

  @Get('test-scraper')
  async testJumiaScraper() {
    const response = await this.appService.testScraper();
    return response;
  }
}
