FROM node:latest as prod

WORKDIR /app

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 4003

CMD [ "npm", "start" ]