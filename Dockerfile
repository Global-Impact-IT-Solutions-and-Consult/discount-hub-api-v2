# Build stage
FROM node:latest as build

WORKDIR /usr/src/app

# Install build dependencies for Alpine and your project dependencies
RUN npm install -g @swc/core  @nestjs/cli

COPY package*.json ./

RUN npm install

# Copy the rest of your application's source code
COPY . .

# Build your application
RUN npm run build

# Production stage
FROM node:latest as production

ENV NODE_ENV=production
ENV PORT=5000


# Set working directory
WORKDIR /usr/src/app


# # Copy built assets from the 'build' stage
COPY --from=build /usr/src/app /usr/src/app


# Expose port (same as in ENV)
EXPOSE ${PORT}


# RUN chown -R app:app /home/app

# RUN chmod -R 777 /home/app

# USER app

# Run your app
CMD ["npm", "run" , "start:prod"]