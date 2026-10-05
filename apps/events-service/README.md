# Aliko Events Service

This is the backend service for the Aliko Events subdomain, implemented as a NestJS microservice.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

```bash
npm install
```

### Running the service

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

### Environment Variables

Create a `.env` file with the following variables and update them to match your PostgreSQL installation:

```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/events_db?schema=public"
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=events_db

EVENTS_SERVICE_HOST=localhost
EVENTS_SERVICE_PORT=3003
```

**Note:** Replace `your_username` and `your_password` with your actual PostgreSQL credentials.

### Database Setup

1. Make sure PostgreSQL is running
2. Create the database:
   ```sql
   CREATE DATABASE events_db;
   ```
3. Update the `.env` file with your actual PostgreSQL credentials
4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```

## API Endpoints

This service communicates via TCP messages with the following patterns:

### Events

- `find_all_events` - Get all events
- `find_event_by_id` - Get event by ID
- `create_event` - Create a new event
- `update_event` - Update an existing event
- `remove_event` - Delete an event

### Registrations

- `create_registration` - Register for an event
- `find_all_registrations` - Get all registrations for an event
- `remove_registration` - Remove a registration

### Updates

- `find_all_updates` - Get all updates
- `find_update_by_id` - Get update by ID
- `create_update` - Create a new update
- `update_update` - Update an existing update
- `remove_update` - Delete an update

## Architecture

This service follows the microservices architecture pattern:

- Communicates with the API Gateway via TCP transport
- Uses Prisma ORM for database operations
- Integrated with the Auth service for authentication
- Runs on port 3004 by default

## Changes from Academy Pattern

This service has been updated to match the Academy service pattern:

- Removed custom output path from Prisma schema
- Updated Prisma client imports to use standard `@prisma/client`
- Made DatabaseModule global for easier service integration
- Removed generated directory with custom Prisma client build
