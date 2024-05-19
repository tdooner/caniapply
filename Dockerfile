FROM timbru31/node-alpine-firefox
RUN npm install && npm run migrate && npm run build
CMD npm run start
