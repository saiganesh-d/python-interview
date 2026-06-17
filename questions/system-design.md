# System Design Question Bank (mid-level)

> They won't expect FAANG-scale, but they WILL expect structured thinking + trade-offs. ⭐ = very likely.

## How to approach ANY design question (say this framework out loud)
1. **Clarify requirements** — functional (what it does) + non-functional (scale, latency, availability). Ask, don't assume.
2. **Estimate scale** — rough reads/writes/users (order of magnitude).
3. **Define the API** — key endpoints (REST).
4. **Data model** — entities, relationships, SQL vs NoSQL choice.
5. **High-level architecture** — client → LB → app servers → DB + cache.
6. **Scale & bottlenecks** — caching, replication, sharding, queues.
7. **Trade-offs** — state what you'd optimize and what you'd sacrifice.

## ⭐ Core concepts (be fluent)

**⭐ REST API design principles?**
- Resources as nouns, plural: `/users`, `/users/{id}/notes`.
- HTTP verbs: GET (read), POST (create), PUT/PATCH (update), DELETE.
- Proper status codes: 200, 201, 204, 400, 401, 403, 404, 409, 500.
- Stateless, versioned (`/api/v1/`), pagination, filtering, consistent error format.
- Idempotency: GET/PUT/DELETE idempotent; POST is not.

**⭐ SQL vs NoSQL — when each?**
- **SQL** (Postgres/MySQL): structured data, relations, ACID transactions, complex queries/joins. Default choice.
- **NoSQL** (DynamoDB/Mongo): flexible schema, massive scale, simple access patterns, high write throughput, denormalized. Trade consistency/joins for scale.
- Most apps: start SQL; add NoSQL/cache for specific hot paths.

**⭐ Caching — where and why?**
Store frequently-read, rarely-changing data closer to the user to cut DB load & latency. Layers: browser, CDN (CloudFront), application cache (Redis/ElastiCache), DB query cache.
- **Strategies**: cache-aside (lazy), write-through, write-back.
- **Invalidation** is the hard part — use TTLs + explicit invalidation on writes. "There are only two hard things: cache invalidation and naming."

**⭐ Horizontal vs vertical scaling?**
Vertical = bigger machine (simple, has a ceiling, single point of failure). Horizontal = more machines + load balancer (scales further, needs **stateless** servers, more complex). Prefer horizontal for web tiers.

**⭐ Load balancing?**
Distributes requests across servers (round-robin, least-connections). Enables horizontal scale + high availability + health checks. ALB on AWS.

**Statelessness — why it matters?**
If app servers hold no session state, any server can handle any request → easy horizontal scaling & failover. Push state to a shared store (Redis/DB) or use JWTs.

**Database scaling: replication vs sharding?**
- **Replication**: copies of the DB; read replicas offload reads; primary handles writes. Improves read scale + availability.
- **Sharding/partitioning**: split data across DBs by a key (e.g., user_id). Scales writes/storage; adds complexity (cross-shard queries, rebalancing).

**⭐ Message queues — why?**
Decouple producers from consumers; smooth spikes; async processing; retries. E.g., user uploads a video → queue → worker transcodes. AWS SQS, RabbitMQ, Kafka (streaming). Improves resilience & responsiveness.

**Synchronous vs asynchronous?**
Sync: caller waits for the result (simple, but slow/coupled). Async: fire-and-forget via queue/background job (responsive, resilient, eventually consistent). Use async for slow work (emails, image processing, reports).

**CAP theorem (one line)?**
In a network partition you must choose Consistency or Availability — can't have both. SQL systems lean CP; many NoSQL lean AP (eventual consistency).

**Idempotency — why care?**
A retried request shouldn't double-charge/double-create. Use idempotency keys, or design endpoints (PUT) to be safe to repeat.

**Rate limiting?**
Protects the API from abuse/overload. Token bucket / fixed window at the gateway or app. Return 429.

## ⭐ Practice these two out loud (Day 3)

**1) Design a URL shortener**
- API: `POST /shorten {url}` → short code; `GET /{code}` → 301 redirect.
- Encode an auto-increment id to base62 (short, unique), or hash + collision check.
- DB: `code → long_url` (key-value → DynamoDB scales great; or SQL with index).
- **Cache** hot codes in Redis (reads >> writes). CDN for redirects.
- Scale: read-heavy → replicas + cache; codes are immutable → easy to cache.

**2) Design the backend for a notes app (your project!)**
- Entities: User, Note(id, user_id, title, body, created_at).
- API: `/api/notes` CRUD, JWT auth, pagination, `?search=`.
- DB: Postgres (RDS), index on `user_id`.
- Architecture: React on CloudFront → ALB → Django/DRF on ECS → RDS; uploads to S3.
- Scale: stateless API + Auto Scaling; cache common reads; add search (Postgres full-text → Elasticsearch later).
- Trade-offs: started monolith for speed; would split services only when a clear bottleneck appears.

> **Tip:** Tie every system-design answer back to your project. It shows you've actually built, not just memorized.
