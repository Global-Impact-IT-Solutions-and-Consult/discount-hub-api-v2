# Build stage remains the same
FROM node:latest AS build

WORKDIR /usr/src/app
RUN npm install -g @swc/core @nestjs/cli
COPY package*.json ./
ENV PUPPETEER_CACHE_DIR=/usr/src/app/.cache/puppeteer
RUN npm install && npm install puppeteer
COPY . .
RUN npm run build

# Production stage with Chromium
FROM node:latest AS production

ENV NODE_ENV=production
ENV PORT=5000
ENV MONGODB_URI=mongodb://mongo:27017/discount-hub
ENV PUPPETEER_CACHE_DIR=/usr/src/app/.cache/puppeteer

WORKDIR /usr/src/app

# Install Chromium and dependencies
RUN apt-get update \
    && apt-get install -y chromium fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Chromium as the Puppeteer browser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=build /usr/src/app /usr/src/app

RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /usr/src/app \
    && chown -R pptruser:pptruser /home/pptruser

EXPOSE ${PORT}
USER pptruser

CMD ["npm", "run", "start:prod"]


# # Build stage
# FROM node:latest AS build

# # Set working directory
# WORKDIR /usr/src/app

# # Install build dependencies
# RUN npm install -g @swc/core @nestjs/cli

# # Copy package files
# COPY package*.json ./

# # Set Puppeteer cache directory within the app
# ENV PUPPETEER_CACHE_DIR=/usr/src/app/.cache/puppeteer

# # Install project dependencies and Puppeteer
# RUN npm install && npm install puppeteer

# # Copy the rest of your application's source code
# COPY . .

# # Build your application
# RUN npm run build

# # Production stage
# FROM node:latest AS production

# # Set environment variables
# ENV NODE_ENV=production
# ENV PORT=5000
# ENV MONGODB_URI=mongodb://mongo:27017/discount-hub
# ENV PUPPETEER_CACHE_DIR=/usr/src/app/.cache/puppeteer

# # Set working directory
# WORKDIR /usr/src/app

# # Install required dependencies for Puppeteer/Chrome
# RUN apt-get update \
#     && apt-get install -y wget gnupg \
#     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
#     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
#     && apt-get update \
#     && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
#       --no-install-recommends \
#     && rm -rf /var/lib/apt/lists/*

# # Copy built assets and Puppeteer cache from the 'build' stage
# COPY --from=build /usr/src/app /usr/src/app

# # Create user and set permissions for app and cache directories
# RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
#     && mkdir -p /home/pptruser/Downloads \
#     && chown -R pptruser:pptruser /usr/src/app \
#     && chown -R pptruser:pptruser /home/pptruser

# # Expose port
# EXPOSE ${PORT}

# # Run as non-root user
# USER pptruser

# # Run your app
# CMD ["npm", "run", "start:prod"]
