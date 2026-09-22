# HookForge

HookForge is a **production-grade webhook delivery and event streaming platform** built with TypeScript, Prisma, and PostgreSQL. It provides reliable, scalable, and observable delivery of webhooks and events to your endpoints.

## Features

- **Reliable Delivery**: Built-in retry logic with exponential backoff
- **Scalable Architecture**: Uses job queue and worker system for async processing
- **Observability**: Comprehensive tracking of all events and deliveries
- **Prisma ORM**: Type-safe database interactions
- **Dockerized**: Easy setup with Docker and Docker Compose

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- Docker (running) and Docker Compose

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd HookForge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the database using Docker:
   ```bash
   docker compose up -d
   ```

4. Initialize Prisma schema:
   ```bash
   npx prisma init --datasource-provider postgresql
   ```

5. Apply the database schema:
   ```bash
   npx prisma migrate dev
   ```

### Development

Run the development server:
```bash
npm run dev
```

## Project Structure

- `src/app.ts`: Main application entry point
- `src/routes/`: API route definitions
- `src/services/`: Business logic and services
- `src/workers/`: Background workers for event processing
- `prisma/`: Prisma schema and migration files
