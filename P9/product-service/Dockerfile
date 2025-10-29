FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PORT=8011
EXPOSE 8011
CMD ["node", "index.js"]
