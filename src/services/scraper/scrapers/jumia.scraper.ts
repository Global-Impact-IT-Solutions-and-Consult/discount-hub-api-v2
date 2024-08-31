import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import puppeteer from 'puppeteer';
import { CompanyDocument } from 'src/company/schemas/company.schema';

@Injectable()
export class JumiaScraper {
  @OnEvent('scrape.jumia_')
  async scrapeJumia(payload: CompanyDocument) {
    console.log('Starting Jumia scraping...');
    const browser = await puppeteer.launch({ headless: true }); // Use headless mode for performance

    try {
      const page = await browser.newPage();

      for (const url of payload.urls) {
        console.log(`Scraping URL: ${url}`);

        try {
          // Go to the URL with a timeout for page loading
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });

          // Check if the selector '.header' is present
          const headerElement = await page.$('.header');
          if (headerElement) {
            // Extract the text content of the header element
            const headerText = await page.evaluate(
              (el) => el.textContent,
              headerElement,
            );
            console.log('Header element text:', headerText);

            // You can continue to extract other data as needed
            // Example: extracting all product titles from a hypothetical '.product-title' selector
            const productTitles = await page.evaluate(() =>
              Array.from(
                document.querySelectorAll('.product-title'),
                (element) => element.textContent.trim(),
              ),
            );
            console.log('Extracted product titles:', productTitles);

            // Handle pagination if needed
            let pageNum = 1;
            let isLastPage = false;

            while (!isLastPage) {
              console.log(`Scraping page ${pageNum} of URL: ${url}`);
              await page.goto(`${url}?page=${pageNum}`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
              });

              // Perform your data extraction logic here

              // Check if there's a next page
              isLastPage = await page.evaluate(() => {
                const nextButton = document.querySelector(
                  '[aria-label="Next Page"]',
                ); // Adjust selector as needed
                return !nextButton; // If no next button, it's the last page
              });

              pageNum++;
            }
          } else {
            console.log('Header element not found; skipping pagination.');
            // You might want to handle the non-paginated data extraction here
          }
        } catch (urlError) {
          console.error(`Error scraping URL ${url}:`, urlError);
        }
      }
    } catch (error) {
      console.error('Error initializing Puppeteer:', error);
    } finally {
      await browser.close(); // Ensure the browser is closed even if an error occurs
      console.log('Browser closed.');
    }
  }
}
