import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import puppeteer from 'puppeteer';
import { CompanyDocument } from 'src/company/schemas/company.schema';

@Injectable()
export class JumiaScraper {
  @OnEvent('scrape.jumia_')
  async scrapeJumia(payload: CompanyDocument) {
    console.log('Starting Jumia scraping...');
    const browser = await puppeteer.launch({ headless: true });

    try {
      const page = await browser.newPage();
      const results = {}; // Object to store results by category name

      for (const url of payload.urls) {
        console.log(`Scraping URL: ${url}`);
        let currentPageUrl = url;

        while (currentPageUrl) {
          console.log(`Scraping URL: ${currentPageUrl}`);

          try {
            await page.goto(currentPageUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 30000,
            });

            // Wait for the main section to load and handle if the selector is not found
            await page
              .waitForSelector('section.card.-fh', { timeout: 10000 })
              .catch(() => {
                console.error(
                  `Selector 'section.card.-fh' not found at URL ${currentPageUrl}. Skipping to next link.`,
                );
                currentPageUrl = null; // Exit pagination loop for this URL
                return;
              });

            // Extract the category heading
            const categoryHeading = await page.evaluate(() => {
              const header = document.querySelector('section.card.-fh header');
              const heading = header
                ?.querySelector('div h1')
                ?.textContent.trim();
              return heading || 'Unknown Category'; // Default value if not found
            });

            // Extract the products from article elements, filtering out articles without a discount
            const products = await page.evaluate(() => {
              const productElements = Array.from(
                document.querySelectorAll('section.card.-fh div > article'),
              );
              return productElements
                .map((article) => {
                  const anchor = article.querySelector('a.core');
                  if (!anchor) return null; // Skip if anchor is not found

                  // Extract discount to decide whether to include this product
                  const discount = anchor
                    .querySelector('div.s-prc-w div.bdg._dsct._sm')
                    ?.textContent.trim();
                  if (!discount) return null; // Skip products without a discount

                  // Extracting data from within the anchor element.
                  const link =
                    'https://www.jumia.com.ng/' +
                    (anchor.getAttribute('href') || ''); // Prepend base URL
                  const image =
                    anchor
                      .querySelector('div.img-c img')
                      ?.getAttribute('data-src') || 'No image';
                  const name =
                    anchor
                      .querySelector('div.info h3.name')
                      ?.textContent.trim() || 'No name';
                  const discountPrice =
                    anchor
                      .querySelector('div.info div.prc')
                      ?.textContent.trim() || 'No price';

                  // Extract old price
                  const price =
                    anchor
                      .querySelector('div.s-prc-w div.old')
                      ?.textContent.trim() || 'No old price';

                  // Extract rating
                  const rating =
                    anchor
                      .querySelector('div.info div.rev')
                      ?.textContent.trim() || 'No rating';

                  // Extract store from the SVG
                  const store =
                    anchor
                      .querySelector('svg use')
                      ?.getAttribute('xlink:href') || 'No store';

                  return {
                    link,
                    image,
                    name,
                    discountPrice,
                    price,
                    discount,
                    rating,
                    store,
                  };
                })
                .filter((product) => product !== null); // Filter out null values
            });

            // Merge products into the same category array
            if (!results[categoryHeading]) {
              results[categoryHeading] = []; // Initialize category array if it doesn't exist
            }
            results[categoryHeading].push(...products); // Add products to the existing category array

            // Find the URL for the next page and append it correctly
            const nextPageRelativeUrl = await page.evaluate(() => {
              const nextPageAnchor = document.querySelector(
                'section.card.-fh div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
              );
              return nextPageAnchor
                ? nextPageAnchor.getAttribute('href')
                : null;
            });

            // Update the current page URL by appending the relative path to the base URL
            currentPageUrl = nextPageRelativeUrl
              ? new URL(nextPageRelativeUrl, 'https://www.jumia.com.ng').href
              : null;
          } catch (scrapeError) {
            console.error(`Error scraping URL ${currentPageUrl}:`, scrapeError);
            break; // Exit pagination loop if there's an issue on the page
          }
        }
      }

      // Convert results object to an array of categories with their products
      const formattedResults = Object.entries(results).map(
        ([category, products]) => ({
          category,
          products,
        }),
      );

      console.log('Scraping completed. Results:', formattedResults);
      console.log(
        'Scraping completed. One Result: ',
        formattedResults?.[0]?.products?.[0],
      );
      return formattedResults; // Return the formatted results array
    } catch (error) {
      console.error('Error initializing Puppeteer:', error);
    } finally {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}
