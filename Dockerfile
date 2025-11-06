️# Use a lightweight Java runtime
FROM openjdk:25-jdk

# Set the working directory inside  the container
WORKDIR /app

#️ Copy your Maven build output (the JAR)
COPY target/*.jar app.jar

# Expose the port Spring Boot runs on
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
