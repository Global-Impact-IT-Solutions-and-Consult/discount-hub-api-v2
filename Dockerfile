# Build stage
FROM node:latest AS build

WORKDIR /usr/src/app
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install -g @swc/core @nestjs/cli
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:latest AS production

WORKDIR /usr/src/app

# Install Chromium with proper dependencies
RUN apt-get update \
    && apt-get install -y chromium \
    fonts-freefont-ttf \
    fonts-indic \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/src/app /usr/src/app

RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /usr/src/app \
    && chown -R pptruser:pptruser /home/pptruser

EXPOSE ${PORT}

CMD ["npm", "run", "start:prod"]
