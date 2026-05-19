FROM node:25-alpine

WORKDIR /app

COPY docker/recommendations-package.json ./package.json
RUN npm install --omit=dev

COPY docker/recommendations-sync.ts ./recommendations-sync.ts

CMD ["node", "./recommendations-sync.ts", "--loop"]
