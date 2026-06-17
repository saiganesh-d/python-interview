# Deploying QuickNotes on AWS

> This is the concrete version of the architecture in `questions/aws.md`. Be able to draw and narrate it.

## The topology
```
                         ┌─────────────────────────┐
        DNS (Route 53)   │  example.com            │
        ─────────────►   │  → CloudFront (CDN)     │
                         │     → S3 (React build)  │   static SPA, HTTPS, cached at edge
                         └─────────────────────────┘
                                     │  API calls to api.example.com
                                     ▼
                         ┌─────────────────────────┐
                         │  Application Load        │   public subnet, HTTPS (ACM cert)
                         │  Balancer (ALB)          │
                         └─────────────────────────┘
                                     │
                         ┌─────────────────────────┐
                         │  Django API (Gunicorn)   │   private subnet
                         │  on ECS Fargate / EC2    │   Auto Scaling Group
                         │  (2+ tasks across AZs)   │
                         └─────────────────────────┘
                              │                 │
                              ▼                 ▼
                   ┌──────────────────┐  ┌──────────────────┐
                   │ RDS Postgres     │  │ S3 (media/uploads)│
                   │ (private, Multi- │  │                   │
                   │  AZ, backups)    │  └──────────────────┘
                   └──────────────────┘
   Secrets Manager / SSM ── injected via IAM role
   CloudWatch ── logs + metrics + alarms
```

## Step-by-step (narrate this in the interview)

### 1. Frontend → S3 + CloudFront
```bash
cd frontend && npm run build           # outputs static files to dist/
aws s3 sync dist/ s3://quicknotes-web --delete
aws cloudfront create-invalidation --distribution-id ABC --paths "/*"
```
- S3 bucket holds the static build; CloudFront serves it globally with HTTPS + caching.
- Set the API base URL as a build-time env var (`VITE_API_URL`) pointing at `api.example.com`.

### 2. Backend → containers behind an ALB
- Containerize Django (Dockerfile → Gunicorn). Push the image to **ECR**.
- Run on **ECS Fargate** (no servers to manage) or an **EC2 Auto Scaling Group**.
- Put tasks in **private subnets** across **2+ AZs** for high availability.
- **ALB** in public subnets terminates HTTPS (ACM cert) and routes `/` to the API tasks; health checks remove unhealthy tasks.
- `collectstatic` for Django admin assets; set `SECURE_PROXY_SSL_HEADER` (already in settings) since TLS terminates at the ALB.

### 3. Database → RDS
- **RDS Postgres**, Multi-AZ, in a **private subnet** — no public access.
- App connects via `DATABASE_URL` (read from Secrets Manager). Security group: only the API's SG may reach port 5432.

### 4. Secrets & permissions → IAM + Secrets Manager
- Store `SECRET_KEY`, DB creds in **Secrets Manager** (or SSM Parameter Store).
- The ECS task / EC2 instance assumes an **IAM role** granting least-privilege read to those secrets and to the media S3 bucket. **No access keys in code.**

### 5. Networking → VPC
- VPC with public subnets (ALB, NAT GW) and private subnets (API, RDS).
- **Security groups**: ALB SG allows 443 from internet; API SG allows traffic only from the ALB SG; RDS SG allows 5432 only from the API SG.

### 6. Observability & ops
- **CloudWatch** for logs (container stdout), metrics, and alarms (CPU, 5xx rate, DB connections).
- Auto Scaling policy scales API tasks on CPU / request count.
- **CI/CD**: GitHub Actions → build & test → push image to ECR → update ECS service (rolling/blue-green); sync frontend to S3 + invalidate CloudFront.

## Why this design (the trade-off narrative)
- **Stateless API + ALB + Auto Scaling** → scales horizontally; any task can serve any request.
- **Private subnets for app + DB** → reduced attack surface.
- **Managed services (RDS, Fargate, CloudFront)** → less ops overhead, built-in HA/backups; trade some control & cost for reliability.
- **Start simple:** a single ECS service + RDS handles a lot. Add read replicas, ElastiCache, and queues (SQS) only when metrics show the need.

## Cheaper "I did this myself" version (if asked what YOU'VE actually done)
> "For a smaller deploy I've put Django on a single EC2 instance with Gunicorn + Nginx, served the React build from the same box or S3, and used RDS (or a local Postgres) for data. The architecture above is how I'd do it properly for production scale." — honest + shows the growth path.
