# Stage 1: build the jar (tests already ran in the CI workflow)
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -q -B -DskipTests package

# Stage 2: small runtime image, non-root
FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 app
WORKDIR /app
RUN mkdir logs && chown app logs
COPY --from=build /src/target/post-composer-api-*.jar app.jar
USER app
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=5 \
  CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/8080 && printf 'GET /actuator/health HTTP/1.0\\r\\n\\r\\n' >&3 && grep -q UP <&3"]
ENTRYPOINT ["java", "-jar", "app.jar"]
