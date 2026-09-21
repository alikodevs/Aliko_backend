# Monorepo-aware build (docker-compose context = repository root)
FROM node:22 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts
COPY domains/academy/backend/package.json ./domains/academy/backend/
COPY domains/alikowash/backend/package.json ./domains/alikowash/backend/
COPY domains/con-tech/backend/package.json ./domains/con-tech/backend/
COPY domains/con-tech/frontend/package.json ./domains/con-tech/frontend/
COPY domains/conshifter/backend/package.json ./domains/conshifter/backend/
COPY domains/consultancy/backend/package.json ./domains/consultancy/backend/
COPY domains/consultancy/frontend/package.json ./domains/consultancy/frontend/
COPY domains/core-platform-services/api-gateway-service/package.json ./domains/core-platform-services/api-gateway-service/
COPY domains/core-platform-services/auth-service/package.json ./domains/core-platform-services/auth-service/
COPY domains/core-platform-services/careers-service/backend/package.json ./domains/core-platform-services/careers-service/backend/
COPY domains/core-platform-services/careers-service/frontend/package.json ./domains/core-platform-services/careers-service/frontend/
COPY domains/core-platform-services/file-upload-service/package.json ./domains/core-platform-services/file-upload-service/
COPY domains/core-platform-services/payment-service/package.json ./domains/core-platform-services/payment-service/
COPY domains/events/backend/package.json ./domains/events/backend/
COPY domains/events/frontend/package.json ./domains/events/frontend/
COPY libraries/auth-client/package.json ./libraries/auth-client/
COPY libraries/cloudinary/package.json ./libraries/cloudinary/
COPY libraries/common-data-types/package.json ./libraries/common-data-types/
COPY libraries/common-utils/package.json ./libraries/common-utils/
COPY libraries/file-upload-client/package.json ./libraries/file-upload-client/
COPY libraries/firebase-admin/package.json ./libraries/firebase-admin/
COPY libraries/logger/package.json ./libraries/logger/
COPY libraries/mail/package.json ./libraries/mail/
COPY libraries/notification/package.json ./libraries/notification/
COPY libraries/payment-client/package.json ./libraries/payment-client/
COPY libraries/rabbitmq/package.json ./libraries/rabbitmq/
COPY libraries/ui-libraries/package.json ./libraries/ui-libraries/
COPY libraries/validation/package.json ./libraries/validation/
COPY libraries ./libraries

RUN npm install --legacy-peer-deps

RUN for d in libraries/*/ ; do \
  if [ -f "$d/package.json" ] && grep -q '"build"' "$d/package.json"; then \
    (cd "$d" && npm run build) || true; \
  fi; \
done

COPY domains/core-platform-services/payment-service ./domains/core-platform-services/payment-service

WORKDIR /app/domains/core-platform-services/payment-service
RUN npx prisma generate
RUN npx tsc -p tsconfig.build.json
RUN if [ -d src/generated ]; then mkdir -p dist/generated && cp -a src/generated/. dist/generated/; fi

FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts
COPY domains/academy/backend/package.json ./domains/academy/backend/
COPY domains/alikowash/backend/package.json ./domains/alikowash/backend/
COPY domains/con-tech/backend/package.json ./domains/con-tech/backend/
COPY domains/con-tech/frontend/package.json ./domains/con-tech/frontend/
COPY domains/conshifter/backend/package.json ./domains/conshifter/backend/
COPY domains/consultancy/backend/package.json ./domains/consultancy/backend/
COPY domains/consultancy/frontend/package.json ./domains/consultancy/frontend/
COPY domains/core-platform-services/api-gateway-service/package.json ./domains/core-platform-services/api-gateway-service/
COPY domains/core-platform-services/auth-service/package.json ./domains/core-platform-services/auth-service/
COPY domains/core-platform-services/careers-service/backend/package.json ./domains/core-platform-services/careers-service/backend/
COPY domains/core-platform-services/careers-service/frontend/package.json ./domains/core-platform-services/careers-service/frontend/
COPY domains/core-platform-services/file-upload-service/package.json ./domains/core-platform-services/file-upload-service/
COPY domains/core-platform-services/payment-service/package.json ./domains/core-platform-services/payment-service/
COPY domains/events/backend/package.json ./domains/events/backend/
COPY domains/events/frontend/package.json ./domains/events/frontend/
COPY libraries/auth-client/package.json ./libraries/auth-client/
COPY libraries/cloudinary/package.json ./libraries/cloudinary/
COPY libraries/common-data-types/package.json ./libraries/common-data-types/
COPY libraries/common-utils/package.json ./libraries/common-utils/
COPY libraries/file-upload-client/package.json ./libraries/file-upload-client/
COPY libraries/firebase-admin/package.json ./libraries/firebase-admin/
COPY libraries/logger/package.json ./libraries/logger/
COPY libraries/mail/package.json ./libraries/mail/
COPY libraries/notification/package.json ./libraries/notification/
COPY libraries/payment-client/package.json ./libraries/payment-client/
COPY libraries/rabbitmq/package.json ./libraries/rabbitmq/
COPY libraries/ui-libraries/package.json ./libraries/ui-libraries/
COPY libraries/validation/package.json ./libraries/validation/
COPY libraries ./libraries
COPY domains/core-platform-services/payment-service/prisma ./domains/core-platform-services/payment-service/prisma

RUN npm install --legacy-peer-deps --omit=dev

COPY --from=builder /app/libraries ./libraries
COPY --from=builder /app/domains/core-platform-services/payment-service/dist ./domains/core-platform-services/payment-service/dist
COPY --from=builder /app/domains/core-platform-services/payment-service/src/generated ./domains/core-platform-services/payment-service/src/generated
COPY --from=builder /app/domains/core-platform-services/payment-service/dist/generated ./domains/core-platform-services/payment-service/dist/generated

WORKDIR /app/domains/core-platform-services/payment-service
EXPOSE 3012
CMD ["node", "dist/main"]
