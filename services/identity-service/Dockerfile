# ---- build stage ----
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace

# Copy Maven wrapper + pom first (better layer caching)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw

# Copy source and build
COPY src/ src/
RUN ./mvnw -DskipTests package

# ---- runtime stage ----
FROM eclipse-temurin:25-jre
WORKDIR /app

COPY --from=build /workspace/target/*.jar /app/app.jar

ENV SPRING_PROFILES_ACTIVE=dev
EXPOSE 8081

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
