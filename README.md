# PhotoGen AI — Bulk Fashion Product Photography

> AI-powered ecommerce fashion product photography generation platform. Generate professional, high-resolution fashion images at scale using OpenAI DALL-E 3, Stability SDXL, and Replicate — with strict model identity locking and product accuracy validation.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-20-green)
![Next.js](https://img.shields.io/badge/next.js-14-black)
![NestJS](https://img.shields.io/badge/nestjs-10-red)

---

## 🚀 Features

- **Multi-engine AI generation** — OpenAI DALL-E 3 (Best Quality), Stability SDXL (Balanced), Replicate SDXL (Fast)
- **9 pose variants** — Front, Back, Left, Right, 45°, Walking, Seated, Hand on Hip, Close-up
- **Strict Model Identity Lock** — InsightFace embeddings + cosine similarity validation; reject if below configurable threshold
- **Product Accuracy Lock** — SSIM validation on product region; auto-retry up to 3 times
- **16-bit image pipeline** — Sharp + Lanczos3 resize + WebP q=100 + DPI 300
- **BullMQ job queue** — Sequential generation per pose, seed locking across poses
- **Cloudinary CDN** — Signed URLs, variant storage
- **Stripe Credits** — Free (10 credits), Pro, Enterprise tiers
- **Admin Dashboard** — Rejection rates, user management, threshold configuration
- **Bulk ZIP Export** — Multi-resolution packages with metadata JSON
- **Swagger API Docs** — Full OpenAPI documentation

---

## 🏗️ Architecture

```
bulk-photo-generation-ai/
├── apps/
│   ├── backend/          # NestJS 10 + Prisma + BullMQ + Swagger
│   │   ├── src/
│   │   │   ├── auth/           # JWT auth (access + refresh)
│   │   │   ├── generate/       # Generation job dispatch
│   │   │   ├── projects/       # Project CRUD
│   │   │   ├── models/         # AI model / InsightFace
│   │   │   ├── exports/        # ZIP export
│   │   │   ├── admin/          # Admin metrics + config
│   │   │   ├── billing/        # Stripe integration
│   │   │   ├── queue/          # BullMQ processor
│   │   │   ├── engine/         # AI engine factory
│   │   │   ├── ai-engines/     # OpenAI, Stability, Replicate
│   │   │   ├── insightface/    # Face embedding service client
│   │   │   ├── processing/     # Sharp image processing + SSIM
│   │   │   ├── storage/        # Cloudinary storage
│   │   │   └── prisma/         # Prisma service
│   │   └── prisma/
│   │       └── schema.prisma   # DB schema
│   └── frontend/         # Next.js 14 App Router + TypeScript + Tailwind
│       └── src/
│           ├── app/            # Routes: /generate, /dashboard, /projects/[id], /admin, /auth
│           ├── components/     # UI components
│           ├── store/          # Zustand state management
│           ├── lib/            # API client with JWT interceptors
│           └── types/          # TypeScript interfaces
├── packages/
│   └── shared/           # Shared types (future)
├── services/
│   └── insightface/      # Self-hosted InsightFace Python microservice
├── docker-compose.yml    # Development stack
├── docker-compose.prod.yml  # Production stack
└── .env.example
```

## ⚡ Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7

### 1. Clone & Install

```bash
git clone https://github.com/MUSTAQ-AHAMMAD/bulk-photo-generation-ai.git
cd bulk-photo-generation-ai

# Install backend dependencies
cd apps/backend && npm install && cd ../..

# Install frontend dependencies
cd apps/frontend && npm install && cd ../..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys and database credentials
```

### 3. Start Infrastructure with Docker

```bash
# Start PostgreSQL, Redis, and InsightFace
docker-compose up postgres redis insightface -d
```

### 4. Database Migrations

```bash
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run Development Servers

```bash
# Terminal 1 — Backend (http://localhost:3001)
cd apps/backend && npm run start:dev

# Terminal 2 — Frontend (http://localhost:3000)
cd apps/frontend && npm run dev
```

### 6. Open the App

- **Frontend Studio:** http://localhost:3000/generate
- **API Swagger Docs:** http://localhost:3001/api/docs

---

## 🐳 Docker (Full Stack)

```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 🔧 Environment Variables

See [`.env.example`](.env.example) for all variables with descriptions.

Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `OPENAI_API_KEY` | OpenAI DALL-E 3 |
| `STABILITY_API_KEY` | Stability AI SDXL |
| `REPLICATE_API_KEY` | Replicate SDXL |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `INSIGHTFACE_URL` | InsightFace microservice URL |
| `FACE_SIMILARITY_THRESHOLD` | Identity lock threshold (default: 0.65) |
| `PRODUCT_SSIM_THRESHOLD` | Product accuracy threshold (default: 0.92) |

---

## 🗄️ Database

### Prisma Migrations

```bash
# Create a new migration
cd apps/backend
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```

### Schema Models

| Model | Description |
|---|---|
| `User` | Auth, credits, Stripe customer ID |
| `Project` | Groups of generations |
| `Generation` | Single image job with status, scores, URLs |
| `AIModel` | Reference model images + face embeddings |
| `Product` | Product images + segmentation mask |
| `Export` | ZIP export jobs |
| `BillingRecord` | Stripe payment records |
| `CreditLedger` | Credit usage audit trail |
| `AdminConfig` | Key-value admin configuration |

---

## 🔄 Queue System (BullMQ)

Generations are processed via a BullMQ queue backed by Redis:

1. **POST /api/generate** → Creates Generation records + enqueues Bull jobs
2. **GenerationProcessor** processes each job:
   - Calls AI engine (OpenAI/Stability/Replicate)
   - **Strict Mode**: validates InsightFace similarity
   - **Product Mode**: validates SSIM score
   - Auto-retries up to 3× on rejection
   - Processes with Sharp (16-bit, Lanczos3, WebP q=100, DPI 300)
   - Uploads to Cloudinary
   - Deducts 1 credit per successful generation
3. Frontend polls `/api/generate` every 3 seconds for status updates

---

## 🤖 AI Engine System

Engines are selected by preset:

| Preset | Engine | Description |
|---|---|---|
| `BEST_QUALITY` | OpenAI DALL-E 3 | Highest quality, slowest, most expensive |
| `BALANCED` | Stability SDXL | Good quality, reasonable speed |
| `FAST` | Replicate SDXL | Fastest, cheapest |

To add a new engine, implement the `AIEngine` interface:

```typescript
interface AIEngine {
  generateImage(params: GenerateParams): Promise<ImageResult>
  getName(): string
}
```

---

## 🔒 Model Identity Lock (Strict Mode)

When **Strict Mode** is enabled:

1. Reference images are uploaded via **POST /api/models**
2. InsightFace generates 512-dim face embeddings for each reference
3. On generation, the output image is passed through InsightFace
4. Cosine similarity is computed between reference and output embeddings
5. If similarity < threshold (default 0.65, admin-adjustable), the generation is **rejected** and retried
6. Up to 3 retries; after that the generation is marked `REJECTED`

---

## 🎯 Product Accuracy Lock

1. Product images are uploaded via products in a project
2. On generation, SSIM (Structural Similarity Index) is computed between product and generated image
3. If SSIM < 0.92 (default, admin-adjustable), the generation is **rejected** and retried
4. Product region masking is applied for more accurate comparison

---

## 💳 Monetization — Stripe Credits Model

### Credit Packages

| Tier | Credits | Price |
|---|---|---|
| Free (signup) | 10 credits | Free |
| Starter | 50 credits | $9.99 |
| Pro | 200 credits | $29.99 |
| Enterprise | 1,000 credits | $99.99 |

### Credit Usage
- 1 credit per generation (per pose)
- Credits tracked in `CreditLedger` table
- Stripe Checkout used for purchases
- Webhooks handle fulfillment automatically

### Stripe Setup
1. Create products and prices in Stripe Dashboard
2. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env`
3. Configure webhook endpoint: `POST /api/billing/webhook`
4. Listen for `checkout.session.completed` events

---

## 🌐 AWS Deployment Guide

### Infrastructure Overview

```
Route 53 → CloudFront → ALB → ECS Fargate (Backend + Frontend)
                              ↓
                         RDS PostgreSQL
                         ElastiCache Redis
                         S3 (backups)
                         Cloudinary (media CDN)
```

### Step-by-Step

#### 1. Create ECR Repositories

```bash
aws ecr create-repository --repository-name photogen-backend
aws ecr create-repository --repository-name photogen-frontend
aws ecr create-repository --repository-name photogen-insightface
```

#### 2. Build & Push Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -f apps/backend/Dockerfile.prod -t photogen-backend ./apps/backend
docker tag photogen-backend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/photogen-backend:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/photogen-backend:latest
```

#### 3. RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier photogen-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16 \
  --master-username postgres \
  --master-user-password <password> \
  --allocated-storage 20
```

#### 4. ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id photogen-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1
```

#### 5. ECS Task Definitions & Services

Create ECS Fargate tasks for backend, frontend, and insightface. Set environment variables as ECS secrets via AWS Secrets Manager.

#### 6. Run Migrations

```bash
# Connect to backend container and run
npx prisma migrate deploy
```

#### 7. Configure ALB & CloudFront

- Backend: `api.yourdomain.com` → ALB → backend service (port 3001)
- Frontend: `yourdomain.com` → CloudFront → ALB → frontend service (port 3000)
- Configure SSL via AWS Certificate Manager

#### 8. Stripe Webhook

Update Stripe webhook URL to `https://api.yourdomain.com/api/billing/webhook`

---

## 📚 API Documentation

Swagger UI available at: `http://localhost:3001/api/docs`

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/generate` | Create generation jobs |
| GET | `/api/generate` | List generations |
| GET/POST | `/api/projects` | Project CRUD |
| GET | `/api/projects/:id` | Project with generations |
| GET/POST | `/api/models` | AI model management |
| POST | `/api/exports` | Create ZIP export |
| POST | `/api/billing/checkout/:packageId` | Buy credits |
| GET | `/api/admin/metrics` | Generation metrics (ADMIN) |
| PUT | `/api/admin/config` | Update thresholds (ADMIN) |

---

## 🔐 Security

- JWT auth with refresh tokens (15min access, 7d refresh)
- Bcrypt password hashing (12 rounds)
- Role-based access control (USER/ADMIN)
- Rate limiting (100 req/min default, configurable)
- API key system for automation
- All secrets via environment variables

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT © 2024 PhotoGen AI
