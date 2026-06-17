# AWS Question Bank

> You know EC2 + deploying. At mid-level, level up to **architecture & trade-offs**. ⭐ = very likely asked.

## ⭐⭐ THE deploy architecture (memorize, be able to draw it)

> **A full-stack Django + React app on AWS:**
>
> - **Frontend (React build)** → static files in an **S3 bucket**, served globally via **CloudFront** (CDN, HTTPS, caching).
> - **Backend (Django REST API)** → runs on **EC2** (or **ECS/Fargate** containers, or **Elastic Beanstalk**), behind an **Application Load Balancer (ALB)**.
> - **Auto Scaling Group** behind the ALB → scales EC2 instances on load.
> - **Database** → **RDS** (managed Postgres/MySQL), in a **private subnet**.
> - **Static/media uploads** → **S3**.
> - **DNS** → **Route 53** (`api.example.com` → ALB, `example.com` → CloudFront).
> - **Secrets** → **Secrets Manager** / **SSM Parameter Store**, accessed via **IAM roles** (never hardcode keys).
> - **Logs & metrics** → **CloudWatch**.
> - **Async/background jobs** → **SQS** + worker, or Celery.
>
> "User hits CloudFront for the React app; the app calls the API at the ALB; the ALB routes to Django on EC2/ECS; Django reads/writes RDS in a private subnet; uploads go to S3; everything authorized via IAM roles; monitored in CloudWatch."

Practice drawing this from memory until it's automatic. This single answer covers half the AWS portion.

## Core services (one-liners)

| Service | What it is |
|---|---|
| **EC2** | Virtual servers (compute). You manage the OS. |
| **S3** | Object storage (files, static sites, backups). 11 9's durability. |
| **RDS** | Managed relational DB (Postgres/MySQL/etc.) — backups, patching, replicas handled. |
| **IAM** | Identity & access — users, roles, policies. Who can do what. |
| **VPC** | Your private virtual network (subnets, route tables, gateways). |
| **Lambda** | Serverless functions — run code without managing servers, pay per invocation. |
| **API Gateway** | Managed front door for APIs (often + Lambda). |
| **ELB/ALB** | Distributes traffic across instances. ALB = layer 7 (HTTP, path/host routing). |
| **Auto Scaling** | Adds/removes instances based on metrics. |
| **CloudFront** | CDN — caches content at edge locations near users. |
| **Route 53** | DNS + health checks + routing policies. |
| **CloudWatch** | Metrics, logs, alarms, dashboards. |
| **SQS / SNS** | Message queue (decoupling) / pub-sub notifications. |
| **ECS / EKS / Fargate** | Run containers (ECS=AWS orchestrator, EKS=Kubernetes, Fargate=serverless containers). |
| **DynamoDB** | Managed NoSQL key-value/document store, single-digit-ms. |
| **ElastiCache** | Managed Redis/Memcached (caching, sessions). |

## ⭐ Key Q&A

**⭐ IAM roles vs users vs policies?**
- **User**: a person/long-lived identity (has credentials).
- **Role**: an identity *assumed temporarily* by a service or user (no long-lived keys). EC2/Lambda assume roles to get permissions — **the secure way** (no hardcoded keys).
- **Policy**: JSON document granting/denying permissions, attached to users/roles/groups. Principle: **least privilege**.

**⭐ S3 — how would you host a static React site?**
Build (`npm run build`) → upload to S3 bucket → serve via CloudFront (HTTPS + caching + custom domain). S3 alone can do static hosting but CloudFront adds CDN/HTTPS. Set cache headers; invalidate CloudFront on deploy.

**⭐ EC2 vs Lambda vs containers — when each?**
- **EC2**: full control, long-running, predictable load, legacy/stateful apps.
- **Lambda**: event-driven, spiky/short tasks, no server management, pay-per-use; cold starts + 15-min limit.
- **ECS/Fargate**: containerized apps, microservices, want portability without managing servers.

**⭐ Public vs private subnet?**
Public subnet has a route to an **Internet Gateway** (web servers/ALB). Private subnet has no direct inbound internet (databases, app servers); reaches out via a **NAT Gateway**. Best practice: app/DB in private, only ALB public.

**Security Group vs NACL?**
- **Security Group**: instance-level firewall, **stateful** (return traffic auto-allowed), allow-rules only.
- **NACL**: subnet-level, **stateless** (must allow both directions), allow + deny rules.

**⭐ How do you scale a web app on AWS?**
- **Vertical**: bigger instance (limited ceiling).
- **Horizontal**: more instances behind an ALB + Auto Scaling (preferred). Requires **stateless** app servers (store sessions in Redis/DB, not on the instance).
- DB: read replicas, caching (ElastiCache), connection pooling.
- Static content: CloudFront.

**How do you store secrets / DB passwords?**
**Secrets Manager** (rotation) or **SSM Parameter Store** (cheaper). App reads them at runtime via an IAM role. Never in code or env files committed to git.

**S3 storage classes?**
Standard (hot), Standard-IA (infrequent), Glacier / Deep Archive (cold/archival, cheaper, slower retrieval). Lifecycle policies move data automatically.

**How do you make an app highly available?**
Deploy across **multiple Availability Zones** (Multi-AZ RDS, instances in 2+ AZs behind ALB). AZs are isolated data centers; if one fails, others serve traffic.

**What is CloudFormation / IaC?**
Infrastructure as Code — define resources in templates (CloudFormation/Terraform) so infra is versioned, repeatable, reviewable. Mention you know the concept even if you've used the console.

**How do you deploy code (CI/CD)?**
Push → CI (GitHub Actions/CodePipeline) builds & tests → deploys: React build to S3 + CloudFront invalidation; backend image to ECR → ECS, or to EC2 via CodeDeploy. Blue/green or rolling to avoid downtime.

**⭐ Cost-control levers (mid-level signal)?**
Right-size instances, use Auto Scaling + spot instances for non-critical, S3 lifecycle policies, reserved/savings plans for steady load, CloudWatch billing alarms, delete idle resources.

## The Well-Architected Framework (name-drop the 6 pillars)
Operational Excellence · Security · Reliability · Performance Efficiency · Cost Optimization · Sustainability.

## If they ask about your experience
Be honest: "I've spun up EC2, deployed apps, and worked with containers. I understand the broader architecture — load balancing, RDS, S3, IAM roles — and here's how I'd deploy my project [point to `project/DEPLOY-AWS.md`]." Honesty + architectural reasoning beats faking depth.
