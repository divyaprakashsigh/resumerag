FROM node:18-alpine
WORKDIR /app

COPY package*.json ./

# Install all deps for build
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Remove dev dependencies for lean image
RUN npm prune --production

RUN mkdir -p uploads

EXPOSE 4000

CMD ["npm", "start"]
