FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PORT=8010
EXPOSE 8010
CMD ["node", "index.js"]
