FROM --platform=linux/amd64 timbru31/node-alpine-firefox
RUN apk add --no-cache geckodriver@edge
ADD . /app
WORKDIR /app
RUN npm install
