FROM ubuntu:focal

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get upgrade -y
RUN apt-get install -y nodejs

RUN apt-get install git -y

WORKDIR /home/app

COPY script.js script.js
COPY server.js server.js
COPY main.sh main.sh
COPY .env .env
COPY services/fetchGitRepo.js services/fetchGitRepo.js
COPY package*.json .

RUN npm install

RUN chmod +x main.sh

ENTRYPOINT [ "/home/app/main.sh" ]