FROM timbru31/node-alpine-firefox
ADD . /app
WORKDIR /app
RUN npm install
