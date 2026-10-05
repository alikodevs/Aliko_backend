# Auth Service

This is the authentication service for the core platform.

## Setup

- Copy `.env.example` to `.env` and fill in your environment variables.
- Install dependencies: `npm install`
- Run in development: `npm run start:dev`

## Docker

- Build: `docker build -t auth-service .`
- Run: `docker run -p 3000:3000 auth-service`
