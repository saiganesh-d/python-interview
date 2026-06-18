# 07 — Azure & Cloud Concepts (Full-Stack Engineer)

> **Role:** Engineer / Senior Engineer FullStack — React + Python/FastAPI (Cloud: Azure/AWS) @ Fractal Analytics
> **Candidate:** Saiganesh
> **The honest reality:** My production cloud experience is **on-premise (TARA)** and **self-managed VPS** (Render / Hetzner / Coolify with Docker). I have **not run a large managed Azure estate in production**. What I *do* have is a solid grip on the **underlying concepts** — managed compute, secrets, monitoring, logging, scaling — and I map them 1:1 onto Azure services and ramp fast. I studied AWS first, so I lean on AWS↔Azure equivalence.
>
> **Rule for this file:** Concept first → Azure service second → AWS equivalent third. Never bluff hands-on depth I don't have. When a real number is needed I write `[fill in: ...]`.

---

## 0. The honest framing — how to handle "you don't have Azure depth"

**⭐ Q: The JD is Azure-heavy. How much real Azure have you actually run in production?**

Out loud:
> "Let me be straight with you. My production experience is on-premise — that's TARA, our RAG copilot running on-prem — and self-managed VPS infrastructure: Render, Hetzner, Coolify, all Docker-based. So I haven't operated a big managed Azure estate day-to-day in production.
>
> What I *have* done is build and run the things Azure services *abstract*: I deploy containers, manage secrets, wire up monitoring and centralized logging, handle scaling and zero-downtime deploys myself. So when I look at Azure, I'm not learning the concepts — App Service is just managed compute with deployment slots, Key Vault is a managed secrets store, App Insights is APM. I'm learning the *console, the SDK names, and the gotchas*, and that's a fast ramp, not a slow one. I also studied AWS in depth, so I have a mental equivalence table — Beanstalk to App Service, Lambda to Functions, Secrets Manager to Key Vault — that I lean on."

Why this works: it's honest, it reframes "no Azure" as "strong fundamentals + fast mapping," and it gives the interviewer concrete proof points (Docker, secrets, monitoring) instead of vague confidence.

**Q: How do you handle a question where you genuinely don't know the Azure specific?**

Out loud:
> "I'll tell you the concept and how I'd do it on infrastructure I know, then say 'on Azure I believe the service is X — I'd confirm the exact knob in the portal/docs.' I'd rather be precise about what I know and explicit about what I'd verify than guess and be wrong in production."

**The don't-bluff line (memorize):**
> "I don't want to oversell hands-on Azure hours. I'll show you I understand the *concept* deeply and can map it — and I ramp on the specifics quickly."

**Q: Why should we hire someone who hasn't run Azure for an Azure-leaning role?**

Out loud:
> "Because cloud platforms are 80% shared concepts and 20% vendor-specific surface. The 80% I have cold — managed compute, statelessness, secrets via identity, the three pillars of observability, CI/CD, horizontal scaling. The 20% is portal navigation and exact SDK calls, which is days-to-weeks, not months. And I've already done the conceptually *hardest* version of some of these by hand — for example I built a secrets vault, which is exactly what Key Vault productizes."

---

## 1. ⭐ The master mapping table — Concept → Azure → AWS

This is the spine of the whole topic. Be able to recite any row.

| Concept | Azure service | AWS equivalent | My proof / mapping note |
|---|---|---|---|
| **Managed web app (PaaS)** | **App Service / Web App** | Elastic Beanstalk | VMS (Django/FastAPI+React) → App Service |
| **Raw VM (IaaS)** | **Azure Virtual Machine** | EC2 | TARA on-prem boxes → lift to Azure VM |
| **Managed containers (serverless-ish)** | **Azure Container Apps** | ECS Fargate | My Docker/Coolify workloads → Container Apps |
| **Container orchestration (k8s)** | **AKS** (Azure Kubernetes Service) | EKS | TARA at scale → AKS |
| **Single container, quick** | **Azure Container Instances (ACI)** | ECS task / Fargate task | one-off jobs |
| **Serverless functions** | **Azure Functions** | AWS Lambda | event/cron glue |
| **Secrets / keys / certs** | **Key Vault** | Secrets Manager / KMS | **Secret Vault project → directly analogous** |
| **Metrics + alerts** | **Azure Monitor** | CloudWatch (metrics/alarms) | my Prometheus-style thinking |
| **APM / distributed tracing** | **Application Insights** | X-Ray | trace a slow endpoint |
| **Log aggregation + query** | **Log Analytics (+ KQL)** | CloudWatch Logs (+ Logs Insights) | central log store |
| **Workflow orchestration** | **Logic Apps** | Step Functions | low-code integration flows |
| **Relational DB (managed)** | **Azure DB for PostgreSQL / Azure SQL** | RDS | VMS Postgres → Azure DB for PostgreSQL |
| **Object/blob storage** | **Blob Storage** | S3 | React static build, file uploads, RAG docs |
| **CI/CD** | **Azure Pipelines / GitHub Actions** | CodePipeline / GH Actions | my GH Actions experience |
| **Container registry** | **ACR** (Azure Container Registry) | ECR | push Docker images |
| **Identity / SSO** | **Azure AD / Entra ID** | IAM + Cognito | app auth + managed identity |
| **Workload identity (no creds)** | **Managed Identity** | IAM Roles for service | app → Key Vault without a password |
| **API gateway** | **API Management (APIM)** | API Gateway | rate limit, keys, versioning |
| **Managed Redis cache** | **Azure Cache for Redis** | ElastiCache | session/cache layer |
| **Message broker / queue** | **Service Bus** | SQS/SNS | vs my RabbitMQ experience |
| **Global edge router / WAF** | **Front Door** | CloudFront + WAF | global entry + CDN |
| **Regional L7 LB + WAF** | **Application Gateway** | ALB | path routing in a region |
| **L4 load balancer** | **Azure Load Balancer** | NLB | TCP/UDP balancing |
| **Static site hosting** | **Static Web Apps** | S3 + CloudFront / Amplify | React build hosting |
| **CDN** | **Azure CDN / Front Door CDN** | CloudFront | static asset edge cache |
| **Private network** | **VNet** | VPC | network isolation |
| **Firewall rules** | **NSG** (Network Security Group) | Security Groups | subnet/NIC rules |

**One-line elevator version:** *"Beanstalk→App Service, EC2→VM, Fargate→Container Apps, EKS→AKS, Lambda→Functions, Secrets Manager→Key Vault, CloudWatch→Monitor, X-Ray→App Insights, CloudWatch Logs→Log Analytics, Step Functions→Logic Apps, S3→Blob, RDS→Azure DB."*

---

## 2. Cloud fundamentals (the 80% I have cold)

**⭐ Q: IaaS vs PaaS vs SaaS — explain it.**

Out loud:
> "It's about how much of the stack you manage versus the provider.
> - **IaaS** — you get raw infrastructure: VMs, network, disks. You manage OS, runtime, patching, app. Azure VM / EC2. Maximum control, maximum ops burden. That's basically what I run today on Hetzner.
> - **PaaS** — you bring code, the platform runs it. No OS patching, the platform handles scaling and the runtime. Azure App Service / Beanstalk. Less control, far less ops.
> - **SaaS** — you just use the finished software. Microsoft 365, Gmail. You manage nothing but your data and config.
>
> Rule of thumb: pick the **highest-level abstraction that still meets your requirements**, because every layer you hand off is ops you don't pay for. I'd put VMS on App Service (PaaS) and only drop to VM/AKS for TARA if I needed GPU or custom kernel-level control."

**Q: Regions vs Availability Zones?**

Out loud:
> "A **region** is a geographic area — e.g. Central India, East US — a cluster of datacenters. An **availability zone** is one or more physically separate datacenters *within* a region, with independent power, cooling, and network. You spread instances across zones so one datacenter fire doesn't take you down. You choose **region** for latency to users and data residency/compliance; you use **zones** for high availability inside that region. Cross-**region** is for disaster recovery, not just HA."

**⭐ Q: Horizontal vs vertical scaling?**

Out loud:
> "**Vertical (scale up)** = bigger box — more CPU/RAM on the same instance. Simple, but there's a ceiling and it usually means downtime to resize, and it's a single point of failure. **Horizontal (scale out)** = more boxes behind a load balancer. No hard ceiling, gives you redundancy too, but your app *must be stateless* for it to work. I always design for horizontal — keep no session in process memory, push state to Postgres / Redis / Blob — which is exactly what App Service and Container Apps autoscaling assume."

**Q: What's autoscaling and what do you scale on?**

Out loud:
> "Autoscaling adds/removes instances automatically based on a metric or schedule. Common triggers: CPU %, memory, request queue length, or HTTP requests per second. Container Apps can even **scale to zero** when idle and scale on concurrent requests via KEDA. You set min/max instances and a target metric. Watch out for flapping — set a cooldown and a sensible min so you don't thrash. For predictable load (business hours) schedule-based scaling beats reactive."

**Q: Load balancing — L4 vs L7?**

Out loud:
> "A load balancer spreads traffic across healthy instances and removes dead ones via health checks. **L4** balances on TCP/UDP — fast, protocol-agnostic — Azure Load Balancer / AWS NLB. **L7** understands HTTP, so it can route by path/host, terminate TLS, do WAF — Application Gateway / ALB, and Front Door at the global edge. For a web app I usually want L7 so I can route `/api` to the backend and `/` to the static frontend, and get a WAF for free."

**⭐ Q: Why does statelessness matter so much in the cloud?**

Out loud:
> "Because the cloud can kill and recreate your instance at any time, and horizontal scaling means any request can land on any instance. If a server holds session in local memory or writes files to local disk, those break the moment you scale out or an instance recycles. So: no in-memory sessions — use Redis or signed JWTs; no local file writes — use Blob storage; config from env/Key Vault, not baked in. Stateless = freely replaceable, which is the whole point. I already build this way for my Dockerized VPS deploys."

**⭐ Q: Managed identity — what is it and why is it a big deal?**

Out loud:
> "It's the cloud answer to 'how does my app authenticate to other cloud services without storing a credential anywhere?' The platform gives the app an identity in Azure AD / Entra. The app asks the local metadata endpoint for a token, presents it to Key Vault / Storage / DB, and gets in — **no password, no key, nothing in code, env, or config to leak or rotate.** Two kinds: **system-assigned** (tied to one resource's lifecycle) and **user-assigned** (a standalone identity you can attach to many resources). AWS equivalent is IAM roles. This is the single most important cloud security pattern and it kills the 'secret-zero' problem — even Key Vault access itself needs no stored secret."

**Q: Shared responsibility model?**

Out loud:
> "Security is split. The **provider** secures the cloud *of* the platform — physical datacenters, hypervisor, the managed service internals. The **customer** secures what's *in* the cloud — their data, access control/IAM, network config, app code, and patching anything they manage. The line *moves with the service level*: with IaaS you patch the OS; with PaaS the provider does; with SaaS almost everything is theirs. Misconfiguration on the customer side — a public storage bucket, an open NSG — is the classic breach, not the provider being hacked."

**Q: Cost basics — how do you think about cloud cost?**

Out loud:
> "Pay-as-you-go by consumption: compute by instance-size × time, storage by GB, egress bandwidth (often the sneaky one), and per-request for serverless. Levers: right-size instances, autoscale down / scale-to-zero when idle, use **reserved instances or savings plans** for steady baseline load (big discount for commitment), spot/low-priority VMs for interruptible batch, cache to cut DB and egress, set **budgets and cost alerts**. Serverless (Functions/Container Apps) is great for spiky or low traffic because you pay near-zero at idle; a 24/7 VM is cheaper once load is constant and high. My VPS habit of running lean transfers directly."

**⭐ Q: High availability vs disaster recovery?**

Out loud:
> "**HA** is staying up through *small, expected* failures — an instance dies, a zone blips — usually via redundancy across availability zones with automatic failover. Measured in 'nines' of uptime. **DR** is recovering from a *large* event — a whole region down, data corruption — usually via cross-region backups/replicas. Measured by **RTO** (how fast you recover) and **RPO** (how much data you can afford to lose). HA is about *availability now*; DR is about *recoverability after catastrophe*. They're complementary — multi-zone for HA, multi-region backups for DR."

**Q: What's a CDN and when do you use one?**

Out loud:
> "A Content Delivery Network caches content at edge locations near users, so a user in India hits an Indian edge node instead of a US origin. Cuts latency, offloads the origin, and absorbs spikes. Perfect for static assets — my React build's JS/CSS/images go on Blob + Azure CDN or Front Door. You set cache TTLs and bust the cache on deploy with content-hashed filenames."

**⭐ Q: The three pillars of observability — monitoring vs logging vs tracing?**

Out loud:
> "Three different questions:
> - **Metrics / monitoring** — numeric time-series: CPU, request rate, error rate, p95 latency. Answers *'is something wrong and how bad?'* → **Azure Monitor**. Cheap, aggregated, alertable.
> - **Logs** — discrete timestamped events with detail. Answers *'what exactly happened in this request?'* → **Log Analytics**, queried with **KQL**.
> - **Traces** — the path of one request across services, with timing per hop. Answers *'where in the chain did the time go?'* → **Application Insights** distributed tracing.
>
> Workflow: a metric alert fires ('error rate up'), I pull logs to see *what* failed, and a trace to see *where* in the call chain. You need all three; they answer different questions."

---

## 3. Azure compute — deep dives

### 3a. ⭐ App Service / Web App (managed PaaS web hosting)

**Q: What is App Service and when do you reach for it?**

Out loud:
> "App Service is Azure's PaaS for web apps and APIs — you push code or a container, it runs it with managed OS, patching, TLS, scaling, and custom domains. It's my default for a standard web API or full-stack app like VMS — Django/FastAPI backend goes straight on App Service, no servers to babysit. AWS's Elastic Beanstalk is the equivalent."

**Q: What are deployment slots?**

Out loud:
> "Slots are full live copies of the app — typically a `staging` slot next to `production`. You deploy to staging, warm it up and smoke-test against the real environment, then **swap** — Azure flips the routing so staging becomes production instantly. That gives **zero-downtime, blue-green deploys** and an instant rollback by swapping back. App settings can be marked slot-specific so staging keeps its own config. This is exactly the zero-downtime pattern I do manually with Coolify, but built-in."

**Q: How does scaling work on App Service?**

Out loud:
> "Two axes. **Scale up** = change the App Service **Plan** tier — bigger instances (vertical). **Scale out** = more instances (horizontal), manual or autoscale on CPU/memory/schedule. The Plan is the underlying compute you pay for; multiple apps can share one Plan. For real autoscale and slots you need Standard tier or above."

**Q: What are App Settings / configuration?**

Out loud:
> "Environment variables and connection strings managed by the platform, injected into the app at runtime — so config lives outside the code. Best practice: don't put raw secrets here; instead store a **Key Vault reference** so App Service pulls the secret from Key Vault via managed identity at startup. Slot-specific settings let staging and prod differ."

**Trade-off note:** App Service is easiest but less flexible than containers — you're on their runtime stack and scaling model. If I need full control of the image, fine-grained scaling, or microservices, I move to Container Apps or AKS.

### 3b. Azure Virtual Machine (IaaS)

**Q: When would you actually use a raw VM?**

Out loud:
> "When I need control PaaS won't give me: a specific OS/kernel, GPU for ML inference, custom system dependencies, or a lift-and-shift of something not container-ready. TARA on-prem is GPU-heavy RAG — if I migrated it as-is, a GPU VM (or AKS with GPU nodes) is the honest first step. The cost is that I own OS patching, scaling, and HA myself — that's the IaaS tax. So VMs are a deliberate choice for control, not a default."

### 3c. ⭐ Containers — Container Apps vs AKS vs ACI

**Q: Azure has three container options — what's the difference?**

Out loud:
> "All run my Docker images; they differ in how much orchestration you manage:
> - **Azure Container Instances (ACI)** — single container, fastest start, no orchestration. Good for a one-off job or burst task. No autoscaling/ingress story to speak of.
> - **Azure Container Apps** — serverless containers on managed Kubernetes I never see. Gives me HTTP ingress, revisions (blue-green), **autoscale including scale-to-zero** via KEDA, and dapr if I want it. This is my sweet spot — the power of containers without running a cluster. Maps to ECS Fargate.
> - **AKS** — full managed Kubernetes. Maximum control and ecosystem, but I own the cluster, node pools, upgrades, networking. Worth it for large microservice estates or when I need specific k8s features/operators. Maps to EKS.
>
> My rule: **Container Apps unless I have a concrete reason for AKS.** Most teams reach for AKS too early and pay the operational tax."

**⭐ Q: App Service vs Container Apps vs AKS — pick one and justify.**

Out loud:
> "Decision tree:
> - Standard web app / API, want least ops, fine on the platform's runtime → **App Service**.
> - Custom container, microservices, event-driven, want scale-to-zero and revisions, don't want to run k8s → **Container Apps**.
> - Big estate, need full Kubernetes control, operators, service mesh, multi-team → **AKS**.
>
> For VMS I'd pick App Service — it's a classic web app. For TARA I'd start on Container Apps (or AKS if it needs GPU node pools and heavy orchestration). I default to the *least* operational overhead that meets the requirement, and only climb to AKS when something specific demands it."

### 3d. ⭐ Azure Functions (serverless)

**Q: What are Azure Functions and the triggers/bindings model?**

Out loud:
> "Functions are serverless event-driven compute — a small piece of code that runs in response to an event, and you pay only while it runs. The model is **triggers and bindings**: a **trigger** starts the function (HTTP request, timer/cron, a Service Bus message, a Blob upload, a queue item); **bindings** are declarative I/O — an input binding pulls data in, an output binding writes results out — so you don't hand-write client code for, say, dropping a message on a queue. Great for glue, webhooks, scheduled jobs, and lightweight APIs. AWS Lambda is the equivalent."

**Q: Consumption plan and cold starts?**

Out loud:
> "On the **Consumption plan** you pay per execution and resources used, and it scales to zero when idle — cheapest for spiky/low traffic. The trade-off is **cold start**: when an idle function gets a request, the platform spins up a worker first, adding latency (hundreds of ms to seconds, worse for heavy runtimes). Mitigations: **Premium plan** with pre-warmed instances, keep functions lightweight, or use a different compute model for latency-critical paths. So I wouldn't put a user-facing low-latency endpoint on a cold-start-prone consumption function without thinking about it."

**Q: Functions vs Container Apps — when each?**

Out loud:
> "Functions for short, event-triggered, stateless tasks where the triggers/bindings model saves me plumbing. Container Apps when I have a longer-running service, want a full container/image, or need more control over the runtime and still want scale-to-zero. They overlap; I pick by 'is this a function or a service?'"

---

## 4. ⭐ Secrets — Key Vault (tie to Secret Vault project)

**Q: What is Azure Key Vault?**

Out loud:
> "Key Vault is a managed secrets store. It holds three kinds of objects: **secrets** (arbitrary strings — DB passwords, API keys, connection strings), **keys** (cryptographic keys for encrypt/decrypt/sign, optionally HSM-backed), and **certificates** (TLS certs, with lifecycle management). The whole point: secrets live in one audited, access-controlled place instead of scattered in code, env files, and config. I literally built a project — **Secret Vault** — that does exactly this category of thing, so I understand it from the inside: encryption at rest, access control, audit, rotation. Key Vault is the productized, managed version. AWS equivalent is Secrets Manager (for secrets) plus KMS (for keys)."

**⭐ Q: How does an app read a secret from Key Vault without storing a credential? (the secret-zero problem)**

Out loud:
> "**Managed identity** — this is the elegant part. The app has a managed identity in Entra ID. At runtime it asks the local instance metadata endpoint for an Azure AD token (no credential involved — the platform vouches for it), presents that token to Key Vault, Key Vault checks the access policy / RBAC for that identity, and returns the secret. So there is **no master password anywhere** — not in code, env, or config. You've solved 'how do I secure the secret that secures my secrets.' That's the failure mode my Secret Vault project had to design around manually; Azure solves it cleanly with platform identity."

**Q: Access policies vs RBAC on Key Vault?**

Out loud:
> "Two authorization models. **Access policies** are the older Key Vault-native model — per-identity you grant specific permissions (get/list/set secrets, etc.) on that one vault. **Azure RBAC** is the newer, recommended model — you assign roles like 'Key Vault Secrets User' at a scope (vault, resource group, subscription), consistent with the rest of Azure's RBAC. RBAC is generally preferred now for consistency and finer management; access policies are simpler but vault-local. Either way, grant least privilege — an app usually only needs *get* on the specific secrets it uses."

**Q: What is soft-delete and why does it matter?**

Out loud:
> "Soft-delete (and purge protection) mean a deleted vault or secret isn't gone immediately — it's recoverable for a retention window, and purge protection blocks even a hard delete during that window. It protects against accidental or malicious deletion taking out your secrets and breaking every app that depends on them. It's on by default now. The lesson: deleting a secret is a high-blast-radius action, so the platform gives you an undo."

**Q: How do you rotate secrets?**

Out loud:
> "Key Vault supports versioned secrets — a new version is added, old ones retained — and you can automate rotation (e.g. with an Event Grid trigger or a Function) and integrate with services that auto-rotate. Apps reference the secret and pick up the new version. The principle is short-lived credentials and no human ever copy-pasting a production secret. Honestly the *best* rotation is not having a stored secret at all — use managed identity to the DB/storage so there's no password to rotate."

---

## 5. ⭐ Observability — Monitor, App Insights, Log Analytics + KQL

**Q: What is Azure Monitor?**

Out loud:
> "Azure Monitor is the umbrella metrics-and-alerting platform. It collects metrics from every resource — CPU, memory, request counts, latency — lets you build dashboards, and define **alert rules** that fire on thresholds (e.g. 'p95 latency > 1s for 5 min' or 'error rate > 1%') routed to action groups (email, Teams, PagerDuty, webhook, auto-scale). It's the 'is something wrong, how bad, tell me' layer. CloudWatch is the AWS equivalent. App Insights and Log Analytics feed into the Monitor ecosystem."

**⭐ Q: What does Application Insights give you?**

Out loud:
> "App Insights is the APM layer. You add the SDK/agent to the app and it auto-collects:
> - **Request telemetry** — every HTTP request: route, duration, status, success/fail.
> - **Dependency telemetry** — outbound calls (DB queries, HTTP to other services, cache) with timings — so you see *which downstream call is slow*.
> - **Distributed tracing** — a correlation ID threads through services so you can follow one request end-to-end across the frontend, API, and dependencies, and see the time spent at each hop on a timeline.
> - **Live metrics** — a real-time firehose of requests/failures, great during a deploy.
> - **Exceptions** with stack traces, and the **application map** that visualizes services and their health.
>
> AWS's X-Ray is the closest equivalent, though App Insights is broader."

**⭐ Q: A production endpoint is slow. Walk me through debugging it with Azure tooling.**

Out loud:
> "Step by step:
> 1. **Confirm and scope with Monitor metrics** — is latency up globally or one endpoint? When did it start? Correlate with a deploy or traffic spike.
> 2. **Open App Insights for that operation** — look at the **request** duration distribution (is it p99 only or the whole curve?) and drill into the **dependency** breakdown. Usually the time is in one dependency — a slow SQL query, an external API, or a cache miss storm.
> 3. **Pull a distributed trace** of a slow sample request — see exactly which hop ate the time. App Insights shows the waterfall.
> 4. **Query logs in Log Analytics with KQL** for that operation — find the slow requests, group by route, correlate with exceptions or a specific parameter.
> 5. **Form a hypothesis and verify** — e.g. 'missing DB index on this query,' confirm with the dependency timing, fix, deploy to a staging slot, watch live metrics on swap.
>
> The point: metrics tell me *that* it's slow, traces tell me *where*, logs tell me *why*. I don't guess — I follow the three pillars."

**Q: What is Log Analytics and KQL?**

Out loud:
> "Log Analytics is the centralized log store (a 'workspace') where logs and telemetry land. **KQL — Kusto Query Language** — is how you query it: a pipe-based, read-only query language, very SQL-adjacent but flows left to right through `|` operators. You filter, aggregate, and visualize over huge log volumes fast. It's the same engine App Insights queries sit on. CloudWatch Logs Insights is the AWS analog."

**⭐ Q: Write a couple of KQL queries.**

Out loud (these are illustrative — I'd confirm exact table/column names in the workspace):

```kql
// 1) Count failed requests in the last hour, grouped by endpoint
requests
| where timestamp > ago(1h)
| where success == false
| summarize failures = count() by name, resultCode
| order by failures desc
```

```kql
// 2) p95 latency per endpoint over the last 24h, slowest first
requests
| where timestamp > ago(24h)
| summarize p95 = percentile(duration, 95), p50 = percentile(duration, 50), reqs = count() by name
| order by p95 desc
```

```kql
// 3) Slowest dependencies (which downstream call is killing us)
dependencies
| where timestamp > ago(1h)
| summarize avgDuration = avg(duration), calls = count() by target, type
| order by avgDuration desc
```

```kql
// 4) Exceptions in the last 30 min with message and operation
exceptions
| where timestamp > ago(30m)
| project timestamp, type, outerMessage, operation_Name
| order by timestamp desc
```

```kql
// 5) Error-rate trend, 5-minute buckets, to see when it spiked
requests
| where timestamp > ago(6h)
| summarize total = count(),
            failed = countif(success == false) by bin(timestamp, 5m)
| extend errorRate = todouble(failed) / total
| order by timestamp asc
```

> "Pattern is always the same: pick the table (`requests`, `dependencies`, `exceptions`, `traces`), `where` to filter, `summarize` to aggregate, `order`/`project` to shape. Very readable once you internalize the pipe model."

---

## 6. Logic Apps (workflow orchestration)

**Q: What are Logic Apps?**

Out loud:
> "Logic Apps are a low-code/no-code workflow orchestrator. You build a flow visually: a **trigger** (a new email, an HTTP call, a schedule, a Service Bus message) kicks off a sequence of **actions** with hundreds of prebuilt connectors — Office 365, Salesforce, Blob, SQL, etc. — plus conditionals, loops, and error handling. Great for integration glue: 'when a file lands in Blob, parse it, write a row to the DB, post to Teams.' It's the managed-workflow equivalent of AWS Step Functions, though Logic Apps leans more toward SaaS integration than pure state-machine orchestration. For heavy custom logic I'd use Functions; for stitching services together with minimal code, Logic Apps."

---

## 7. Data, integration & networking services (breadth)

**Q: Azure SQL vs Azure Database for PostgreSQL?**

Out loud:
> "Both are managed relational DBs — provider handles patching, backups, HA, point-in-time restore. **Azure SQL** is managed Microsoft SQL Server. **Azure Database for PostgreSQL** is managed Postgres (Flexible Server is the current deployment model, with zone-redundant HA and good control over config). VMS uses Postgres, so I'd go Azure DB for PostgreSQL — same engine I run today, just managed. AWS RDS is the equivalent on either engine. Key wins of managed: automatic backups, failover, read replicas, no OS to patch."

**Q: Blob Storage — what do you use it for?**

Out loud:
> "Object storage for unstructured data — files, images, backups, my React static build, and the document corpus for TARA's RAG. Organized into containers; objects are blobs accessed by URL. **Access tiers** — hot/cool/archive — trade cost for retrieval latency. You serve public assets via a CDN in front of it, and grant scoped, time-limited access with SAS tokens or, better, managed identity. It's Azure's S3."

**Q: Azure AD / Entra ID — what's its role?**

Out loud:
> "Entra ID (formerly Azure AD) is Azure's identity provider — it handles user authentication and SSO (OAuth2/OIDC), and it's the backbone of **RBAC** and **managed identities** for workloads. So it does double duty: signing in *users* to my app, and giving *services* their identity to call Key Vault, Storage, DB without secrets. AWS splits this into IAM (service/access) plus Cognito (user sign-in)."

**Q: What is API Management (APIM)?**

Out loud:
> "APIM is a managed API gateway — it sits in front of my backend APIs and adds rate limiting/throttling, API keys and subscriptions, auth (validate JWTs), request/response transformation, versioning, caching, and a developer portal with docs. You use it when you're exposing APIs to multiple consumers and want one control plane for policy and analytics. AWS API Gateway is the equivalent. For a single internal app it can be overkill; for a public API product it's the right tool."

**Q: Azure Cache for Redis — when?**

Out loud:
> "Managed Redis — in-memory key/value store. I reach for it to cache expensive query results or computed responses, store sessions (so the app stays stateless), rate-limit, or as a fast message/pub-sub layer. It cuts DB load and tail latency. AWS ElastiCache is the equivalent. In a RAG system I might cache embeddings or frequent retrieval results here."

**Q: Service Bus vs RabbitMQ?**

Out loud:
> "Both are message brokers for async, decoupled communication. **RabbitMQ** I've worked with — it's a self-hosted (or managed elsewhere) AMQP broker, very flexible routing with exchanges. **Service Bus** is Azure's *managed* enterprise broker — queues and topics (pub/sub), with enterprise features: sessions, dead-letter queues, deduplication, scheduled and ordered delivery, transactions. The trade: RabbitMQ gives me control and portability; Service Bus gives me zero-ops and tight Azure integration (it can trigger Functions and Logic Apps directly). For high-throughput streaming/event ingestion I'd instead look at Event Hubs (Kafka-like). AWS analog is SQS (queues) + SNS (pub/sub). My RabbitMQ experience maps straight onto the queue/topic concepts — I just hand off the hosting."

**⭐ Q: Front Door vs Application Gateway vs Load Balancer — which sits where?**

Out loud:
> "Three layers of traffic management:
> - **Azure Load Balancer** — **L4**, regional, TCP/UDP. Raw, fast, protocol-agnostic. AWS NLB.
> - **Application Gateway** — **L7**, *regional*, HTTP-aware: path/host routing, TLS termination, and a **WAF**. AWS ALB.
> - **Front Door** — **L7 + global edge**: global load balancing across regions, CDN caching, WAF, and routing users to the nearest healthy region. AWS CloudFront + global accelerator + WAF.
>
> Mental model: **Front Door = global front door + CDN + WAF; Application Gateway = regional L7 router + WAF; Load Balancer = L4 plumbing.** For a single-region web app, Application Gateway is usually enough; go Front Door when you're multi-region or want edge caching globally."

**Q: VNets and NSGs — the networking basics?**

Out loud:
> "A **VNet** (Virtual Network) is your private, isolated network in Azure — your own IP space, subnets, routing. It's how you keep resources off the public internet and let them talk privately. AWS calls it a VPC. An **NSG** (Network Security Group) is a stateful firewall rule set you attach to a subnet or NIC — allow/deny by source/dest IP, port, protocol. AWS calls these Security Groups. The pattern: put the DB and backend in private subnets, only the load balancer/gateway is public, and NSGs enforce who can reach what. **Private Endpoints** let me reach PaaS services like Key Vault or Postgres over the VNet instead of the public internet — that's the secure-by-default posture I'd aim for."

---

## 8. ⭐ Deploying a full-stack app on Azure (the topology)

**Q: Walk me through deploying a React + FastAPI/Django + Postgres app on Azure, end to end.**

Out loud (describe the topology):
> "Here's how I'd wire VMS-style app on Azure:
>
> **Frontend (React static build):**
> - `npm run build` produces static assets. Host them on **Azure Static Web Apps** (purpose-built, gives free global CDN + CI from GitHub), *or* **Blob Storage static website + Azure CDN/Front Door** if I want more control. Either way, served from the edge, cached, content-hashed filenames for cache-busting.
>
> **Backend (FastAPI / Django API):**
> - Containerize it, push the image to **ACR** (Azure Container Registry).
> - Run it on **App Service** (simplest) or **Container Apps** (if I want scale-to-zero / revisions / custom runtime). Horizontal autoscale on CPU/requests. Stateless — no local session/files.
>
> **Database:**
> - **Azure Database for PostgreSQL (Flexible Server)** — managed, zone-redundant HA, automated backups. Lives in a **private subnet**, reachable from the API over the VNet via **Private Endpoint**, not the public internet.
>
> **Secrets:**
> - **Key Vault** holds the DB connection string, API keys, JWT signing key. The API has a **managed identity**; it reads secrets from Key Vault at startup via that identity — **no credentials stored anywhere**. App settings use Key Vault references.
>
> **Identity / auth:**
> - **Entra ID** for user sign-in (OIDC) if needed, and it's the trust anchor for the managed identities.
>
> **Observability:**
> - **Application Insights** SDK in the API → request, dependency, and distributed-trace telemetry.
> - Logs and telemetry flow into a **Log Analytics** workspace; I query with KQL.
> - **Azure Monitor** alert rules on error rate and p95 latency → action group to Teams/email.
>
> **Edge / routing:**
> - **Front Door** (or Application Gateway if single-region) out front: routes `/` to the static frontend, `/api/*` to the backend, terminates TLS, and provides a **WAF**.
>
> **Caching / async (if needed):**
> - **Azure Cache for Redis** for sessions/caching; **Service Bus** for async jobs that a **Function** or worker processes.
>
> **CI/CD:**
> - **GitHub Actions or Azure Pipelines**: build → test → build image → push to ACR → deploy to a **staging slot/revision** → smoke test → **swap to production** for zero-downtime.
>
> So in one line: **Front Door → (static frontend on Static Web Apps / Blob+CDN) + (FastAPI on App Service/Container Apps) → Postgres over a private endpoint, secrets from Key Vault via managed identity, telemetry to App Insights/Log Analytics, alerts via Monitor.**"

**ASCII sketch (say you'd draw this):**

```
                         Users
                           |
                     [ Front Door ]  (global L7, WAF, CDN)
                       /          \
                 /  (static)        \ (/api/*)
                /                     \
   [ Static Web Apps /        [ App Service or Container Apps ]
     Blob + CDN ]  (React)        (FastAPI / Django, managed identity)
                                      |            |
                              (private endpoint)   |  (token, no creds)
                                      |            v
                          [ Azure DB for PostgreSQL ]   [ Key Vault ]
                                      
   Telemetry: App Insights  --->  Log Analytics (KQL)  --->  Azure Monitor (alerts)
   CI/CD: GitHub Actions / Azure Pipelines -> ACR -> staging slot -> swap
```

---

## 9. ⭐ CI/CD on Azure

**Q: How do you set up CI/CD to Azure?**

Out loud:
> "Two main options, both fine: **Azure Pipelines** (in Azure DevOps, YAML-defined) or **GitHub Actions** (which I've used). The pipeline stages:
> 1. **CI** — on push/PR: install, lint, run tests, build.
> 2. **Build image** — build the Docker image, tag with the commit SHA.
> 3. **Push to ACR** — Azure Container Registry stores the image (AWS ECR equivalent).
> 4. **Deploy** — deploy that image to a **staging slot** (App Service) or a new **revision** (Container Apps). Run DB migrations and smoke tests against staging.
> 5. **Promote** — **swap** staging→production for zero downtime; instant rollback by swapping back or routing to the previous revision.
>
> Auth from the pipeline to Azure uses a **service principal / OIDC workload identity federation** — no long-lived secret in the CI system. Environment config comes from Key Vault, not hardcoded. This is the same flow I run on Coolify/GitHub Actions today, just targeting Azure resources."

**Q: What's ACR and why use it over Docker Hub?**

Out loud:
> "Azure Container Registry — a private, managed registry inside Azure. Versus Docker Hub: it's private by default, lives next to my compute (faster pulls, no egress), integrates with Entra ID/managed identity for auth, supports geo-replication, and can scan images for vulnerabilities. App Service / Container Apps / AKS pull straight from it with a managed identity — no registry password to manage."

---

## 10. ⭐ Migration & scenario follow-ups

**Q: How would you migrate TARA (on-prem RAG) to Azure?**

Out loud:
> "I'd do it in stages, honest about what's hard:
> 1. **Assess** — TARA is GPU-heavy RAG with a vector store and on-prem data. First question is data residency and GPU needs.
> 2. **Lift the compute** — containerize the services (much is already Docker-friendly) and run on **Container Apps**, or **AKS with GPU node pools** if I need GPU inference and orchestration, or **GPU VMs** as the most lift-and-shift option. I'd start at the least-ops option that meets the GPU requirement.
> 3. **Data** — move the document corpus to **Blob Storage**; put the vector DB on a managed option or a VM, and any relational metadata on **Azure DB for PostgreSQL**.
> 4. **Secrets** — every API key / model credential goes into **Key Vault**, accessed via **managed identity** — kills the on-prem habit of keys in env files.
> 5. **Observability** — wire **App Insights** for request/dependency tracing (RAG pipelines have lots of downstream calls — embeddings, retrieval, LLM — so tracing is gold), logs to **Log Analytics**, alerts via **Monitor**.
> 6. **Networking** — VNet + private endpoints so the model/data plane isn't public; Front Door/App Gateway with WAF out front.
> 7. **CI/CD** — pipeline to ACR → Container Apps/AKS with staged rollout.
>
> I'd be candid that GPU cost and data-movement/compliance are the real migration risks, not the app wiring. I'd pilot one service first, validate cost and latency, then move the rest."

**Q: Migrate VMS to Azure — what's the shape?**

Out loud:
> "VMS is a textbook PaaS case: **App Service** for the Django/FastAPI backend, **Static Web Apps** (or Blob+CDN) for the React frontend, **Azure DB for PostgreSQL** for the database, **Key Vault** + managed identity for secrets, **App Insights**/Monitor for observability, GitHub Actions → ACR → staging slot → swap for deploys. It's the cleanest of the three because it's a standard web app — no GPU, no exotic dependencies."

**Q: How do apps read secrets without storing credentials? (asked again — nail it)**

Out loud:
> "**Managed identity.** The platform issues the app an identity in Entra ID. The app requests a token from the local metadata endpoint — no secret involved — and presents it to Key Vault (or Storage, or the DB). Key Vault checks RBAC for that identity and returns the secret. Nothing sensitive is stored in code, env, or config. It dissolves the 'secret-zero' problem. It's the thing my hand-rolled Secret Vault couldn't fully solve without a platform — Azure solves it with identity."

---

## 11. Rapid-fire cheat sheet

- **IaaS/PaaS/SaaS** → you manage less at each step; pick the highest abstraction that fits.
- **App Service** = managed web app (Beanstalk). Deployment **slots** = blue-green + instant rollback.
- **Azure VM** = raw box (EC2); use for OS/GPU/control.
- **Container Apps** = serverless containers, scale-to-zero (Fargate). **AKS** = managed k8s (EKS). **ACI** = single container.
- **Functions** = serverless, triggers + bindings (Lambda). **Consumption** = pay-per-run + cold starts.
- **Key Vault** = secrets/keys/certs (Secrets Manager + KMS). Read via **managed identity**, no stored creds. **Soft-delete** = recoverable.
- **Managed identity** = workload identity, no password (IAM roles).
- **Azure Monitor** = metrics + alerts (CloudWatch).
- **App Insights** = APM, requests/dependencies/distributed tracing/live metrics (X-Ray).
- **Log Analytics + KQL** = central logs + query (CloudWatch Logs Insights).
- **Logic Apps** = low-code workflow orchestration (Step Functions).
- **Blob** = object storage (S3). **Azure DB for PostgreSQL / Azure SQL** = managed RDB (RDS).
- **ACR** = private registry (ECR). **Azure Pipelines / GitHub Actions** = CI/CD.
- **Entra ID** = identity/SSO + RBAC (IAM + Cognito). **APIM** = API gateway (API Gateway).
- **Redis Cache** = managed cache (ElastiCache). **Service Bus** = managed broker, queues+topics (SQS+SNS); **RabbitMQ** = self-hosted broker.
- **Front Door** = global L7 + CDN + WAF (CloudFront). **App Gateway** = regional L7 + WAF (ALB). **Load Balancer** = L4 (NLB).
- **VNet** = private network (VPC). **NSG** = firewall rules (Security Groups). **Private Endpoint** = reach PaaS over VNet.
- **HA** = survive small failures (multi-zone). **DR** = survive catastrophe (multi-region, RTO/RPO).
- **Three pillars**: metrics (*is it broken?*), logs (*what happened?*), traces (*where's the time?*).
- **Stateless** apps = freely scalable; push state to Redis/Blob/DB.
- **Shared responsibility**: provider secures the cloud, you secure what's in it.

---

## 12. ⭐ Traps & gotchas / don't-bluff list

**Things to never claim:**
- ❌ Don't claim years of hands-on production Azure. I haven't. Say "concepts deep, console ramping."
- ❌ Don't claim I've run AKS in production. I run Docker/Coolify, not a managed k8s cluster. Be precise.
- ❌ Don't invent specific portal click-paths or exact SDK method names if unsure — say "the exact method I'd confirm in docs."
- ❌ Don't quote uptime/cost/scale numbers I don't have — use `[fill in: ...]`.
- ❌ Don't pretend Logic Apps == Step Functions perfectly; note Logic Apps leans SaaS-integration, Step Functions leans state-machine.

**Common technical gotchas to mention (shows depth):**
- **Cold starts** on consumption-plan Functions — don't put latency-critical user paths there without Premium/pre-warm.
- **Egress bandwidth cost** — the sneaky line item; CDN and caching cut it.
- **Statelessness** — local session/files break the moment you scale out; classic cloud bug.
- **Secret-zero** — storing the credential that reaches your secret store defeats the point; managed identity solves it.
- **Misconfiguration, not hacking** — public Blob containers and over-broad NSGs are the real breach vector (shared responsibility).
- **Autoscale flapping** — set cooldowns and a sane min instance count.
- **Slot swap warmup** — swap the *warmed* slot or you ship a cold instance to prod.
- **RBAC vs access policies** on Key Vault — pick one model deliberately (RBAC preferred now).
- **AKS too early** — most teams over-reach for Kubernetes; Container Apps is usually enough.

**The closing honesty line (memorize):**
> "I'd rather tell you exactly where my hands-on Azure ends and my conceptual understanding begins. The concepts — compute, secrets via identity, the three pillars of observability, scaling, CI/CD — I have cold and have built by hand. The Azure-specific surface is a fast ramp on top of that, and I've already done the hardest analog myself with the Secret Vault project. I won't bluff depth; I'll show you I'll be productive in week one and fluent quickly."

**Numbers to fill before the interview:**
- TARA scale: `[fill in: # docs, # users, GPU type, latency]`
- VMS scale: `[fill in: users, request volume, DB size]`
- Secret Vault: `[fill in: encryption scheme, # secrets, who used it]`
- VPS footprint: `[fill in: # services, traffic, uptime achieved on Hetzner/Coolify]`
