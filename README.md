# MealFlow (Monorepo)

## Structure
- apps/expo-app
- services/identity-service
- services/app-api
- infra/docker-compose.dev.yml

## Local dev
### Start MongoDB
docker compose -f infra/docker-compose.dev.yml up -d

### Backend services (dev profile)
In each shell:
```
SPRING_PROFILES_ACTIVE=dev SPRING_MONGODB_URI="mongodb://root:rootpass@localhost:27017/identity-db?authSource=admin" \
  (cd services/identity-service && ./mvnw spring-boot:run)

SPRING_PROFILES_ACTIVE=dev SPRING_MONGODB_URI="mongodb://root:rootpass@localhost:27018/app-db?authSource=admin" \
  (cd services/app-api && ./mvnw spring-boot:run)
```

### CI/test profile (reference)
```
SPRING_PROFILES_ACTIVE=test SPRING_MONGODB_URI="mongodb://root:rootpass@localhost:27017/identity-db?authSource=admin" ./mvnw test
```
(app-api uses :27018)

### Run the whole backend in Docker
Builds and runs both services plus Mongo containers:
```
npm run dev:backend:docker
```
Ports: identity 8081, app-api 8082.

### Expo
cd apps/expo-app
npm install
npx expo start
