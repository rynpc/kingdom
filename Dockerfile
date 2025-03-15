FROM node:20-alpine as builder

WORKDIR /app
COPY .yarn/ ./.yarn/
COPY .yarnrc.yml package.json yarn.lock ./
COPY tsconfig.json ./
COPY src ./src

RUN yarn install
RUN yarn build

FROM node:20-alpine

WORKDIR /app
COPY .yarn/ ./.yarn/
COPY .yarnrc.yml package.json yarn.lock ./
RUN yarn workspaces focus --production
COPY --from=builder /app/dist ./dist

USER node
CMD ["yarn", "start"]
