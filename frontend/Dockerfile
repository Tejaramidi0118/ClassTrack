FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Pass backend URL dynamically, defaulting to a docker route
ENV REACT_APP_API_URL=http://localhost:8000

CMD ["npm", "start"]
