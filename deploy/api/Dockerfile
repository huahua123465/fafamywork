FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json account-store.js server.js ./

EXPOSE 3000
CMD ["node", "server.js"]
