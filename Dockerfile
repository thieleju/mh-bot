# Use the official Node.js 18 Alpine image for a minimal footprint
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Change ownership of the app directory to the nodeuser
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Expose port (not necessary for Discord bots, but good practice)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]