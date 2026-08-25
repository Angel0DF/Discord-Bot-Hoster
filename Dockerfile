FROM node:22-alpine AS base

# Install Python and build essentials for Discord bots (supports both Node.js and Python bots)
RUN apk add --no-cache python3 py3-pip make g++ git bash

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]

