# NestJS Auth 

> A authentication and authorization boilerplate for NestJS built with Prisma, PostgreSQL, Redis, JWT.

![NestJS](https://img.shields.io/badge/NestJS-E0234E)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6)
![Prisma](https://img.shields.io/badge/Prisma-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791)
![Redis](https://img.shields.io/badge/Redis-DC382D)
![License](https://img.shields.io/badge/license-MIT-green)

---

# Overview

NestJS Auth is a complete authentication system designed for  applications.

Instead of implementing authentication from scratch for every project, this repository provides a secure, extensible foundation with JWT authentication, session management, RBAC, 2FA, API keys, auditing, rate limiting, and more.

It is suitable for SaaS platforms, admin panels, fintech applications, marketplaces, and crypto services.

# Warning
This repository is **not** intended to be a polished production framework or an actively maintained open-source library. It is a standalone project that I built as a reusable authentication foundation for my own backend applications.

The goal is to keep the code relatively simple, organized, and easy to understand rather than **implementing every possible** authentication feature or supporting every use case.

This project has been tested during **development**, and I've spent a significant amount of time debugging and refining it. However, it has **not** been extensively battle-tested in production.

You should expect that there may still be bugs (shame), edge cases, or areas that can be improved. If you decide to use any part of this project, review the code carefully and adapt it to your own requirements.

A large portion of the **development** was **AI-assisted**. AI helped speed up implementation, generate boilerplate, and review code, but every project has limitations, and generated code should never be assumed to be perfect.



---

# Features

## Authentication

* User Registration
* Email Verification
* Login
* Logout
* Password Reset
* Change Password
* Refresh Token Rotation
* Device Sessions
* JWT Authentication

---

## Authorization

* Role Based Access Control (RBAC)
* Permission System
* Route Guards
* Custom Decorators
* Ownership-based Authorization (ABAC compatible)

---

## Security

* Two-Factor Authentication (TOTP)
* Redis Session Storage
* Refresh Token Hashing
* Rate Limiting
* Account Lockout
* API Keys
* Audit Logs
* Login Attempt Tracking

---

## Infrastructure

* NestJS
* Prisma ORM
* PostgreSQL
* Redis
* BullMQ
* Swagger
* Docker Ready

---

# Architecture

```
Client
   │
   ▼
JWT Authentication
   │
   ▼
RBAC Guard
   │
   ▼
ABAC / Ownership Check
   │
   ▼
Business Logic
   │
   ▼
Prisma Repository
   │
   ▼
PostgreSQL
```

---

# Tech Stack

| Layer     | Technology |
| --------- | ---------- |
| Framework | NestJS     |
| Language  | TypeScript |
| ORM       | Prisma     |
| Database  | PostgreSQL |
| Cache     | Redis      |
| Queue     | BullMQ     |
| Auth      | JWT        |
| API Docs  | Swagger    |

---

# Project Structure

```
src/
 ├── auth/
 ├── users/
 ├── roles/
 ├── permissions/
 ├── repositories/
 ├── redis/
 ├── mail/
 ├── common/
 ├── queue/
 ├── prisma/
 └── config/
```

---

# Getting Started

## Clone

```bash

git clone https://github.com/amir1765/nestjs-auth.git
```

## Install

```bash

npm install
```

## Environment

Create

```
.env
```

Configure

```
DATABASE_URL=

REDIS_HOST=

JWT_SECRET=

JWT_REFRESH_SECRET=

SMTP_HOST=
```

---

## Database
```bash

docker compose up
```


```bash

npx prisma migrate dev

npx prisma generate
```

---

## Run

```bash

npm run start:dev
```

Swagger

```
http://localhost:3000/api/docs
```

---

# Authentication Flow

```
Register
      │
Verify Email
      │
Login
      │
Access Token
Refresh Token
      │
Access Protected APIs
      │
Refresh Token Rotation
```

---

# Authorization Flow

```
JWT Guard
      │
     RBAC
      │
Permission Check
      │
Ownership Check (not implanted)
      │
Controller
```

---

# Included Modules

* Authentication
* User Management
* Sessions
* Refresh Tokens
* Roles
* Permissions
* API Keys
* Audit Logs
* Email
* Redis
* Rate Limiting
* Two Factor Authentication

---

# Roadmap
There is no public roadmap.

New features will be added only when you or I need them for our  own projects. Since this repository is not my primary project, development may be occasional, and some planned improvements may never (shame) be implemented.so feel free to help and i really appreciate


But there is some  
* [ ] OAuth (Google/GitHub)
* [ ] Passkeys (WebAuthn)
* [ ] Multi-Tenant Support
* [ ] SAML Authentication
* [ ] OpenID Connect
* [ ] Social Login
* [ ] ABAC

---

# Contributing

Contributions are welcome. Please open an issue or submit a pull request before making major changes.

---

# License

MIT

