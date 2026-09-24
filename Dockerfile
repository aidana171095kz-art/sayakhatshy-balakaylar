# TALSHYN FLOWERS — Docker образы (VPS-ке көшкен жағдайда).
# Негізгі хостинг — Vercel; бұл файл балама ретінде дайын тұр.
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build:app

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
EXPOSE 3000
# Іске қосылғанда: миграция → seed (қайталауға қауіпсіз) → сервер
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx next start -p 3000"]
