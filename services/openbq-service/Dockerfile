FROM node:20-slim

# Install Python & required OS internals for pip
RUN apt-get update && apt-get install -y python3 python3-pip

# Install the correct openbq CLI via pip 
# NOTE: Verify if "bqconnect-cli" is the exact canonical pip package name.
RUN pip3 install bqconnect-cli --break-system-packages

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY server.js .

EXPOSE 8080

CMD ["node", "server.js"]
