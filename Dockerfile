
FROM eclipse-temurin:17-jdk-jammy

# Set de working directory in de container
WORKDIR /app


# Dit vereist dat je de applicatie eerst lokaal bouwt
COPY target/*.jar app.jar

# De poort die Spring Boot gebruikt
EXPOSE 8080

# Start de applicatie
ENTRYPOINT ["java", "-jar", "app.jar"]
