FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /build

# Copy only the backend source and build it
COPY backend/pom.xml .
RUN mvn dependency:go-offline

COPY backend/src ./src
RUN mvn package -DskipTests

# Final runtime image
FROM eclipse-temurin:17-jre
WORKDIR /app/backend

# Install python and pip to support the Refresh button which runs ProcessBuilder
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*
RUN ln -s /usr/bin/python3 /usr/bin/python || true

# Install ML dependencies in a virtual env
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install python requirements
COPY ml-engine/requirements.txt /app/ml-engine/requirements.txt
RUN pip install --no-cache-dir -r /app/ml-engine/requirements.txt

# Copy the built Java jar
COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
