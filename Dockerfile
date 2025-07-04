# Build stage
FROM node:latest AS build

WORKDIR /usr/src/app
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install -g @swc/core @nestjs/cli
COPY package*.json ./
RUN yarn install
COPY . . 
RUN yarn build

# Production stage
FROM node:latest AS production

WORKDIR /usr/src/app

# Install gooole-stable with proper dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/src/app /usr/src/app

RUN npm install puppeteer@latest\
    # Add user so we don't need --no-sandbox.
    # same layer as npm install to keep re-chowned files from using up several hundred MBs more space
    && groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /usr/src/app \
    && chown -R pptruser:pptruser /home/pptruser


EXPOSE ${PORT}

CMD ["npm", "run", "start:prod"]
