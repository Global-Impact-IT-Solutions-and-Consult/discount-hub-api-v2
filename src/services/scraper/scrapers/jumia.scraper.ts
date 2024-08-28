import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import puppeteer from 'puppeteer';
import { CompanyDocument } from 'src/company/schemas/company.schema';

@Injectable()
export class JumiaScraper {
  @OnEvent('scrape.jumia')
  async scrapeJumia(payload: CompanyDocument) {
    console.log('scraping jumia');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    for (const url of payload.urls) {
      console.log(url);
      // check if paginated
      await page.goto(url);
      const element = await page.waitForSelector('.header');

      const d = await page.evaluate(() => {
        return document.querySelector('.header');
      });
      console.log(element);
      const divSelector = '.header';
      console.log(await page.$(divSelector));
      const divExists = (await page.$(divSelector)) !== null;
      // if it is then run check and change pagination else  just fetch data
      console.log(divExists);
      // if (divExists) {
      //   let pageNum = 1;
      //   let isLastPage = false;
      //   while (!isLastPage) {
      //     await page.goto(`${url}?page=${pageNum}`);
      //     // Extract the data from the current page

      //     // Check if there's a next page
      //     isLastPage = await page.evaluate(() => {
      //       // Adjust the condition to check for the presence of the "next" button or link
      //       const nextButton = document.querySelector(
      //         '[aria-label="Next Page"]',
      //       ); // Replace with an appropriate selector for the "next" button
      //       return !nextButton;
      //     });
      //     pageNum++;
      //     console.log(pageNum);
      //   }
      // } else {
      // }

      // Open a new page

      // await page.waitForSelector('h1');
    }
  }
}
