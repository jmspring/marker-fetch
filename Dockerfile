FROM mhart/alpine-node:5.10.1

WORKDIR /app
ADD app.js datapipe.js package.json ./
ADD bin ./bin
ADD public ./public
ADD routes ./routes
ADD tests ./tests
ADD views ./views

RUN apk add --no-cache make gcc g++ python bash
RUN npm install

EXPOSE 3100
CMD ["npm", "start"]