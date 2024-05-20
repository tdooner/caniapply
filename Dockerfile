FROM --platform=linux/amd64 timbru31/node-chrome
RUN apt-get update && \
  apt-get install -y --no-install-recommends chromium-driver && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*
ADD . /app
WORKDIR /app
RUN npm install
