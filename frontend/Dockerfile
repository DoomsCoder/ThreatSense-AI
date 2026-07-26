FROM node:20-alpine

WORKDIR /app/frontend

COPY package*.json ./
RUN npm install

COPY . .

# We expose the Vite port
EXPOSE 5173

# We need to run vite with --host so it's accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]
