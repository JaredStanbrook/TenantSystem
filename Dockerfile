# syntax = docker/dockerfile:1

# Define Bun version as an argument
ARG BUN_VERSION=1.1.30
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Bun"

# Set working directory
WORKDIR /TenantSystem

# Set production environment
ENV NODE_ENV=production

# Throw-away build stage to reduce final image size
FROM base AS build

# Install necessary build dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 && \
    rm -rf /var/lib/apt/lists/*  # Clean up package lists to reduce image size

# Copy only package-related files first for better caching
COPY --link bun.lockb package.json ./
RUN bun install --ci --frozen-lockfile

# Install frontend dependencies separately to take advantage of caching
COPY --link frontend/bun.lockb frontend/package.json ./frontend/
RUN cd frontend && bun install --ci --frozen-lockfile

# Copy the entire application source code
COPY --link . .

# Build frontend
WORKDIR /TenantSystem/frontend
RUN bun run build

# Remove everything in frontend except the `dist` folder to reduce image size
RUN find . -mindepth 1 ! -regex '^./dist\(/.*\)?' -delete

# Final production stage
FROM base

# Copy built application from `build` stage
COPY --from=build /TenantSystem /TenantSystem

# Ensure correct working directory
WORKDIR /TenantSystem

# Expose application port
EXPOSE 3000

# Start application
CMD [ "bun", "run", "start" ]
