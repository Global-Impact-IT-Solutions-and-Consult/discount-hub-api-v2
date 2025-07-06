import { parentPort, workerData } from 'worker_threads';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { parsePrice } from 'src/utils/misc';

async function scrapePage(url) {
  let currentPageUrl = url;
  const fetchedProducts = [];
  console.log(`initial first products `, fetchedProducts);
  try {
    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch({
      headless: true,
      executablePath:
        '/Users/admin/.cache/puppeteer/chrome/mac_arm-135.0.7049.114/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      args: [
        '--no-sandbox',
        // '--disable-setuid-sandbox',
        // '--disable-dev-shm-usage',
        // '--disable-accelerated-2d-canvas',
        // '--no-first-run',
        // '--no-zygote',
        // '--single-process',
        // '--disable-gpu',
      ],
    });
    try {
      const page = await browser.newPage();
      while (currentPageUrl) {
        await page.goto(currentPageUrl, {
          waitUntil: 'load',
          timeout: 200000, // 30 seconds
        });
        console.log(currentPageUrl);
        await page
          .waitForSelector('section.card.-fh', { timeout: 10000 })
          .catch(() => {
            console.error(
              `Selector 'section.card.-fh' not found at URL ${currentPageUrl}. Skipping to next link.`,
            );
            currentPageUrl = null;
            return;
          });
        const productsDetails = await page.evaluate(() => {
          const productElements = Array.from(
            document.querySelectorAll('section.card div > article.prd'),
          );
          const productInfo = [];
          for (const article of productElements) {
            const anchor = article.querySelector('a.core');
            if (!anchor) continue;

            const discount = anchor
              .querySelector('div.s-prc-w div.bdg._dsct._sm')
              ?.textContent.trim();
            if (!discount) continue;

            const link =
              'https://www.jumia.com.ng/' + anchor.getAttribute('href');
            const image = anchor
              .querySelector('div.img-c img')
              ?.getAttribute('data-src');
            const name = anchor
              .querySelector('div.info h3.name')
              ?.textContent.trim();
            const discountPrice = anchor
              .querySelector('div.info div.prc')
              ?.textContent.trim();
            const price = anchor
              .querySelector('div.s-prc-w div.old')
              ?.textContent.trim();
            const reviewText = anchor
              .querySelector('div.info div.rev')
              ?.textContent.trim();

            productInfo.push({
              anchor,
              discount,
              link,
              image,
              name,
              discountPrice,
              price,
              reviewText,
            });
          }
          return productInfo;
        });
        for (const productDetail of productsDetails) {
          if (!productDetail) return;
          const productPage = await browser.newPage();
          try {
            await productPage.goto(productDetail.link, {
              waitUntil: 'load',
              timeout: 200000, // 30 seconds
            });
            const extraDetails = await productPage.evaluate(() => {
              //images
              const imageUrls = [];
              const imgElements =
                document.querySelectorAll('label.itm-sel._on'); // Target images with class '-fw _ni'
              imgElements.forEach((img) => {
                const element = img.querySelector('img.-fw._ni');
                const src = element.getAttribute('data-src');
                if (src) imageUrls.push(src);
              });

              //description
              const descriptionElement = document.querySelector(
                'div.markup.-mhm.-pvl.-oxa.-sc',
              );
              const description = descriptionElement
                ? descriptionElement.textContent.trim()
                : 'No description available';

              //key features
              const keyFeaturesElement =
                document.querySelector('div.markup.-pam');
              const keyFeatures = keyFeaturesElement
                ? keyFeaturesElement.textContent.trim()
                : 'No key features available';

              // specifications
              const specificationsElement = document.querySelector(
                'div.-pvs.-mvxs.-phm.-lsn',
              );
              const specifications = specificationsElement
                ? specificationsElement.textContent.trim()
                : 'No specifications available';

              return {
                description,
                imageUrls,
                keyFeatures,
                specifications,
              };
            });
            //trigger saveproduct job'
            const saveProductConsumerDto = {
              createProductDto: {
                discountPrice: parsePrice(productDetail.discountPrice),
                name: productDetail.name,
                price: parsePrice(productDetail.price),
                description: extraDetails.description,
                link: productDetail.link,
                keyFeatures: extraDetails.keyFeatures,
                image: productDetail.image,
                images: extraDetails.imageUrls,
              },
            };
            fetchedProducts.push(saveProductConsumerDto);
            // this.productService.saveProductJob(saveProductConsumerDto);
            if (!productPage.isClosed()) {
              await productPage.close();
            }
            // await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (error) {
            console.log({ error });
          } finally {
          }
        }

        //pagination
        const nextPageRelativeUrl = await page.evaluate(() => {
          const nextPageAnchor = document.querySelector(
            'section.card.-fh div.pg-w.-ptm.-pbxl a[aria-label="Next Page"]',
          );
          return nextPageAnchor ? nextPageAnchor.getAttribute('href') : null;
        });

        currentPageUrl = nextPageRelativeUrl
          ? new URL(nextPageRelativeUrl, 'https://www.jumia.com.ng').href
          : null;
      }
    } catch (error) {
      console.error({ error });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error({ error });
  }
  console.log(`final fetched products `, fetchedProducts);
  return fetchedProducts;
}

scrapePage(workerData.url)
  .then((result) => {
    // console.log({ result });
    parentPort.postMessage(result);
  })
  .catch((error) => {
    parentPort.postMessage({
      success: false,
      error: error.message,
    });
  });
