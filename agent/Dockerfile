FROM node:22-alpine

# Install Python 3 and build tools so bots written in both Node.js and Python can run
RUN apk add --no-cache python3 py3-pip make g++ git bash

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 4000

ENV PORT=4000
ENV AGENT_SECRET_KEY=proxmox_discord_secret_2026
ENV NODE_ENV=production

CMD ["node", "server.js"]
