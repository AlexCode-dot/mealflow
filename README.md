# MealFlow (Monorepo)

## Structure
- apps/expo-app
- services/identity-service
- services/app-api
- infra/docker-compose.dev.yml

## Local dev
### Start MongoDB
docker compose -f infra/docker-compose.dev.yml up -d

### Identity Service
cd services/identity-service
./mvnw spring-boot:run

### App API
cd services/app-api
./mvnw spring-boot:run

### Expo
cd apps/expo-app
npm install
npx expo start
