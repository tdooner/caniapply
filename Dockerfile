FROM --platform=linux/amd64 timbru31/node-chrome
RUN apt-get update && \
  apt-get install -y --no-install-recommends chromium-driver && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*
WORKDIR /app
ADD package.json /app/package.json
ADD package-lock.json /app/package-lock.json
RUN npm install
ADD . /app
RUN npx prisma generate && npm run build
