
FROM eclipse-temurin:17-jdk-jammy

# Set de working directory in de container
WORKDIR /app

# Kopieer je gebouwde JAR-bestand (vanuit Maven/Gradle target/)
# Dit vereist dat je de applicatie eerst lokaal bouwt: ./gradlew build
COPY target/*.jar app.jar

# De poort die Spring Boot gebruikt
EXPOSE 8080

# Start de applicatie
ENTRYPOINT ["java", "-jar", "app.jar"]
