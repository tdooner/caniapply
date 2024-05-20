FROM timbru31/node-alpine-firefox
ADD . /app
RUN cd /app && npm install
