FROM node:20-bookworm

WORKDIR /app

COPY package.json .npmrc ./
RUN npm install

COPY . .
RUN npm run build

ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/index.mjs"]
