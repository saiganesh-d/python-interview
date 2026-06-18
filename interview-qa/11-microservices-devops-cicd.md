# Microservices, Message Brokers, Reverse Proxy, Containers & CI/CD — Deep Interview Q&A

> **Candidate framing (read this first):** Saiganesh — FullStack (React + Python/FastAPI, Cloud: Azure/AWS) at Fractal Analytics.
> The JD lists RabbitMQ / Nginx / CI-CD (GitHub Actions, Jenkins) / microservices as **good-to-have**.
> My **real, hands-on** experience is: **Docker**, **docker-compose**, **Coolify**, **Hetzner / Render VPS**, and **on-prem container deployment**. RabbitMQ and Kubernetes I know **conceptually** and have prototyped, but I haven't run RabbitMQ at production scale or operated a K8s cluster. This file teaches me to speak about all of it **honestly** — lead with what I've shipped, be candid about the edges, and never bluff operational depth I don't have.
>
> ⭐ = very likely to be asked. `[fill in: ...]` = insert a real number/fact before the interview.
>
> Three flagship projects woven throughout:
> - **TARA Copilot** — Dockerized on-prem (FastAPI + Ollama + Postgres/pgvector + React), self-hosted. My go-to for "containerized multi-service app" and "why on-prem".
> - **VMS (Vulnerability Management System)** — Django/FastAPI + React; long-running **NVD sync**, **Nginx reverse proxy**, **bulk Jira** integration. My go-to for "where a queue/worker belongs".
> - **Secret Vault** — containerized FastAPI + Postgres; **secrets must never be baked into images**. My go-to for "config & secrets handling".

---

## Section 0 — How to open this whole topic honestly (the 30-second framing)

**⭐ Q: "Tell me about your experience with microservices, message queues, and CI/CD."**

> "Let me be straight about where I'm strong and where I'm still growing. My production experience is **container-based deployment**: I Dockerize multi-service apps and run them on VPS infrastructure — Hetzner, Render — usually orchestrated through **Coolify**, which is a lightweight self-hosted PaaS, plus on-prem Docker deployments for TARA. So I'm very comfortable with Docker, docker-compose, Nginx as a reverse proxy, environment-based config, and getting a FastAPI + React stack live with TLS.
>
> On the architecture side, my real projects are mostly **monoliths or modular monoliths**, and I think that's been the *right* call for their scale — I can explain that trade-off. I understand microservices and message brokers like RabbitMQ conceptually and have prototyped with them; for example, the VMS NVD sync is a textbook case for a background worker on a queue, and I can walk you through exactly how I'd build that. CI/CD I've done with GitHub Actions for lint/test/build/deploy. Kubernetes I know conceptually but haven't operated a cluster — I've deliberately stayed on simpler tooling that fits the team size. So I won't oversell ops depth I don't have, but I learn this stuff fast and I understand the *why* behind each piece."

*Why this works:* it's confident, specific, honest about boundaries, and it signals senior judgment (right-sizing tooling) rather than résumé-padding.

---

# PART A — MONOLITH vs MICROSERVICES

## A1. ⭐ Definitions

**⭐ Q: What's a monolith vs microservices?**

> "A **monolith** is a single deployable unit — one codebase, one process (or one set of identical processes), one deploy. All features share the same runtime, often the same database. A **microservices** architecture splits the system into many small, independently deployable services, each owning a bounded slice of the domain and ideally its own data store, communicating over the network (HTTP/gRPC or messaging).
>
> The key word is **independently deployable**. If you can't deploy service A without redeploying service B, you don't really have microservices — you have a distributed monolith, which is the worst of both worlds."

**Q: What's a "modular monolith"?**

> "A monolith with strong **internal module boundaries** — clear interfaces between domains, minimal cross-module reach-in, often separate schemas — but still **one deployable**. You get most of the organizational clarity of microservices without the network/ops cost. It's my default recommendation for small-to-mid teams, and you can extract a module into a real service later *if* a boundary proves it needs independent scaling or ownership. My projects are essentially modular monoliths."

## A2. ⭐ Pros / cons

**⭐ Q: Pros and cons of microservices?**

> **Microservices pros:**
> - **Independent deployability** — ship one service without redeploying everything.
> - **Independent scaling** — scale only the hot path (e.g., the NVD sync worker) instead of the whole app.
> - **Team autonomy / ownership** — clear "you build it, you run it" boundaries; teams move in parallel.
> - **Fault isolation** — a crash in one service needn't take the whole system down (if designed for it).
> - **Tech heterogeneity** — a CPU-bound service can be Go/Rust while the rest is Python.
>
> **Microservices cons (the costs people forget):**
> - **Network is now in your domain logic** — latency, partial failures, retries, timeouts everywhere.
> - **Distributed data / no easy transactions** — you trade ACID for eventual consistency, sagas, idempotency.
> - **Observability is mandatory** — you need centralized logging, metrics, and distributed tracing just to debug.
> - **Operational overhead** — many pipelines, many deploys, service discovery, a broker, an orchestrator.
> - **Local dev gets harder** — spinning up 12 services to run one feature.
>
> "So microservices trade **internal complexity** (a big codebase) for **operational complexity** (a distributed system). That trade only pays off past a certain scale and team size."

## A3. ⭐ When to split (the senior take)

**⭐ Q: When should you split a monolith into microservices?**

> "My honest, senior take: **start with a (modular) monolith, and extract a service only when there's a real, demonstrated need** — not speculatively. Concrete triggers I'd act on:
>
> 1. **Independent scaling need** — one part has a wildly different load/resource profile. The VMS NVD sync is CPU/IO-heavy and bursty; the API serving the dashboard is latency-sensitive and steady. That's a legitimate reason to pull the sync into its own worker.
> 2. **Independent deploy cadence / ownership** — a separate team needs to ship on its own schedule.
> 3. **Different runtime needs** — e.g., a GPU/ML service vs a CRUD API.
> 4. **Blast-radius isolation** — a flaky third-party integration (bulk Jira) shouldn't be able to take down the core API.
>
> Notice all four are reasons to extract a *specific* piece — not to shatter the whole app. **Martin Fowler's 'MonolithFirst'** captures it: you usually don't understand the right service boundaries until you've lived in the monolith. Premature microservices means drawing boundaries in the wrong place and paying distributed-system tax for nothing."

**Q: What's the cost of distributed systems specifically?**

> "Three big ones. **(1) The network** — calls fail, time out, arrive twice, or arrive out of order; you must design for it (timeouts, retries with backoff, circuit breakers, idempotency). **(2) Consistency** — you lose easy transactions across services; you adopt eventual consistency and patterns like the saga and outbox. **(3) Observability** — a single user action now spans many services, so you can't debug by reading one log file; you need correlation IDs and distributed tracing. The famous '**fallacies of distributed computing**' — the network is reliable, latency is zero, bandwidth is infinite — exist because engineers keep forgetting these."

**Q: Honestly, are your projects monoliths? Is that a weakness?**

> "Yes, they're monoliths or modular monoliths, and I'd argue it's a *strength* of judgment, not a weakness. TARA, VMS, and Secret Vault each run with a small team and modest traffic. A monolith means one deploy, one place to debug, real database transactions, and no broker to babysit. I've kept clean module boundaries so that *if* something like the NVD sync needs to scale independently, I can extract it cleanly. Right-sizing the architecture to the problem is exactly the discipline I'd bring to a bigger system — including knowing when *not* to do microservices."

---

# PART B — INTER-SERVICE COMMUNICATION

## B1. ⭐ Sync vs async

**⭐ Q: Synchronous vs asynchronous communication between services?**

> "**Synchronous** (request/response): caller blocks waiting for a reply — REST over HTTP, or gRPC. Simple, immediate consistency, easy to reason about. But it **couples availability**: if the callee is down or slow, the caller is down or slow too, and failures cascade.
>
> **Asynchronous** (messaging/events): the caller publishes a message to a broker and moves on; a consumer processes it later. This **decouples** producer and consumer in *time* and *availability* — the consumer can be down and messages just queue up. The cost is **eventual consistency** and more moving parts (a broker, retries, idempotency).
>
> Rule of thumb: use **sync** when the caller genuinely needs the answer *now* to proceed (e.g., 'is this user authorized?'). Use **async** for work that can happen in the background or that smooths a spike — exactly the VMS NVD sync and bulk Jira creation."

**Q: REST vs gRPC?**

> "**REST/JSON over HTTP** is ubiquitous, human-readable, browser-friendly, easy to debug with curl. **gRPC** uses HTTP/2 + Protocol Buffers (binary): much faster and smaller on the wire, strongly-typed contracts via `.proto`, supports streaming, great for **internal** service-to-service calls. The downsides: not natively browser-callable (needs grpc-web/a proxy), harder to eyeball, more tooling. I'd use REST at the edge / for public APIs and consider gRPC for chatty internal service hops. My FastAPI services are REST today; I haven't run gRPC in production."

## B2. API gateway & service discovery

**Q: What's the API Gateway pattern?**

> "A single entry point in front of many services. It handles cross-cutting concerns once — TLS termination, auth, rate limiting, routing to the right service, request aggregation — so individual services stay focused. In a small setup, **Nginx as a reverse proxy is effectively a lightweight gateway**; at scale you'd use a dedicated gateway (Kong, AWS API Gateway, Azure API Management). The risk is the gateway becoming a bottleneck or a monolith of its own, so you keep it thin."

**Q: What is service discovery?**

> "In a dynamic environment, service instances come and go with changing IPs, so you can't hardcode addresses. **Service discovery** lets a service find healthy instances of another by *name*. Two flavors: **client-side** (the client queries a registry like Consul/Eureka and load-balances itself) and **server-side** (the client hits a stable endpoint — like a load balancer or Kubernetes Service — that routes to healthy pods). In Kubernetes you get this for free via **Services + DNS** (`http://billing-service`). In my Coolify/compose world, discovery is just Docker's internal DNS — services reach each other by **container/service name** on a shared network."

---

# PART C — MESSAGE BROKERS / RABBITMQ ⭐

## C1. ⭐ Core concepts

**⭐ Q: What is a message broker, and why use one?**

> "A message broker is middleware that sits between producers and consumers and reliably hands off messages. A **producer** publishes a message; the broker stores/routes it; a **consumer** pulls and processes it. You use a broker to:
> - **Decouple** services (producer doesn't know or wait for the consumer),
> - **Do work asynchronously** (return to the user fast, process later),
> - **Smooth spikes** (the queue absorbs a burst; workers drain it at their own pace — backpressure),
> - **Get reliable retries** (failed messages can be redelivered or dead-lettered),
> - **Fan work out** to multiple workers for parallelism.
>
> RabbitMQ is the classic broker for this."

**⭐ Q: Explain RabbitMQ's model — exchanges, queues, bindings, routing keys.**

> "RabbitMQ is built on **AMQP**. The flow is: a producer publishes to an **exchange** (never directly to a queue). The exchange routes the message to one or more **queues** based on **bindings** and the message's **routing key**. Consumers read from queues.
>
> **Exchange types:**
> - **direct** — routes to queues whose binding key exactly equals the routing key. Good for targeted routing (e.g., `nvd.sync`).
> - **topic** — routing keys are dotted patterns with wildcards `*` (one word) and `#` (zero+ words), e.g., bind `jira.#` to catch `jira.create`, `jira.update`. Flexible pub/sub.
> - **fanout** — ignores routing key, broadcasts to *all* bound queues. Good for events many consumers care about.
> - **headers** — routes on header attributes instead of routing key (rarely needed).
>
> So: **producer → exchange → (binding + routing key) → queue → consumer.**"

**⭐ Q: Ack/nack, durability, and what happens on failure?**

> "**Acknowledgements** are how the broker knows a message was processed. With **manual acks**, the consumer sends an `ack` only *after* successfully handling the message; until then the broker considers it unacknowledged and will redeliver it if the consumer dies. A **nack** (or reject) says 'I failed' — you can requeue it or route it to a dead-letter queue. **Auto-ack** (ack on delivery) is faster but risks losing messages on a crash, so for important work I use **manual ack after success**.
>
> **Durability** is about surviving a broker restart: mark the **queue durable** *and* publish messages as **persistent** *and* (ideally) use **publisher confirms**. All three are needed — a durable queue with non-persistent messages still loses messages on restart.
>
> **Prefetch (QoS)** limits how many unacked messages a consumer holds at once, so one slow consumer doesn't hog the whole queue."

**⭐ Q: What's a dead-letter queue (DLQ)?**

> "A queue where messages go when they **can't be processed** — they were nacked/rejected without requeue, expired (TTL), or exceeded a max-retry count. Instead of silently dropping them or retrying forever (poison message), they land in the DLQ for inspection, alerting, or manual replay. It's essential operational hygiene: it stops one bad message from blocking the queue and gives you a place to see what failed and why."

## C2. ⭐ Delivery guarantees & idempotency

**⭐ Q: At-least-once vs exactly-once vs at-most-once delivery?**

> - "**At-most-once**: deliver and forget; a crash loses the message. Fast, lossy. Fine for, say, non-critical metrics.
> - **At-least-once**: redeliver until acked. **No message lost, but possible duplicates.** This is what most real systems (RabbitMQ, Kafka) practically give you.
> - **Exactly-once**: every message processed once, no loss, no dupes. Extremely hard end-to-end across a network; what's usually marketed as 'exactly-once' is at-least-once delivery **plus idempotent processing** or dedup, giving exactly-once *effects*.
>
> "So the honest engineering answer is: assume **at-least-once**, and make your consumers **idempotent**."

**⭐ Q: What is an idempotent consumer and how do you build one?**

> "Idempotent means **processing the same message twice has the same effect as processing it once** — critical because at-least-once means you *will* see duplicates. How I build it:
> - Give each message a stable **idempotency key** (e.g., a deterministic ID, or `cve_id` for an NVD record).
> - Before acting, **check if you've already processed that key** (a `processed_messages` table, or a unique constraint, or an upsert).
> - Use **UPSERT / `ON CONFLICT DO UPDATE`** so a replay just overwrites with the same data instead of creating duplicates.
>
> For VMS, syncing CVE `CVE-2024-1234` twice should result in one up-to-date row, not two — an upsert keyed on `cve_id` gives me that for free."

## C3. ⭐ When to use a queue (and when not)

**⭐ Q: When do you reach for a queue?**

> "Four signals:
> 1. **Async work** the user shouldn't wait for — long-running jobs (NVD sync), bulk operations (creating 200 Jira tickets), report generation, emails.
> 2. **Decoupling** — the producer shouldn't depend on the consumer's availability or speed.
> 3. **Spike smoothing / backpressure** — bursty load that would overwhelm a downstream system or a rate-limited API; the queue buffers it.
> 4. **Reliable retries** — work that must eventually succeed even through transient failures, with DLQ for the ones that don't.
>
> If none of those apply — a quick synchronous call is simpler and I'd just call the API directly. **Don't add a broker for the sake of it**; it's real operational weight."

**⭐ Q (the classic follow-up): "Why a queue instead of just calling the API directly?"**

> "Because a direct synchronous call **couples me to the callee's availability, speed, and rate limits**, and makes the *user* wait for it. Take VMS bulk Jira creation: if I synchronously POST 200 tickets to Jira inside the request, the user's HTTP request hangs for minutes, any Jira hiccup fails the whole batch, and I'll hit Jira's rate limits. With a queue, I **enqueue 200 messages and return `202 Accepted` instantly**. Workers drain the queue at a controlled rate (respecting Jira's limits), each ticket retries independently on transient failure, and permanent failures go to a DLQ I can inspect — without affecting the other 199. The queue gives me **async UX, isolation, controlled throughput, and reliable retries** that a direct call can't."

## C4. ⭐ Broker comparison

**⭐ Q: RabbitMQ vs Kafka vs Azure Service Bus — when each?**

> "**RabbitMQ** is a **traditional message broker / smart queue**: rich routing (exchanges/topics), per-message ack, DLQ, priorities. Messages are typically consumed and gone. Best for **task/work queues, RPC, complex routing, background jobs**. This is what I'd use for VMS workers.
>
> **Kafka** is a **distributed commit log / event-streaming platform**, not really a queue. Messages are **retained on disk for a configured time** and consumers read by **offset**, so multiple consumer groups can replay the same stream independently. Best for **high-throughput event streaming, event sourcing, log/metric pipelines, replayable analytics**. Overkill for 'create 200 Jira tickets'; perfect for 'ingest a firehose of events'.
>
> **Azure Service Bus** is Azure's **managed enterprise broker** — queues + topics/subscriptions, sessions, DLQ, dedup — conceptually close to RabbitMQ but **fully managed** (no broker to run). On Azure I'd default to it to avoid operating a broker. **Azure Event Hubs** is the Kafka-equivalent for streaming.
>
> One-liner: **RabbitMQ/Service Bus = smart queue for tasks; Kafka/Event Hubs = durable replayable log for streams.**"

## C5. ⭐ Python task layer — Celery / RQ / BackgroundTasks

**⭐ Q: FastAPI `BackgroundTasks` vs Celery/RQ — when each?**

> "**`FastAPI BackgroundTasks`** runs a function *after returning the response*, but **in the same process** — no broker, no persistence. If the server restarts or crashes, the task is lost; it doesn't survive deploys; it competes for the web worker's resources. Great for **trivial fire-and-forget** like sending one email or writing an audit log. **Not** for the NVD sync.
>
> **Celery** is a distributed task queue for Python: a separate pool of **worker processes** pulls tasks from a broker (RabbitMQ or Redis), with **retries, scheduling (Celery Beat), result backends, routing, and concurrency**. This is the right tool for long-running, must-survive-restart work like NVD sync and bulk Jira. **RQ (Redis Queue)** is the lighter-weight cousin — simpler, Redis-only, fewer features — nice when Celery is more than I need.
>
> Decision: trivial & loss-tolerant → `BackgroundTasks`. Real background work that must be reliable, retried, and independent of the web process → **Celery** (or RQ for simpler cases)."

## C6. ⭐ WORKED EXAMPLE — Put VMS NVD sync + bulk Jira on a queue

**⭐ Q: Walk me through moving the VMS NVD sync onto a queue with a worker. Why and how?**

> "**Why.** Today the NVD sync is a long-running job — pulling and upserting CVE data — that's CPU/IO-heavy and bursty. If it runs inside the web request or the web process, it blocks responses, risks request timeouts, and can't scale separately from the API. It's the textbook candidate for a background worker.
>
> **Architecture.**
> 1. **Trigger**: a scheduler (Celery Beat or a cron) — or a user action — publishes a `nvd.sync` task to RabbitMQ instead of running inline.
> 2. **API returns immediately** with `202 Accepted` + a job id the UI can poll.
> 3. **Worker pool** (Celery workers, separate containers) consumes `nvd.sync`, pages through the NVD API, and **upserts** each CVE keyed on `cve_id` (`ON CONFLICT DO UPDATE`) — so the job is **idempotent** and safe to retry.
> 4. **Retries with backoff** for transient NVD/network errors; messages that keep failing go to a **DLQ** for inspection.
> 5. **Scale** by adding worker containers; the API stays responsive throughout.
>
> **Bulk Jira** is the same pattern: enqueue one `jira.create` message per ticket, workers drain at a rate that respects Jira's rate limits, each ticket retries independently, failures dead-letter. The user gets an instant `202` instead of a multi-minute hang.
>
> **Idempotency note**: at-least-once means a CVE might be processed twice — the upsert makes that a no-op. For Jira, I'd store an idempotency key (e.g., the source finding id) so a redelivery doesn't create a duplicate ticket."

**Minimal Celery sketch (illustrative):**
```python
# celery_app.py
from celery import Celery

celery = Celery(
    "vms",
    broker="amqp://guest:guest@rabbitmq:5672//",   # RabbitMQ
    backend="redis://redis:6379/0",                 # result backend
)

# tasks.py
from celery_app import celery
from celery import shared_task

@shared_task(bind=True, max_retries=5, default_retry_delay=30, acks_late=True)
def sync_nvd(self, since: str):
    try:
        for page in fetch_nvd_pages(since):
            upsert_cves(page)   # ON CONFLICT (cve_id) DO UPDATE  -> idempotent
    except TransientError as e:
        raise self.retry(exc=e)  # exponential backoff via config; DLQ after max_retries

# api.py (FastAPI)
@app.post("/sync", status_code=202)
def trigger_sync(since: str):
    task = sync_nvd.delay(since)
    return {"job_id": task.id}
```
*Talking point:* `acks_late=True` means the message is acked only after the task completes, so a worker crash mid-task redelivers it — combined with the upsert, that's safe.

---

# PART D — NGINX / REVERSE PROXY & LOAD BALANCING ⭐

## D1. ⭐ Reverse proxy fundamentals

**⭐ Q: What does a reverse proxy do, and why put Nginx in front of FastAPI?**

> "A **reverse proxy** sits in front of your app servers and takes client requests on their behalf. In front of a FastAPI/uvicorn app it gives me:
> - **TLS termination** — handle HTTPS/certs at the edge so the app speaks plain HTTP internally.
> - **Routing / virtual hosts** — route by path or hostname to different upstreams (`/api` → FastAPI, `/` → React static).
> - **Static file serving** — serve the React build and assets directly, far faster than Python.
> - **gzip/brotli compression** and **caching** of responses/assets.
> - **Load balancing** across multiple uvicorn/gunicorn workers or app replicas.
> - **Buffering, timeouts, rate limiting, security headers, hiding the backend.**
>
> In **VMS** I run Nginx as the reverse proxy in front of the app — that's exactly this setup. The app shouldn't be exposed directly to the internet; Nginx is the hardened front door."

**⭐ Q: Forward proxy vs reverse proxy?**

> "A **forward proxy** sits in front of *clients* and represents them to the internet — it's about outbound (corporate egress, filtering, anonymity); the server doesn't know the real client. A **reverse proxy** sits in front of *servers* and represents them to clients — inbound (TLS, routing, load balancing); the client doesn't know which backend served it. Same machinery, opposite direction: forward proxy hides the client, reverse proxy hides the server."

**⭐ Q: Nginx vs gunicorn vs uvicorn — who does what?**

> "**uvicorn** is the ASGI server that actually runs FastAPI (async). **gunicorn** is a process manager — in this stack it runs multiple **uvicorn workers** (`gunicorn -k uvicorn.workers.UvicornWorker`) for multi-core concurrency and worker recycling. **Nginx** is the reverse proxy in front of all of it doing TLS, static files, and load balancing. So the chain is: **client → Nginx (edge) → gunicorn (process manager) → uvicorn workers → FastAPI app.** Nginx is *not* a replacement for the app server and vice versa — they're different layers."

## D2. ⭐ Load balancing

**⭐ Q: Load-balancing algorithms — round-robin, least-conn, IP-hash?**

> - "**Round-robin** (default): requests cycle across backends in order. Simple, good when requests are roughly uniform.
> - **Least connections**: send to the backend with the fewest active connections. Better when request durations vary a lot (some slow, some fast).
> - **IP hash**: hash the client IP to always route a given client to the same backend — a way to get **sticky sessions** without shared state. Downside: uneven distribution and breaks if the client IP changes.
> - (**Weighted** variants let you bias toward bigger machines.)
>
> Most of the time I'd pick least-conn or round-robin and keep the app **stateless** so I don't *need* stickiness."

**⭐ Q: "What's the difference between Nginx and a load balancer?"** (classic trap)

> "They overlap. **Nginx is a reverse proxy that *can* load-balance** (L7/application-layer: it understands HTTP, can route by path/header, terminate TLS). A dedicated **load balancer** is a category — it can be **L4** (transport: just forwards TCP/UDP by IP/port, very fast, protocol-agnostic, e.g., AWS NLB) or **L7** (application-aware, e.g., AWS ALB, Azure App Gateway). So: Nginx ⊂ 'things that load-balance', specifically an L7 software LB with proxy features. In cloud, a managed L4/L7 LB sits in front and may distribute across multiple Nginx/app nodes. Short version: **all reverse proxies that distribute traffic are doing load balancing, but not all load balancers are full reverse proxies** — an L4 LB doesn't terminate TLS or route by URL."

**⭐ Q: Sticky sessions vs stateless? Health checks?**

> "**Sticky sessions** pin a client to one backend (via cookie or IP-hash) — needed only if a backend holds **session state in memory**. I avoid that: keep the app **stateless** and put session/state in a shared store (Postgres/Redis/JWT), so any backend can serve any request and scaling/failover is trivial. **Health checks**: the LB periodically probes each backend (`/healthz`) and stops routing to unhealthy ones — passive (notice failures) or active (probe proactively). That's how you get self-healing routing and zero-downtime deploys: a backend failing its readiness check is pulled out of rotation automatically."

**Nginx reverse-proxy + load-balance config (illustrative — VMS-style):**
```nginx
# /etc/nginx/conf.d/vms.conf
upstream vms_api {
    least_conn;                       # algorithm
    server api1:8000 max_fails=3 fail_timeout=15s;
    server api2:8000 max_fails=3 fail_timeout=15s;
    # ip_hash;  # <- use instead of least_conn if you need stickiness
}

server {
    listen 443 ssl http2;
    server_name vms.example.com;

    ssl_certificate     /etc/letsencrypt/live/vms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vms.example.com/privkey.pem;

    gzip on;
    gzip_types text/css application/javascript application/json;

    # React build served directly by Nginx
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;   # SPA fallback
    }

    # API proxied to FastAPI upstreams
    location /api/ {
        proxy_pass         http://vms_api/;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /healthz { proxy_pass http://vms_api/healthz; access_log off; }
}

# Redirect HTTP -> HTTPS
server {
    listen 80;
    server_name vms.example.com;
    return 301 https://$host$request_uri;
}
```
*Talking points:* `X-Forwarded-*` headers preserve the real client IP/scheme through the proxy; `try_files ... /index.html` is the SPA fallback so client-side routes work; TLS terminates here so FastAPI speaks plain HTTP.

---

# PART E — DOCKER ⭐

## E1. ⭐ Images vs containers; containers vs VMs

**⭐ Q: Image vs container?**

> "An **image** is an immutable, layered template — your app, dependencies, and runtime baked into a read-only filesystem snapshot. A **container** is a **running instance** of an image — a process (or processes) isolated by the kernel (namespaces + cgroups) with a thin writable layer on top. Analogy: image is the **class**, container is the **object**; or image is the recipe, container is the cooked dish. You can run many containers from one image."

**⭐ Q: Containers vs VMs?**

> "A **VM** virtualizes **hardware** and runs a **full guest OS** on a hypervisor — strong isolation, but heavy (GBs, slow boot). A **container** virtualizes the **OS** — it shares the host kernel and isolates via namespaces/cgroups — so it's lightweight (MBs, starts in milliseconds) and dense. Trade-off: containers are faster and cheaper but share the host kernel, so isolation is weaker than a VM's. In practice you often run **containers inside VMs** to get both. For app deployment, containers win on speed, density, and 'works the same everywhere'."

## E2. ⭐ Dockerfile, layers, caching, multi-stage

**⭐ Q: How do Docker layers and build caching work, and how do you exploit them?**

> "Each instruction in a Dockerfile (`FROM`, `RUN`, `COPY`...) creates a **layer**, cached by content. On rebuild, Docker reuses cached layers until the first one that changed — then everything after rebuilds. So **order matters**: put the things that change *least* first. The classic win is **copy the dependency manifest and install deps before copying source code**, so editing app code doesn't bust the (slow) dependency-install layer:
> ```dockerfile
> COPY requirements.txt .
> RUN pip install -r requirements.txt   # cached unless requirements.txt changes
> COPY . .                              # changes often, but deps stay cached
> ```
> This cut my rebuild times dramatically."

**⭐ Q: What's a multi-stage build and why use it?**

> "A multi-stage build uses **multiple `FROM` stages**: a fat **builder** stage with compilers/dev tooling produces artifacts, and a slim **final** stage copies *only* the built artifacts in — leaving all the build junk behind. Result: a much **smaller, more secure** final image (smaller attack surface, faster pulls). For React I build the static bundle in a Node stage and copy it into an Nginx stage; for Python I install wheels in a builder and copy them into a slim runtime. Smaller images = faster CI, faster deploys, fewer CVEs."

**Multi-stage Dockerfile — FastAPI (TARA/VMS-style):**
```dockerfile
# ---------- builder ----------
FROM python:3.12-slim AS builder
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt   # deps layer (cached)

# ---------- runtime ----------
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1          # logs flush to stdout (12-factor)
COPY --from=builder /install /usr/local
COPY . .
# run as non-root for security
RUN useradd -m appuser
USER appuser
EXPOSE 8000
HEALTHCHECK CMD curl -f http://localhost:8000/healthz || exit 1
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", \
     "-w", "4", "-b", "0.0.0.0:8000"]
```

**Multi-stage Dockerfile — React → Nginx:**
```dockerfile
# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                      # cached unless lockfile changes
COPY . .
RUN npm run build

# ---------- serve ----------
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```
*Talking point:* final image ships **only the static build + Nginx** — no Node, no `node_modules`. Tiny and hardened.

## E3. ⭐ docker-compose for multi-service dev

**⭐ Q: How do you run a multi-service app locally?**

> "`docker-compose` — one YAML describing all services, their networks, volumes, env, and dependencies, brought up with `docker compose up`. For **TARA** that's four services: `api` (FastAPI), `ollama` (the local LLM), `db` (Postgres + pgvector), and `frontend` (React/Nginx). Compose puts them on a shared network where they reach each other by **service name** (the `api` connects to `db` at host `db`), and a Postgres **named volume** persists data across restarts. It's the single command that gives every dev the exact same stack."

**docker-compose.yml — TARA (api + ollama + db + frontend):**
```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: tara
      POSTGRES_USER: ${POSTGRES_USER}        # from .env, NOT hardcoded
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data       # persistence
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
      interval: 10s
      retries: 5

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_models:/root/.ollama

  api:
    build: ./backend
    env_file: .env                            # secrets injected at runtime
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/tara
      OLLAMA_HOST: http://ollama:11434         # reached by service name
    depends_on:
      db: { condition: service_healthy }
      ollama: { condition: service_started }
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    depends_on: [api]
    ports:
      - "80:80"

volumes:
  pgdata:
  ollama_models:
```

**⭐ Q: Volumes and networks in Docker?**

> "**Volumes** persist data *outside* the container's ephemeral writable layer — so a Postgres named volume survives `docker rm` and restarts. (Bind mounts map a host path in, great for live-reloading source in dev.) **Networks** isolate and connect containers; on a user-defined bridge network, containers resolve each other by **name** via Docker's embedded DNS — which is exactly how `api` finds `db`. Putting only the services that need to talk on the same network is also a security boundary."

## E4. ⭐ Secrets & config in Docker — Secret Vault

**⭐ Q (key one for you): How do you keep secrets OUT of images?**

> "This is core to **Secret Vault** by definition — a secrets manager that bakes secrets into its own image would be absurd. My rules:
> 1. **Never `COPY` secrets or `.env` into the image, and never `ENV SECRET=...`** — image layers are immutable and inspectable; anyone with the image can `docker history` / unpack and read them. A secret in *any* layer is permanently in the image even if a later layer 'removes' it.
> 2. **Inject secrets at *runtime***, not build time — via environment variables from an `.env` file (`env_file:` / `--env-file`), Docker/Swarm **secrets** (mounted as files under `/run/secrets`), or a real secrets manager (**Azure Key Vault**, AWS Secrets Manager).
> 3. **`.dockerignore`** the `.env`, `.git`, and key material so they can't sneak into the build context.
> 4. For build-time secrets (e.g., a private registry token), use **BuildKit `--mount=type=secret`** which mounts the secret only during that `RUN` and never persists it in a layer.
> 5. In prod, prefer **managed identity / Key Vault references** so the app fetches secrets at startup and nothing sensitive sits in env at all.
>
> So: **config and secrets are runtime concerns injected from outside; the image is a generic, secret-free artifact** I could push to a public registry without leaking anything."

**Q: What does `.dockerignore` do?**

> "It excludes files from the **build context** sent to the daemon — like `.gitignore` for Docker. It keeps `.git`, `node_modules`, `.env`, secrets, and local junk out of the build: smaller/faster context, better cache behavior, and crucially **no accidental secret leakage** into the image."

**Q: Image registries?**

> "A registry stores and distributes images. **Docker Hub** is the public default; **Azure Container Registry (ACR)** and AWS ECR are the managed private registries for cloud. CI builds the image, tags it (ideally with the git SHA, not just `latest`), pushes to the registry, and the deploy target pulls it. Using the **commit SHA as the tag** makes deploys reproducible and rollbacks trivial — `latest` is ambiguous about what's actually running."

---

# PART F — ORCHESTRATION AWARENESS (Kubernetes, and my real PaaS story)

## F1. Kubernetes core concepts

**Q: Explain Kubernetes core objects at a high level.**

> "I know K8s **conceptually** — I haven't operated a production cluster, so I'll be clear about that. The core objects:
> - **Pod** — smallest deployable unit, one or more tightly-coupled containers sharing network/storage.
> - **Deployment** — declares the desired number of pod **replicas** and manages rollouts; it does **self-healing** (recreates dead pods) and **rolling updates**.
> - **Service** — a stable virtual IP + DNS name load-balancing across a set of pods (since pod IPs are ephemeral). This is built-in service discovery.
> - **Ingress** — L7 routing/TLS from outside the cluster to Services (an Nginx-ingress-controller often implements it — same reverse-proxy ideas).
> - **ConfigMap / Secret** — externalized config and secrets injected as env or mounted files (12-factor).
> - **HPA (Horizontal Pod Autoscaler)** — auto-scales replicas based on CPU/memory/custom metrics.
>
> The big idea is **declarative + reconciliation**: you declare desired state, the control loop continuously makes reality match — that's where self-healing and autoscaling come from."

## F2. ⭐ Do you actually need Kubernetes?

**⭐ Q: "Do you actually need Kubernetes?"**

> "Usually **no**, and saying that is a feature, not a gap. Kubernetes earns its keep when you have **many services, multiple teams, real autoscaling needs, multi-node clusters, and the ops capacity to run it**. It brings serious operational complexity — you're now running a distributed system *to run* your distributed system.
>
> For everything I've shipped, the right level is lighter:
> - **docker-compose** for local dev and small single-host deployments.
> - **Coolify** — a self-hosted, open-source PaaS (like a Heroku you own) on a VPS — for git-push-to-deploy, TLS via Let's Encrypt, and managing my containers on **Hetzner**. That's my real production deployment story.
> - **Render** for managed PaaS when I want zero infra babysitting.
> - On cloud, **Azure Container Apps** or **AWS App Runner / ECS Fargate** give me autoscaling and rolling deploys **without** running a K8s control plane.
>
> So my honest position: I right-size to Compose/Coolify/Container Apps, and I'd reach for Kubernetes only when the scale, team structure, and ops maturity genuinely demand it. I understand its concepts and could grow into it; I just haven't needed to run a cluster, and pretending otherwise would be bluffing."

---

# PART G — CI/CD ⭐

## G1. ⭐ CI vs CD; the pipeline

**⭐ Q: What's the difference between CI and CD?**

> "**Continuous Integration (CI)**: every push is automatically **built and tested** — lint, unit/integration tests, type checks — so integration problems surface immediately instead of at a big merge. The goal is 'main is always green and mergeable'.
>
> **Continuous Delivery**: CI plus an automated pipeline that **packages and prepares a release** so it *could* be deployed at any time — but the final push to prod is a **manual approval**.
>
> **Continuous Deployment**: goes one step further — **every green build auto-deploys to prod**, no human gate.
>
> So CI = always-tested code; Delivery = always-*releasable*; Deployment = always-*released*. Most teams do CI + Continuous Delivery (auto to staging, button to prod)."

**⭐ Q: Describe a typical pipeline.**

> "**lint → test → build → containerize → push → deploy.** Concretely for a FastAPI + React app:
> 1. **Lint/format** (ruff/flake8 for Python, ESLint/Prettier for JS).
> 2. **Test** — `pytest` for the backend, React Testing Library + Vitest/Jest for the frontend; fail the build on failures, optionally enforce coverage.
> 3. **Build** — compile the React bundle, build the Python artifact.
> 4. **Containerize** — `docker build` the multi-stage images.
> 5. **Push** — tag with the git SHA and push to ACR/Docker Hub.
> 6. **Deploy** — roll out to the target (Container Apps / Coolify webhook / `kubectl`/compose), then smoke-test `/healthz`.
>
> The principle is **build once, promote the same artifact** through environments — never rebuild per environment, or you're not testing what you ship."

## G2. ⭐ GitHub Actions example

**⭐ Q: Show a GitHub Actions workflow for a FastAPI + React app.**

```yaml
# .github/workflows/ci-cd.yml
name: CI-CD
on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12", cache: pip }
      - run: pip install -r requirements.txt
      - run: ruff check .                 # lint
      - run: pytest --cov=app -q          # tests + coverage

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --run            # React Testing Library / Vitest
      - run: npm run build

  build-and-push:
    needs: [backend, frontend]            # only if tests pass
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      id-token: write                     # OIDC -> cloud, no static keys
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Azure login via OIDC
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Build & push image (tagged with commit SHA)
        run: |
          az acr login --name myregistry
          docker build -t myregistry.azurecr.io/api:${{ github.sha }} ./backend
          docker push  myregistry.azurecr.io/api:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production               # requires manual approval (Continuous Delivery)
    steps:
      - name: Roll out new revision
        run: |
          az containerapp update \
            --name vms-api --resource-group rg-vms \
            --image myregistry.azurecr.io/api:${{ github.sha }}
```
*Talking points:* tests gate the build (`needs`); `if: github.ref == main` means PRs run tests but don't deploy; **OIDC** (`id-token: write` + `azure/login`) means **no long-lived cloud keys in GitHub**; the image is **tagged with the SHA** for reproducible deploy/rollback; the `production` environment adds a **manual approval gate**.

**Q: Jenkins awareness?**

> "Jenkins is the older, self-hosted, plugin-driven CI server — pipelines as a `Jenkinsfile` (declarative or scripted Groovy), runs on your own agents, hugely flexible but you operate the server and plugins yourself. GitHub Actions is the hosted, YAML, git-native equivalent with zero server to run. I've used **GitHub Actions** hands-on; I understand the Jenkins model (stages, agents, `Jenkinsfile`) and could work in it, but I'd be honest that Actions is where my recent experience is."

## G3. ⭐ Deployment strategies & rollback

**⭐ Q: Rolling vs blue-green vs canary deploys?**

> - "**Rolling**: replace instances a few at a time — new pods come up healthy, old ones drain, repeat. Zero downtime, no extra full environment, but two versions run simultaneously during the roll (your app must tolerate that), and rollback means rolling back. Default for Deployments/Container Apps.
> - **Blue-green**: stand up a full **green** (new) environment alongside **blue** (current), test green, then **flip the load balancer** to green instantly. Instant cutover and instant rollback (flip back), but you pay for double infra briefly, and DB migrations need care.
> - **Canary**: route a **small % of traffic** (say 5%) to the new version, watch metrics/errors, then gradually ramp to 100% — or abort. Lowest blast radius, best for risky changes; needs good metrics and traffic-splitting.
>
> Pick by risk and budget: rolling for routine, blue-green for instant-rollback safety, canary for high-risk changes where you want to validate on real traffic first."

**⭐ Q: "How do you deploy with zero downtime?"**

> "Several pieces together:
> 1. **Rolling or blue-green** so old instances keep serving until new ones are confirmed healthy.
> 2. **Readiness probes / health checks** — the LB only sends traffic once `/readyz` passes, and pulls an instance out before it's killed.
> 3. **Graceful shutdown** — on `SIGTERM`, stop accepting new requests but finish in-flight ones (drain), then exit.
> 4. **Backward-compatible DB migrations** — expand-then-contract: add new columns/tables first (works with both old and new code), deploy, then remove old ones in a later release. Never a breaking migration in the same deploy as code that needs it.
> 5. **Connection draining** at the LB so in-flight requests complete.
>
> So zero-downtime is health-checks + graceful drain + compatible migrations, not just 'restart fast'."

**⭐ Q: How do you roll back?**

> "Because I **tag images by git SHA** and 'build once, promote', rollback is just **redeploy the previous known-good image tag** — for Container Apps, activate the prior revision; for K8s, `kubectl rollout undo`; for Coolify, redeploy the previous commit. Blue-green makes it instant (flip back to blue). The hard part is always **data**: if a migration changed the schema, rollback needs the expand/contract discipline so the old code still works against the new schema. I also keep deploys **small and frequent** so any rollback reverts a small, understandable delta."

**Q: Environment promotion & secrets in CI?**

> "**Promotion**: the *same artifact* (same image SHA) moves dev → staging → prod, with only **config/secrets** differing per environment (injected from env/Key Vault). That way prod runs exactly what staging validated.
>
> **Secrets in CI**: never plaintext in YAML or repo. Use the platform's encrypted secrets for tokens, and prefer **OIDC / federated identity** (GitHub Actions → Azure/AWS) or **managed identity** so the pipeline gets **short-lived credentials** with no long-lived keys to leak or rotate. Scope them least-privilege, and pull app secrets at deploy/runtime from **Key Vault**, not from the pipeline."

---

# PART H — 12-FACTOR APP

**⭐ Q: What is the Twelve-Factor App and which factors matter most to you?**

> "It's a methodology for building cloud-native, deployable, scalable services. The ones I lean on daily:
> - **Config in the environment** (factor 3) — config and **secrets come from env vars, never hardcoded** or committed. Same image, different env per stage. (Ties straight to Secret Vault.)
> - **Stateless processes** (factor 6) — no in-memory session/state; persist to a backing store. This is what makes horizontal scaling and any-instance-serves-any-request possible (no sticky sessions needed).
> - **Backing services as attached resources** (factor 4) — Postgres, the broker, etc. are swappable URLs in config.
> - **Logs as event streams** (factor 11) — the app **logs to stdout/stderr**; the platform handles aggregation. Don't write log files inside the container.
> - **Disposability** (factor 9) — fast startup, **graceful shutdown** on SIGTERM, so instances are cheap to start/stop/replace.
> - **Dev/prod parity** (factor 10) — Docker gives me near-identical stacks across environments.
>
> Net: 12-factor is *why* my containers are stateless, config-driven, and log to stdout — it's the contract that makes them deploy cleanly anywhere."

**Q: Health vs readiness probes — what's the difference?**

> "**Liveness/health** = 'is the process alive?' If it fails, restart the container. **Readiness** = 'is it ready to *receive traffic*?' — e.g., DB connected, caches warm, migrations done. If readiness fails, the LB **stops routing** to it but doesn't kill it. The distinction matters during startup and dependency hiccups: an app that's alive but not yet ready shouldn't get traffic, and a temporarily-not-ready app shouldn't be needlessly killed. I expose `/healthz` (liveness) and `/readyz` (readiness)."

---

# PART I — OBSERVABILITY IN A DISTRIBUTED SYSTEM

**⭐ Q: How do you observe/debug a distributed system?**

> "Three pillars: **logs, metrics, traces.**
> - **Centralized logging** — all services log structured JSON to stdout; a collector ships them to one searchable place (Azure **Log Analytics**, ELK, Loki). You can't tail 12 containers by hand.
> - **Metrics** — counters/gauges/histograms (request rate, error rate, latency p50/p95/p99, queue depth, worker lag) into Prometheus/**Azure Monitor**, with dashboards and alerts. Queue depth and DLQ size are key for the RabbitMQ/Celery setup.
> - **Distributed tracing** — a **correlation/trace ID** generated at the edge and **propagated through every service hop and queue message**, so one user action is a single trace across services. OpenTelemetry → **Application Insights**/Jaeger. This is the thing that makes 'where did the 3 seconds go?' answerable in microservices.
>
> On **Azure** specifically: **Application Insights** for app-level traces/requests/dependencies, **Log Analytics** for centralized log queries (KQL), **Azure Monitor** for metrics/alerts — they integrate, so I get traces, logs, and metrics correlated. The honest framing: in my monoliths, one log stream + App Insights is plenty; the moment I split services, **correlation IDs and tracing stop being optional**."

**Q: Why correlation IDs?**

> "In a monolith, one request = one log context. Across services and queues, a request fans out, so you need a shared **correlation ID** threaded through HTTP headers (`X-Request-ID`) and into message metadata, logged by every service. Then you can filter all logs/traces by that one ID and reconstruct the entire journey — including the async hop where the API enqueued a job and a worker processed it minutes later."

---

# RAPID-FIRE CHEAT SHEET

| Term | One-liner |
|---|---|
| **Monolith** | One deployable unit; simplest until scale/ownership pressure. |
| **Modular monolith** | One deploy, strong internal boundaries — my default. |
| **Microservices** | Independently deployable services; trade code complexity for ops complexity. |
| **Distributed-system tax** | Network failures, no easy transactions, mandatory observability. |
| **Sync (REST/gRPC)** | Caller waits; couples availability. gRPC = fast binary, internal. |
| **Async (queue/events)** | Decouples time & availability; eventual consistency. |
| **API gateway** | Single entry point for TLS/auth/routing; Nginx is a lightweight one. |
| **Service discovery** | Find healthy instances by name; K8s Services / Docker DNS. |
| **Broker** | Middleware between producer & consumer for reliable handoff. |
| **Exchange types** | direct (exact key), topic (wildcards), fanout (broadcast), headers. |
| **Ack/nack** | Manual ack after success = no loss on crash; nack → requeue/DLQ. |
| **Durability** | durable queue + persistent message + publisher confirms. |
| **DLQ** | Where unprocessable/poison messages go for inspection. |
| **At-least-once** | No loss, possible dupes → make consumers idempotent (upsert/dedup key). |
| **RabbitMQ vs Kafka** | Smart queue for tasks vs durable replayable log for streams. |
| **Azure Service Bus** | Managed RabbitMQ-like broker; Event Hubs = managed Kafka-like. |
| **BackgroundTasks vs Celery** | Same-process fire-and-forget vs reliable distributed workers. |
| **Reverse proxy** | Fronts servers: TLS, routing, static, gzip, LB (Nginx). |
| **Forward vs reverse** | Forward hides clients (egress); reverse hides servers (ingress). |
| **LB algorithms** | round-robin / least-conn / ip-hash (sticky). |
| **Nginx vs LB** | Nginx = L7 software LB+proxy; LB can be L4 (TCP) or L7. |
| **Image vs container** | Class vs object; template vs running instance. |
| **Container vs VM** | Shares host kernel (light) vs full guest OS (heavy, isolated). |
| **Layer caching** | Copy deps before code so code edits don't rebuild deps. |
| **Multi-stage build** | Build fat, ship slim — only artifacts in final image. |
| **Secrets in Docker** | Inject at runtime; never `COPY`/`ENV` into a layer; `.dockerignore` the `.env`. |
| **K8s core** | pod/deployment/service/ingress/configmap/secret/HPA; declarative self-healing. |
| **Need K8s?** | Usually no — Compose/Coolify/Container Apps until scale demands it. |
| **CI vs CD** | CI = build+test every push; Delivery = always-releasable; Deployment = auto-to-prod. |
| **Pipeline** | lint → test → build → containerize → push → deploy. |
| **Deploy strategies** | rolling (in-place) / blue-green (flip) / canary (% ramp). |
| **Zero downtime** | rolling/blue-green + readiness probes + graceful drain + compatible migrations. |
| **Rollback** | Redeploy prior SHA-tagged image; flip blue-green; mind the schema. |
| **Secrets in CI** | OIDC / managed identity (short-lived), not plaintext keys. |
| **12-factor** | Config in env, stateless, logs to stdout, disposable/graceful. |
| **Observability** | logs + metrics + traces; correlation IDs; App Insights/Log Analytics. |

---

# TRAPS & GOTCHAS / DON'T-BLUFF LIST

**Operational claims I will NOT overstate:**
- ❌ Don't say "I ran RabbitMQ/Kafka in production at scale." ✅ Say "I understand the model and have prototyped/designed for it; my production async work is more limited — but here's exactly how I'd build the VMS queue."
- ❌ Don't say "I operate a Kubernetes cluster." ✅ Say "I know K8s concepts; I've deliberately used Coolify/Container Apps/Compose that fit my team size. I'd be honest that running a cluster is something I'd grow into."
- ❌ Don't claim Jenkins hands-on if asked deeply. ✅ "GitHub Actions is my hands-on tool; I understand the Jenkins/Jenkinsfile model."
- ❌ Don't claim my flagship apps are microservices. ✅ "They're (modular) monoliths — and that's the right call for their scale; I can show clean extraction points."

**Conceptual traps to avoid saying wrong:**
- "Exactly-once delivery is easy" → **wrong.** Assume at-least-once + idempotent consumers.
- "A durable queue alone survives restart" → **no**, messages must also be **persistent** (+ publisher confirms).
- "Just remove the secret in a later Docker layer" → **no**, it's permanently in earlier layers; never put it in *any* layer.
- "Nginx is a load balancer" → nuance it: Nginx is an **L7 reverse proxy that can load-balance**; LBs can be L4 too.
- "FastAPI `BackgroundTasks` is fine for long jobs" → **no**, it's same-process and lost on restart; use Celery/RQ.
- "`latest` tag is fine for prod" → **no**, tag by **commit SHA** for reproducible deploys/rollbacks.
- "Auto-ack is fine" → risks message loss on crash; use **manual ack after success** for important work.
- "We'll add stickiness" → first ask **why** there's state; prefer stateless + shared store.
- "Microservices will fix our codebase mess" → often makes it worse (distributed monolith); fix module boundaries first.
- "Zero-downtime = restart fast" → it's health checks + graceful drain + **backward-compatible migrations**.

**Confidence-builders (true things I CAN own fully):**
- ✅ I Dockerize multi-service apps (TARA: api+ollama+db+frontend) and run them via docker-compose.
- ✅ I deploy to VPS (Hetzner/Render) through Coolify with TLS, and have done on-prem container deployment.
- ✅ I run Nginx as a reverse proxy in front of FastAPI/uvicorn (VMS) — TLS, static, routing.
- ✅ I keep secrets out of images and inject config via env (Secret Vault discipline).
- ✅ I've built CI/CD with GitHub Actions (lint/test/build/deploy), running pytest + RTL.
- ✅ I can clearly articulate *where* a queue/worker belongs (VMS NVD sync, bulk Jira) and *why*.
- ✅ I right-size architecture — and I can defend "monolith-first" and "you probably don't need K8s" as senior judgment.

---

*Numbers to fill before interview:* `[fill in: VMS NVD sync runtime & record count]`, `[fill in: bulk Jira batch size]`, `[fill in: TARA container count / image sizes]`, `[fill in: deploy frequency]`, `[fill in: VPS specs on Hetzner]`, `[fill in: CI pipeline duration]`.
