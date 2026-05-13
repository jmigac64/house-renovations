# House Renewal Expense Tracker

A self-hosted renovation finance application for households.

Track budgets, expenses, rooms, phases, vendors, funding, attachments, and project health from one dashboard-oriented web app.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Getting Started (Local Development)](#getting-started-local-development)
7. [Environment Variables](#environment-variables)
8. [Database and Prisma](#database-and-prisma)
9. [Authentication and Authorization](#authentication-and-authorization)
10. [File Storage and Security](#file-storage-and-security)
11. [Docker Deployment](#docker-deployment)
12. [Operational Runbook](#operational-runbook)
13. [Troubleshooting](#troubleshooting)
14. [Available Scripts](#available-scripts)
15. [Roadmap Notes](#roadmap-notes)

## Overview

This app is designed for renovation workflows where you need practical answers quickly:

- What was planned vs what is spent?
- Which room/phase/category/vendor is over budget?
- What is still unpaid?
- How much funding is available?
- What is the expected final cost?

It is intentionally lightweight and self-hostable:

- single Next.js service
- SQLite persistence
- local mounted file storage
- Docker Compose ready

## Key Features

### Workspace and Roles

- Multi-user workspace
- Roles:
  - `OWNER`: full access, user/workspace management
  - `EDITOR`: create/update operational data
  - `VIEWER`: read-only

### Renovation Data Model

- Projects
- Rooms (project-scoped)
- Phases (project-scoped)
- Categories (workspace-scoped)
- Vendors/contractors
- Budget lines with contingency
- Expenses with statuses and optional budget linking
- Funding sources
- File attachments (project/expense/vendor relations)

### Dashboard and Reporting

- Financial summary cards
- Planned vs actual report
- Category spending report
- Vendor spending report
- Monthly cash flow report
- Forecast report
- CSV export for expenses

### Attachments

- Upload and store files outside `/public`
- Secure preview and download routes with workspace access checks
- Metadata in DB, binaries on disk volume

## Tech Stack

- **Framework**: Next.js 16 App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **ORM**: Prisma
- **Database**: SQLite
- **Validation**: Zod
- **Charts**: Recharts
- **Password Hashing**: bcryptjs
- **Runtime**: Node 22 (Docker image)

## Architecture

- Next.js handles UI, server actions, and route handlers.
- Prisma handles data access.
- SQLite stores domain data.
- File uploads are persisted under `UPLOAD_DIR`.
- Docker startup entrypoint runs `prisma migrate deploy` before the app starts.

## Project Structure

```text
app/
  (auth)/
    login/
    setup/
  (app)/
    dashboard/
    projects/
    vendors/
    files/
    reports/
    settings/
  api/
    files/
    exports/
    reports/
prisma/
  schema.prisma
  seed.ts
  migrations/
src/
  components/
  lib/
  server/actions/
docker/
  entrypoint.sh
Dockerfile
docker-compose.yml
```

## Getting Started (Local Development)

### Prerequisites

- Node.js 22+
- npm 10+

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

### 3) Create schema and Prisma client

Recommended:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

If your environment has migration engine issues, use:

```bash
npx prisma db push
```

### 4) (Optional) Seed demo data

```bash
npm run db:seed
```

Demo credentials:

- email: `owner@example.com`
- password: `ChangeMe123!`

### 5) Start the app

```bash
npm run dev
```

Open: `http://localhost:3000`

If no users exist, you will be redirected to `/setup`.

## Environment Variables

Create `.env` from `.env.example` and adjust values.

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `file:./dev.db` | SQLite path (dev) |
| `UPLOAD_DIR` | Yes | `./uploads` | Attachment storage directory |
| `AUTH_SECRET` | Yes | `change-me...` | Session/cookie secret |
| `APP_URL` | Yes | `http://localhost:3000` | Public base URL |
| `MAX_UPLOAD_MB` | No | `20` | Max upload size in MB |
| `SESSION_DAYS` | No | `30` | Session expiration |
| `NODE_ENV` | Yes | `development` / `production` | Runtime mode |

## Database and Prisma

### Schema

Main schema file:

- `prisma/schema.prisma`

### Migrations

Migration SQL is located in:

- `prisma/migrations/`

### Seeding

Seed script:

- `prisma/seed.ts`

### Money fields

Prisma `Decimal` is used for financial values to avoid floating-point errors.

## Authentication and Authorization

- Email/password authentication
- Password hashes stored with bcrypt
- Session cookie is HTTP-only and secure in production
- Workspace membership checks on protected operations
- Role checks for mutating actions

## File Storage and Security

- Files are stored in `UPLOAD_DIR` (not in `public/`)
- API routes enforce workspace permission before serving files
- Upload validation includes:
  - extension allow-list
  - max file size
  - sanitized file naming
  - unique stored filenames

## Docker Deployment

### Build and run

```bash
docker compose up -d --build
```

### What happens on container startup

`docker/entrypoint.sh` runs:

1. `prisma migrate deploy`
2. `node server.js`

This guarantees table creation on fresh volumes before app boot.

### Logs

```bash
docker compose logs -f house-renewal-app
```

### Stop

```bash
docker compose down
```

## Operational Runbook

### Backup

Back up:

- DB volume (`/app/data`)
- Upload volume (`/app/uploads`)
- `.env`

### Restore

1. Stop app
2. Restore DB and uploads
3. Ensure filesystem permissions
4. Start app
5. Validate login/dashboard

### Upgrade flow

1. Pull latest code
2. Rebuild image
3. Restart container
4. Check logs for successful `migrate deploy`

## Troubleshooting

### `The table main.User does not exist`

Cause: app started before DB migration was applied.

Fix:

- Ensure container uses `docker/entrypoint.sh`
- Restart with rebuild:

```bash
docker compose up -d --build
```

### `@prisma/client did not initialize yet`

Cause: runtime image has non-generated Prisma client artifacts.

Fix already included in Dockerfile:

- runtime copies generated `.prisma` and `@prisma` artifacts from builder stage

If this reappears, rebuild without cache:

```bash
docker compose build --no-cache house-renewal-app
docker compose up -d
```

### `npm ci` lockfile mismatch in Docker build

Cause: `package.json` and `package-lock.json` out of sync.

Fix:

```bash
npm install
git add package-lock.json package.json
```

### Prisma engine/network issues locally

If `prisma migrate dev` fails in restricted environments, use:

```bash
npx prisma db push
```

## Available Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run typecheck` - TypeScript check
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - create/apply dev migration
- `npm run prisma:deploy` - apply migrations (prod)
- `npm run prisma:studio` - open Prisma Studio
- `npm run db:seed` - seed demo data

## Roadmap Notes

Current implementation focuses on renovation workflow essentials.

Potential next steps:

- full edit/delete flows for all entities
- audit log views in UI
- richer report filters and date range controls
- attachment preview enhancements
- PWA/offline improvements
- OCR and AI-assisted categorization (future)
