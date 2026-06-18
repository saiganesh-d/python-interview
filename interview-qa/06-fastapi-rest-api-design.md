# FastAPI & REST API Design — Deep Interview Study (Fractal Analytics)

> Candidate: **Saiganesh** — Engineer/Senior Engineer FullStack (React + Python/FastAPI, Azure/AWS).
> JD core: build FastAPI backends, **expose data-science/algorithmic output via REST APIs**, REST/API design.
> Rounds: **Tech 1** = OOP/REST + coding · **Tech 2** = API design (LLD).
>
> Flagship projects woven throughout:
> - **TARA Copilot** — FastAPI wrapping a RAG pipeline; grounded answers; **token streaming**. (The "expose DS output via REST" story.)
> - **VMS** — Django/DRF + FastAPI; REST for CVE triage, bulk actions, RBAC.
> - **Secret Vault** — FastAPI REST API storing/retrieving secrets with scoped tokens.
>
> ⭐ = very likely to be asked. "How to say it out loud" = the spoken answer. `[fill in: ...]` = plug a real number.

---

## Table of Contents

1. [REST Fundamentals](#1-rest-fundamentals)
2. [HTTP Methods — Safety & Idempotency](#2-http-methods)
3. [Status Codes](#3-status-codes)
4. [Resource Naming & URI Design](#4-resource-naming)
5. [API Versioning](#5-api-versioning)
6. [Pagination, Filtering, Sorting, Search](#6-pagination)
7. [HATEOAS, Content Negotiation, Idempotency Keys](#7-hateoas-etc)
8. [⭐ "Design a REST API for X" — Framework + Worked Examples](#8-design-framework)
9. [FastAPI Deep — Params, Pydantic, DI, Async](#9-fastapi-deep)
10. [FastAPI Features — Docs, Middleware, CORS, Background, Routers, Streaming, WebSockets, Uploads](#10-fastapi-features)
11. [Auth — OAuth2 + JWT, API Keys, Scopes, Refresh, RBAC](#11-auth)
12. [Validation & Errors](#12-validation-errors)
13. [Data Layer — SQLAlchemy, Sessions, Transactions, N+1, Alembic](#13-data-layer)
14. [Performance & Robustness](#14-performance)
15. [Testing](#15-testing)
16. [Integrating ML / Data-Science Output](#16-ml-integration)
17. [Likely Follow-ups (rapid)](#17-followups)
18. [Rapid-fire Cheat Sheet](#18-cheatsheet)
19. [Traps & Gotchas](#19-traps)

---

<a name="1-rest-fundamentals"></a>
## 1. REST Fundamentals

**⭐ What is REST? Give the textbook definition and then your own.**

REST (Representational State Transfer) is an architectural style for networked APIs defined by Roy Fielding. Out loud:

> "REST is a style, not a protocol. You model the system as **resources** — nouns like a vulnerability, a secret, a chat session — each identified by a URL. Clients act on those resources with a small fixed set of HTTP **verbs**, and the server returns a **representation** of the resource, usually JSON. The key constraints are: it's **client–server**, **stateless** (every request carries everything needed to process it — no server-side session memory between calls), it's **cacheable**, it has a **uniform interface** (same verbs, same status-code semantics everywhere), and it's **layered** (a client can't tell if it's talking to the origin server or a proxy/load balancer in front). The payoff is that any client and any server speak the same language, so the API is predictable and scalable."

**⭐ What does "stateless" actually mean, and why does it matter?**

> "Stateless means the server keeps no client context between requests. The auth token, the resource ID, any pagination cursor — all of it travels in each request. The benefit is **horizontal scalability**: any of my uvicorn workers behind the load balancer can serve any request, because none of them holds session state in memory. In TARA, the chat is conversational, but I don't keep state in the process — the conversation lives in a store (DB/Redis) keyed by a `session_id` the client sends each turn. So even a 'stateful-feeling' product stays statelessly served."

**What are the six REST constraints? (one-liners)**

1. **Client–Server** — separation of concerns; UI and data evolve independently.
2. **Stateless** — no per-client server memory between requests.
3. **Cacheable** — responses say whether/how long they can be cached.
4. **Uniform Interface** — resources + standard verbs + self-descriptive messages + HATEOAS.
5. **Layered System** — intermediaries (LB, cache, gateway) are invisible to the client.
6. **Code on Demand** (optional) — server can ship executable code (rarely used).

**What's the difference between REST and "RESTful" / "HTTP API"?**

> "Strictly, true REST requires HATEOAS — responses link to next actions. Almost nobody does full HATEOAS; what we build are 'RESTful' or 'REST-ish' HTTP+JSON APIs: resource URLs, HTTP verbs, status codes, but the client knows the URL templates ahead of time. That's the pragmatic 99% case, and it's fine to say so."

**Trade-off — REST vs RPC vs GraphQL vs gRPC (when would you NOT pick REST?)**

| Style | Best for | Weakness |
|---|---|---|
| **REST** | CRUD-ish resources, public APIs, caching, broad client support | over/under-fetching; many round-trips for graphs |
| **GraphQL** | client picks exact fields; deep graphs; mobile bandwidth | caching is hard; complexity; N+1 on resolvers |
| **gRPC** | internal service-to-service, low latency, streaming, typed contracts | not browser-native; binary; less human-debuggable |
| **RPC/JSON-RPC** | action-oriented ("do this") rather than resource-oriented | loses uniform interface, caching, discoverability |

> "For TARA I actually blend: the public API is REST, but the answer is **streamed** — which is a place where pure REST request/response bends toward server-sent streaming. For internal DS calls I'd consider gRPC if latency mattered, but REST kept the data-science team's integration dead simple."

---

<a name="2-http-methods"></a>
## 2. ⭐ HTTP Methods — Safety & Idempotency

**⭐ Walk me through the HTTP verbs and their semantics.**

| Verb | Purpose | Safe? | Idempotent? | Body? | Typical success |
|---|---|---|---|---|---|
| **GET** | read a resource/collection | ✅ | ✅ | no | 200 |
| **POST** | create / non-idempotent action | ❌ | ❌ | yes | 201 (created), 200/202 |
| **PUT** | full replace (or create at known ID) | ❌ | ✅ | yes | 200 / 201 / 204 |
| **PATCH** | partial update | ❌ | ❌ (not guaranteed) | yes | 200 / 204 |
| **DELETE** | remove a resource | ❌ | ✅ | optional | 204 / 200 |
| **HEAD** | GET headers only (existence/size) | ✅ | ✅ | no | 200 |
| **OPTIONS** | capabilities / CORS preflight | ✅ | ✅ | no | 200/204 |

**⭐ Define "safe" and "idempotent" — and why they matter.**

> "**Safe** means the request doesn't change server state — GET, HEAD, OPTIONS. You can prefetch them, a crawler can hit them, no harm. **Idempotent** means doing it once or N times leaves the same end state. GET, PUT, DELETE are idempotent; POST and PATCH generally aren't. This matters for **retries**: networks fail, so clients and proxies retry. You can safely auto-retry an idempotent call. You cannot blindly retry a POST that creates a payment or a secret — you'd duplicate it. That's exactly why **idempotency keys** exist for POST."

**⭐ PUT vs PATCH — the classic. (Almost certain follow-up.)**

> "**PUT replaces the whole resource** — you send the full representation, and anything you omit is treated as cleared/defaulted. It's idempotent: send the same PUT twice, same result. **PATCH is a partial update** — you send only the fields that change. PATCH is *not* guaranteed idempotent: a PATCH that says 'increment retries by 1' changes state each time. In VMS, when a triager edits a single field — say setting a CVE's status to `accepted_risk` — I use **PATCH** so I don't have to round-trip the entire vulnerability object and risk clobbering a field another user just changed. If I were importing/overwriting a full record from a scanner, I'd use **PUT**."

Follow-up — *"Is DELETE idempotent even though the second call 404s?"*
> "Yes. Idempotency is about the **end state**, not the status code. After one DELETE the resource is gone; after a second DELETE it's still gone. Returning 404 the second time is fine — the *state* is identical. Some teams return 204 every time to keep it clean; both are defensible."

Follow-up — *"Make POST idempotent."*
> "Add an **Idempotency-Key** header. Client generates a UUID per logical operation. Server stores `key -> (response, status)`; first request does the work, later requests with the same key return the cached result instead of re-executing. Stripe is the reference pattern. (Code in §7.)"

---

<a name="3-status-codes"></a>
## 3. ⭐ Status Codes

**⭐ Give me the classes and the ones you actually use.**

- **2xx Success** — request worked.
- **3xx Redirection** — go elsewhere / use cache.
- **4xx Client error** — the caller did something wrong; don't retry unchanged.
- **5xx Server error** — we broke; retry may help.

**⭐ The codes interviewers probe — when do you use each?**

| Code | Name | Use it when… |
|---|---|---|
| **200** | OK | successful GET/PUT/PATCH; POST that returns data but didn't create a resource |
| **201** | Created | POST/PUT created a resource; return `Location` header + the new body |
| **202** | Accepted | async work accepted but not done — **long-running ML job**; return a job URL to poll |
| **204** | No Content | success with empty body — DELETE, or PUT/PATCH where you return nothing |
| **301/308** | Moved Permanently | resource permanently relocated (308 keeps method/body) |
| **304** | Not Modified | conditional GET — ETag/If-None-Match matched; client uses its cache |
| **400** | Bad Request | malformed request the server can't parse / generic client error |
| **401** | Unauthorized | missing/invalid credentials — "who are you?" (really *unauthenticated*) |
| **403** | Forbidden | authenticated but not allowed — "I know you, you can't do this" (RBAC) |
| **404** | Not Found | resource doesn't exist (or you hide existence for security) |
| **405** | Method Not Allowed | wrong verb on a valid URL |
| **409** | Conflict | state conflict — duplicate unique key, optimistic-lock version mismatch |
| **410** | Gone | resource intentionally removed permanently (e.g., expired secret) |
| **415** | Unsupported Media Type | wrong `Content-Type` |
| **422** | Unprocessable Entity | syntactically fine but **semantic validation failed** — FastAPI's default for Pydantic errors |
| **429** | Too Many Requests | rate limit hit; include `Retry-After` |
| **500** | Internal Server Error | unhandled exception on our side |
| **502/503/504** | Bad Gateway / Unavailable / Gateway Timeout | upstream broken / overloaded / timed out — e.g., the LLM upstream timed out |

**⭐ 401 vs 403 — the trap.**

> "**401 = not authenticated** ('I don't know who you are' — bad/missing token). **403 = authenticated but not authorized** ('I know who you are, you're not allowed'). In Secret Vault: no token or expired token → 401; valid token but the scope doesn't include `secrets:read` for that path → 403."

**⭐ 400 vs 422 — also a trap.**

> "I treat **422** as 'the request is well-formed JSON but fails business/schema validation' — wrong types, missing required field, value out of range. That's FastAPI/Pydantic's default. **400** is for things even earlier — body isn't valid JSON, a malformed query param, a header that doesn't parse. Some teams collapse everything client-side into 400; FastAPI defaults to 422 for validation and I keep that because the Swagger docs and clients understand it."

**409 — when?**
> "State conflicts. In Secret Vault, creating a secret at a path that already exists → 409. With optimistic locking, a PATCH carrying a stale `version` → 409 so the client refetches and retries. In VMS, trying to start a triage workflow that's already in a terminal state → 409."

**Follow-up — *"Server is calling the LLM and it times out. What status?"***
> "**504 Gateway Timeout** (we're a gateway to the model) or **503** if we're shedding load, with a `Retry-After`. Not 500 — 500 implies an unhandled bug; this is a known upstream condition I handle deliberately, often after my own client-side timeout fires."

---

<a name="4-resource-naming"></a>
## 4. Resource Naming & URI Design

**⭐ What are your URI design rules?**

> "Resources are **nouns, plural**, lowercase, hyphenated. The HTTP verb is the action, so the URL never contains verbs. Hierarchy expresses ownership via nesting, but I cap nesting at one or two levels."

Good:
```
GET    /api/v1/vulnerabilities
GET    /api/v1/vulnerabilities/{id}
POST   /api/v1/vulnerabilities
PATCH  /api/v1/vulnerabilities/{id}
GET    /api/v1/assets/{asset_id}/vulnerabilities      # nested: vulns of an asset
POST   /api/v1/secrets
GET    /api/v1/secrets/{path}
DELETE /api/v1/secrets/{path}
```

Bad (verbs in URL, singular, deep nesting):
```
POST /getVulnerability
GET  /api/v1/vulnerability/get/123
GET  /orgs/1/teams/2/users/3/vulnerabilities/4/comments/5/replies
```

**Rules of thumb:**
- Collection = plural noun (`/secrets`), item = `/secrets/{id}`.
- Don't put actions in the path; use the verb. Exception: genuine **non-CRUD actions** — model as a sub-resource or a controller resource: `POST /vulnerabilities/{id}/bulk-accept`, `POST /sessions/{id}/messages`. These are pragmatic and accepted.
- Filtering/sorting/paging go in the **query string**, not the path: `/vulnerabilities?severity=critical&sort=-cvss&page=2`.
- Keep IDs opaque; prefer UUIDs over leaking auto-increment counts.
- Use `kebab-case` in URLs, `snake_case`/`camelCase` consistently in JSON (pick one).

**Follow-up — *"How do you model a 'bulk accept 200 CVEs' action RESTfully?"***
> "Two clean options. (1) A **controller/action sub-resource**: `POST /vulnerabilities/bulk-actions` with a body `{action:'accept', ids:[...], reason:'...'}` returning **202** + a job to poll if it's slow, or 200 with a per-item result array if fast. (2) PATCH a filtered collection — riskier and less explicit. In VMS I went with the explicit bulk-actions endpoint because triagers select hundreds at once and I needed a per-item success/failure report."

---

<a name="5-versioning"></a>
## 5. ⭐ API Versioning

**⭐ How do you version an API, and which do you prefer?**

| Strategy | Example | Pros | Cons |
|---|---|---|---|
| **URI path** | `/api/v1/...` | obvious, cache-friendly, easy in browser/Swagger, trivial routing | "version in the URL isn't pure REST"; URL changes per version |
| **Header** | `Accept: application/vnd.vms.v2+json` | clean URLs, content-negotiation pure | invisible, harder to test in a browser, easy to forget |
| **Query param** | `/vulnerabilities?version=2` | simple | pollutes query space; caching quirks |

> "I default to **URL path versioning** (`/api/v1`) — it's the most discoverable, it shows up cleanly in Swagger, and clients and CDNs handle it trivially. With FastAPI I implement each version as its own `APIRouter` mounted under a prefix, so v1 and v2 can coexist while clients migrate. Header/media-type versioning is 'purer' but I've found it costs more in tooling and support tickets than it's worth for the teams I serve."

**⭐ How do you version without breaking clients? (guaranteed follow-up)**

> "Two principles. First, **additive, non-breaking changes don't need a new version** — adding an optional field, a new endpoint, a new enum value (if clients tolerate unknowns). Breaking changes — removing/renaming a field, changing a type, tightening validation, changing semantics — *do*. Second, I follow a contract: **never break v1**. When v2 ships, v1 keeps running with a **deprecation policy** — `Deprecation` and `Sunset` headers, a date, docs, and metrics on who's still calling v1 so I can chase the last stragglers before retiring it. Pydantic helps: response models pin the exact shape, so I won't accidentally leak a new internal field into v1."

```python
# main.py — coexisting versions
from fastapi import FastAPI
from app.api import v1, v2

app = FastAPI()
app.include_router(v1.router, prefix="/api/v1", tags=["v1"])
app.include_router(v2.router, prefix="/api/v2", tags=["v2"])
```

---

<a name="6-pagination"></a>
## 6. ⭐ Pagination, Filtering, Sorting, Search

**⭐ Offset vs cursor (keyset) pagination — explain both and the trade-off.**

**Offset/limit** (`?limit=50&offset=100` or `?page=3&page_size=50`):
> "Simple, lets you jump to any page, and you can show 'page 7 of 200'. The problems: it's **slow on deep pages** — `OFFSET 1000000` makes the DB scan and discard a million rows — and it's **unstable**: if rows are inserted/deleted while the user pages, items shift and you get duplicates or skips."

**Cursor / keyset** (`?limit=50&cursor=eyJpZCI6...`):
> "Instead of an offset, you remember the last item's sort key and ask for 'the next 50 after this key' — `WHERE (created_at, id) < (:last_created, :last_id) ORDER BY created_at DESC, id DESC LIMIT 50`. With an index this is **O(limit)** regardless of depth, and it's **stable** under inserts. The cost: no random page jumps, and the cursor must be opaque/encoded. This is what you want for infinite scroll and large datasets."

**⭐ "How do you paginate 1,000,000 rows?" (named follow-up)**

> "**Keyset/cursor pagination**, not offset. Offset 1M forces the database to walk and throw away a million rows on every deep page — latency grows with depth. With keyset I keep a composite index on the sort columns (e.g., `(created_at, id)`) and page with a `WHERE (created_at, id) < (last_seen)` predicate plus `LIMIT`, which uses the index and stays constant-time no matter how deep. For VMS scan results — easily hundreds of thousands of findings — that's exactly what I'd do. If product *needs* 'jump to page N', I either cap how deep offset goes, or precompute page boundaries. I also **never** return an unbounded list — there's always a server-enforced max `limit` (say 100) so one client can't ask for everything."

```python
# Cursor pagination params via a reusable dependency
from fastapi import Depends, Query
from pydantic import BaseModel
import base64, json

class CursorPage(BaseModel):
    items: list
    next_cursor: str | None = None

def encode_cursor(last_created: str, last_id: int) -> str:
    return base64.urlsafe_b64encode(
        json.dumps({"c": last_created, "i": last_id}).encode()
    ).decode()

def pagination(limit: int = Query(50, ge=1, le=100),
               cursor: str | None = Query(None)):
    parsed = None
    if cursor:
        parsed = json.loads(base64.urlsafe_b64decode(cursor))
    return {"limit": limit, "cursor": parsed}

@app.get("/api/v1/vulnerabilities")
async def list_vulns(p: dict = Depends(pagination), db=Depends(get_db)):
    rows = await repo.page(db, limit=p["limit"] + 1, cursor=p["cursor"])
    has_more = len(rows) > p["limit"]
    rows = rows[:p["limit"]]
    nxt = encode_cursor(rows[-1].created_at.isoformat(), rows[-1].id) if has_more else None
    return CursorPage(items=rows, next_cursor=nxt)
```

**Filtering, sorting, searching — conventions.**
- Filter: `?severity=critical&status=open&cvss_gte=7.0`
- Sort: `?sort=-cvss,created_at` (leading `-` = descending; allow-list sortable fields).
- Search: `?q=log4j` (free-text, separate from exact filters).
- **Allow-list everything** — never pass a raw `sort` column or filter key into SQL; map to known columns to avoid injection and accidental sorts on unindexed columns.

**Where do you put the pagination metadata?**
> "Either in the body (`{items, next_cursor, total?}`) or in headers (`Link: <...>; rel=\"next\"`, `X-Total-Count`). I usually put it in the body for JSON clients — it's easier for the React frontend to consume — and skip `total` for cursor pages because counting all rows defeats the performance win."

---

<a name="7-hateoas-etc"></a>
## 7. HATEOAS, Content Negotiation, Idempotency Keys

**What is HATEOAS and do you implement it?**

> "Hypermedia As The Engine Of Application State — the server includes **links** to the next valid actions in each response, so the client discovers the API by following links rather than hardcoding URLs. A vulnerability response might embed `_links: {accept: '/vulnerabilities/123/accept', comments: '...'}`. In practice I rarely do full HATEOAS — it adds payload and most frontends know the routes. I'm *aware* of it, I'll add targeted links (like a `next` cursor, or a job-status URL on a 202), but I don't build a full HAL/JSON:API hypermedia layer unless a public, long-lived, machine-driven API needs it."

**Content negotiation.**
> "The client says what it wants with `Accept` (and what it's sending with `Content-Type`); the server responds with the best match and sets `Content-Type`. FastAPI defaults to JSON. I use negotiation for things like serving CSV vs JSON export of scan results: `Accept: text/csv` → stream a CSV; otherwise JSON. If we can't satisfy the `Accept`, return **406 Not Acceptable**; wrong `Content-Type` on a body → **415**."

**⭐ Idempotency keys — implement one.**

> "For non-idempotent POSTs that must not double-execute — creating a secret, kicking off a paid LLM batch — the client sends an `Idempotency-Key` header (a UUID per logical attempt). I store the key with the computed response; a retry with the same key replays the stored response instead of re-running the work. Keys are scoped per-user and expire (e.g., 24h)."

```python
from fastapi import Header, HTTPException, Depends
import json

async def idempotent(
    idempotency_key: str | None = Header(default=None),
    redis = Depends(get_redis),
):
    return idempotency_key  # validated/used in the handler

@app.post("/api/v1/secrets", status_code=201)
async def create_secret(body: SecretIn,
                        key: str | None = Depends(idempotent),
                        redis = Depends(get_redis),
                        user = Depends(current_user)):
    if key:
        cache_id = f"idem:{user.id}:{key}"
        cached = await redis.get(cache_id)
        if cached:
            return json.loads(cached)          # replay — no double write
    result = await store_secret(body, user)    # the real, non-idempotent work
    if key:
        await redis.set(cache_id, json.dumps(result), ex=86400)  # 24h
    return result
```

---

<a name="8-design-framework"></a>
## 8. ⭐ "Design a REST API for X" — Framework + Worked Examples

**⭐ Give me a repeatable framework you say out loud in the LLD round.**

> "I drive every API-design question through the same checklist, in order:
> 1. **Clarify scope & actors** — who calls it, read-heavy or write-heavy, scale, latency, sync or async?
> 2. **Resources** — nouns; identify entities and their relationships.
> 3. **Endpoints & verbs** — map CRUD + any non-CRUD actions to verbs.
> 4. **Schemas** — request/response Pydantic models; required vs optional; validation.
> 5. **Status codes** — success and error per endpoint.
> 6. **Auth & authorization** — who can do what (authn + RBAC scopes).
> 7. **Versioning** — `/api/v1`, deprecation policy.
> 8. **Pagination/filter/sort** — cursor vs offset; query params.
> 9. **Errors** — consistent error shape, 4xx/5xx, validation.
> 10. **Cross-cutting** — rate limiting, idempotency, caching/ETag, observability, async/long-running jobs.
>
> Then I sketch 2–3 endpoints concretely so it's not hand-wavy."

### Worked example A — VMS Vulnerability API

**Resources:** `assets`, `vulnerabilities` (findings), `triage-decisions`, `bulk-actions`, `users/roles`.

**Endpoints:**
```
GET    /api/v1/vulnerabilities                 # list w/ filter, sort, cursor page
GET    /api/v1/vulnerabilities/{id}            # one finding
PATCH  /api/v1/vulnerabilities/{id}            # triage one (status, owner, notes)
POST   /api/v1/vulnerabilities/bulk-actions    # bulk accept/dismiss -> 202 + job
GET    /api/v1/jobs/{job_id}                    # poll bulk job
GET    /api/v1/assets/{asset_id}/vulnerabilities  # nested
```

**Schemas (Pydantic):**
```python
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field

class Severity(str, Enum):
    low = "low"; medium = "medium"; high = "high"; critical = "critical"

class TriageStatus(str, Enum):
    open = "open"; in_progress = "in_progress"
    accepted_risk = "accepted_risk"; remediated = "remediated"; false_positive = "false_positive"

class VulnOut(BaseModel):
    id: int
    cve_id: str
    severity: Severity
    cvss: float = Field(ge=0, le=10)
    status: TriageStatus
    asset_id: int
    created_at: datetime
    model_config = {"from_attributes": True}    # ORM mode

class VulnPatch(BaseModel):
    status: TriageStatus | None = None
    owner_id: int | None = None
    notes: str | None = Field(default=None, max_length=2000)

class BulkAction(BaseModel):
    action: TriageStatus
    ids: list[int] = Field(min_length=1, max_length=1000)
    reason: str = Field(min_length=3, max_length=500)
```

**Status codes:** list/get 200; PATCH 200 (or 409 on stale version); bulk 202 + `Location: /jobs/{id}`; not found 404; unauthorized 401; lacking `vuln:write` 403; validation 422.

**Auth/RBAC:** JWT bearer; scopes `vuln:read`, `vuln:write`, `vuln:admin`. Triagers can PATCH; only admins bulk-dismiss criticals.

**Why 202 for bulk?** "Accepting 1000 CVEs touches many rows and may fan out notifications — too slow for a synchronous request, so I accept it, return a job URL, and let the client poll or subscribe."

### Worked example B — Secret Vault API

**Resources:** `secrets`, `tokens` (scoped), `audit-logs`.
```
POST   /api/v1/secrets                  # create -> 201 (Idempotency-Key supported)
GET    /api/v1/secrets/{path}           # read latest -> 200, 403 if scope mismatch
GET    /api/v1/secrets/{path}/versions  # version history
PUT    /api/v1/secrets/{path}           # full new version (idempotent replace)
DELETE /api/v1/secrets/{path}           # soft-delete -> 204 (or 410 later)
POST   /api/v1/tokens                   # mint a scoped token
```

**Scoped tokens:** "A token carries scopes like `secrets:read:team-a/*`. The auth dependency checks the requested path against the token's allowed prefixes/actions; mismatch → 403. Reads never log the plaintext; every access writes an **audit-log** entry (who, what path, when)."

**Security specifics:** secrets encrypted at rest; responses can be one-time/short-TTL; never echo secret values in error messages or logs; 404 (not 403) on paths the caller can't even see, to avoid leaking existence.

---

<a name="9-fastapi-deep"></a>
## 9. FastAPI Deep — Params, Pydantic, DI, Async

**⭐ How does FastAPI know what's a path/query/body param?**

> "FastAPI infers it from the function signature and type hints. A name that appears in the path template is a **path param**. A scalar with a default (or `Query(...)`) is a **query param**. A Pydantic `BaseModel` argument is the **request body**. It builds the OpenAPI schema and the validation from those hints — that type-driven design is the whole point of FastAPI."

```python
from fastapi import FastAPI, Path, Query
app = FastAPI()

@app.get("/api/v1/vulnerabilities/{vuln_id}")
async def get_vuln(
    vuln_id: int = Path(ge=1),                          # path param, validated
    include_history: bool = Query(False),               # query param w/ default
    severity: Severity | None = Query(None),            # optional enum query
):
    ...
```

### ⭐ Pydantic models

**⭐ Why separate request and response models?**

> "Three reasons. **Security** — the input model shouldn't be the output model; a user posting a secret sends a value, but the response model omits it (or returns only a reference). I never want to accidentally serialize a password hash or an internal field back. **Validation** — the input model enforces constraints (lengths, ranges, enums). **Contract stability** — `response_model` filters the output to exactly the declared fields, so adding a column to the ORM model doesn't silently leak into the API. So I keep `XIn`, `XOut`, `XPatch` distinct."

```python
from pydantic import BaseModel, EmailStr, field_validator, Field

class UserIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12)

    @field_validator("password")
    @classmethod
    def strong(cls, v: str) -> str:
        if v.isalnum():
            raise ValueError("password needs a symbol")
        return v

class UserOut(BaseModel):          # note: NO password field ever
    id: int
    email: EmailStr
    model_config = {"from_attributes": True}   # was orm_mode=True in v1

@app.post("/api/v1/users", response_model=UserOut, status_code=201)
async def create_user(body: UserIn, db=Depends(get_db)) -> UserOut:
    user = await repo.create(db, body)
    return user      # ORM object -> filtered through UserOut (from_attributes)
```

**`response_model` — what does it actually do?**
> "It validates and **serializes** the return value against the declared model, **dropping anything not in the model**, and it documents the response schema in OpenAPI. Pair it with `response_model_exclude_none=True` when I want to omit nulls. It's my guardrail against over-exposing data."

**ORM mode / `from_attributes`.**
> "By default Pydantic reads from dicts. Setting `model_config = {'from_attributes': True}` (Pydantic v2; it was `orm_mode=True` in v1) lets a model be built from an arbitrary object by attribute access — so I can return a SQLAlchemy ORM row directly and FastAPI serializes it via the response model."

**Validators — field vs model level.**
```python
from pydantic import model_validator

class DateRange(BaseModel):
    start: datetime
    end: datetime

    @model_validator(mode="after")
    def check_order(self):
        if self.end < self.start:
            raise ValueError("end must be after start")
        return self
```

**Pydantic v1 → v2 quick map (likely asked):** `@validator`→`@field_validator`, `@root_validator`→`@model_validator`, `orm_mode`→`from_attributes`, `.dict()`→`.model_dump()`, `.json()`→`.model_dump_json()`, `class Config`→`model_config = {...}`. v2 core is Rust-backed → much faster validation.

### ⭐ Dependency Injection (`Depends`)

**⭐ Explain FastAPI dependency injection and why it's powerful.**

> "`Depends` lets me declare 'this endpoint needs X' and FastAPI resolves X for me — calls the provider, injects the result, caches it within the request, and handles cleanup. I use it for the three big cross-cutting concerns: **DB sessions** (one per request, closed after), **auth** (resolve the current user / check scopes), and **shared query params** like pagination. Dependencies can depend on other dependencies, so I compose them — `current_user` depends on `decode_token` depends on the bearer scheme. The bonus: in tests I **override** a dependency to inject a fake DB or a fake user without touching the endpoint code."

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncSession:        # DB session per request
    async with SessionLocal() as session:
        yield session                       # closed automatically after response

def require_scope(scope: str):              # parameterized dependency (factory)
    async def checker(user=Depends(current_user)):
        if scope not in user.scopes:
            raise HTTPException(403, "insufficient scope")
        return user
    return checker

@app.delete("/api/v1/secrets/{path}", status_code=204)
async def delete_secret(path: str,
                        db=Depends(get_db),
                        user=Depends(require_scope("secrets:write"))):
    await repo.soft_delete(db, path, user)
```

**`yield` dependencies — what are they for?**
> "Setup/teardown. Code before `yield` runs before the endpoint; code after runs after the response is sent — perfect for opening and closing a DB session or a file. Exceptions propagate so I can roll back in the teardown."

### ⭐ Async endpoints

**⭐ `async def` vs `def` — when do you use each? (very likely)**

> "Use `async def` when the handler does **async I/O** — `await`ing an async DB driver, an async HTTP client to the LLM, Redis. The event loop can serve other requests while one awaits, which is FastAPI's superpower for I/O-bound workloads. Use plain `def` when the work is **synchronous/blocking** — a sync DB driver, CPU work, a library with no async API. FastAPI runs `def` handlers in a **threadpool** automatically, so they don't block the loop. The cardinal sin is doing blocking work (a `requests.get`, `time.sleep`, heavy CPU) **inside an `async def`** — that freezes the whole event loop and tanks every concurrent request."

**⭐ Follow-up — *"You must call a slow, blocking library inside an async endpoint. What do you do?"***
> "Push it off the event loop. Either make the whole handler `def` (FastAPI threadpools it), or from within `async def` use `await anyio.to_thread.run_sync(blocking_fn, args)` (or `run_in_executor`). For CPU-bound work a threadpool doesn't help because of the GIL — then I offload to a **process pool** or, better, a **task queue** (Celery/RQ/Arq) and return 202. In TARA, the LLM call is I/O-bound and the SDK is async, so the handler stays `async def` and awaits cleanly."

```python
import anyio

@app.post("/api/v1/score")
async def score(payload: ScoreIn):
    # blocking sklearn .predict() — keep it off the loop
    result = await anyio.to_thread.run_sync(model.predict, payload.features)
    return {"score": result}
```

---

<a name="10-fastapi-features"></a>
## 10. FastAPI Features — Docs, Middleware, CORS, Background, Routers, Streaming, WebSockets, Uploads

### ⭐ Auto docs (OpenAPI / Swagger / ReDoc)

> "FastAPI generates an **OpenAPI** schema from the type hints and Pydantic models, and serves interactive docs at **`/docs`** (Swagger UI) and **`/redoc`** (ReDoc), with the raw schema at `/openapi.json`. I get request/response schemas, example values, and a 'try it out' console for free — huge for letting the data-science team test TARA endpoints without writing a client. I customize with `tags`, `summary`, `description`, `response_model`, and `responses={...}` to document error codes. In prod I sometimes disable `/docs` or gate it behind auth."

```python
app = FastAPI(
    title="VMS API", version="1.0.0",
    docs_url="/docs", redoc_url="/redoc",
)

@app.get("/api/v1/vulnerabilities/{id}",
         response_model=VulnOut,
         responses={404: {"description": "Vulnerability not found"},
                    403: {"description": "Insufficient scope"}},
         tags=["vulnerabilities"], summary="Get one finding")
async def get_one(id: int): ...
```

### Lifespan (startup/shutdown)

> "The modern way is the **lifespan** context manager — I open shared resources (DB pool, Redis, **load the ML model / RAG index once**) before the app serves traffic and close them on shutdown. Loading the model at startup, not per-request, is critical for latency."

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = load_rag_index()      # once, at boot
    app.state.redis = await make_redis()
    yield
    await app.state.redis.aclose()

app = FastAPI(lifespan=lifespan)
```

### Middleware & CORS

> "Middleware wraps every request/response — I use it for request-ID injection, timing/logging, gzip, and CORS. **CORS** matters because the React app is on a different origin; `CORSMiddleware` whitelists allowed origins, methods, headers, and credentials. I never use `allow_origins=['*']` with credentials — I list exact origins."

```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.vms.internal"],   # exact, not "*", with creds
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_request_id(request, call_next):
    rid = request.headers.get("x-request-id") or str(uuid4())
    response = await call_next(request)
    response.headers["x-request-id"] = rid
    return response
```

### Exception handlers (consistent errors)

```python
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

class AppError(Exception):
    def __init__(self, code: str, message: str, status: int):
        self.code, self.message, self.status = code, message, status

@app.exception_handler(AppError)
async def app_error_handler(request, exc: AppError):
    return JSONResponse(status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message,
                           "request_id": request.headers.get("x-request-id")}})

@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc):
    return JSONResponse(status_code=422,
        content={"error": {"code": "validation_error", "details": exc.errors()}})
```

### Background tasks

> "`BackgroundTasks` runs short work *after* the response is sent — sending an email, writing an audit log — within the same process. It's fire-and-forget and not durable, so for anything that must not be lost or that's heavy, I use a real **task queue** instead."

```python
from fastapi import BackgroundTasks

@app.post("/api/v1/secrets/{path}", status_code=201)
async def write_secret(path: str, body: SecretIn, bg: BackgroundTasks):
    await store(path, body)
    bg.add_task(write_audit_log, path, "create")   # after response
    return {"path": path}
```

### Routers / modularization

```python
# app/api/v1/vulnerabilities.py
from fastapi import APIRouter, Depends
router = APIRouter(prefix="/vulnerabilities", tags=["vulnerabilities"],
                   dependencies=[Depends(verify_jwt)])   # auth on every route

@router.get("")     # GET /api/v1/vulnerabilities
async def list_(...): ...

# app/api/v1/__init__.py
from fastapi import APIRouter
from . import vulnerabilities, assets, jobs
router = APIRouter()
router.include_router(vulnerabilities.router)
router.include_router(assets.router)
router.include_router(jobs.router)
```

### ⭐ Streaming responses (tie to TARA token streaming)

**⭐ How does TARA stream tokens to the browser?**

> "The RAG pipeline yields tokens as the LLM generates them; I wrap that async generator in a **`StreamingResponse`** so bytes flush to the client as they're produced instead of buffering the whole answer. I serve it as **Server-Sent Events** (`text/event-stream`) so the React side reads an `EventSource`/streamed `fetch` and renders the answer token-by-token — that's the perceived-latency win users feel. The handler stays `async def` and the generator `await`s the model SDK. I also send a final event with citations so the answer stays grounded."

```python
from fastapi.responses import StreamingResponse

@app.post("/api/v1/chat/{session_id}/messages")
async def chat(session_id: str, body: ChatIn, user=Depends(current_user)):
    async def event_stream():
        async for token in rag_pipeline.stream(session_id, body.query):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield f"data: {json.dumps({'done': True, 'citations': [...]})}\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no"})  # disable proxy buffering
```

**SSE vs WebSocket for streaming?**
> "For one-way server→client token streaming, **SSE is simpler** — it's plain HTTP, auto-reconnects, works through most proxies, and fits REST. **WebSockets** are bidirectional and lower overhead per message — I'd use them if the client also streams up (live collaboration, voice). TARA is one-way generation, so SSE."

### WebSockets (awareness)

```python
from fastapi import WebSocket

@app.websocket("/ws/chat")
async def ws_chat(ws: WebSocket):
    await ws.accept()
    while True:
        msg = await ws.receive_text()
        async for token in rag_pipeline.stream(msg):
            await ws.send_text(token)
```

### File uploads

```python
from fastapi import UploadFile, File

@app.post("/api/v1/scans/import")
async def import_scan(file: UploadFile = File(...)):
    if file.content_type not in {"text/csv", "application/json"}:
        raise HTTPException(415, "unsupported type")
    content = await file.read()        # for large files, stream in chunks instead
    ...
```

---

<a name="11-auth"></a>
## 11. ⭐ Auth — OAuth2 + JWT, API Keys, Scopes, Refresh, RBAC

**⭐ Walk me through OAuth2 password flow + JWT in FastAPI.**

> "I expose a `/token` endpoint that takes username/password (OAuth2 password flow), verifies the hash, and returns a signed **JWT** access token. Every protected route depends on `OAuth2PasswordBearer`, which pulls the `Authorization: Bearer <jwt>` header; a `current_user` dependency **decodes and verifies** the token (signature + expiry), loads the user, and returns it — or raises 401. Because it's a dependency, I just add `Depends(current_user)` to any route and it's protected. The JWT is **stateless**: it carries the user id, scopes, and `exp`, so I don't hit the DB for session lookup on every call."

```python
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone

oauth2 = OAuth2PasswordBearer(tokenUrl="token")

def create_token(sub: str, scopes: list[str], minutes: int = 15) -> str:
    payload = {"sub": sub, "scopes": scopes,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes)}
    return jwt.encode(payload, SECRET, algorithm="HS256")

@app.post("/token")
async def login(form: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = await authenticate(db, form.username, form.password)
    if not user:
        raise HTTPException(401, "bad credentials",
                            headers={"WWW-Authenticate": "Bearer"})
    access = create_token(user.id, user.scopes, minutes=15)
    refresh = create_refresh_token(user.id)        # longer-lived, stored/rotated
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}

async def current_user(token: str = Depends(oauth2), db=Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(401, "invalid token", headers={"WWW-Authenticate": "Bearer"})
    user = await repo.get(db, payload["sub"])
    if not user:
        raise HTTPException(401, "user not found")
    user.scopes = payload.get("scopes", [])
    return user
```

**⭐ Scopes / RBAC — secure VMS and Secret Vault.**

> "I put **scopes** in the JWT (`vuln:read`, `vuln:write`, `secrets:read`, `secrets:write`) and use a **dependency factory** `require_scope('vuln:write')` on each route — 401 if not authenticated, 403 if authenticated but the scope is missing. For role-based access I map roles→scopes at login. In VMS, triagers get `vuln:write` but only admins get `vuln:admin` for bulk-dismissing criticals. FastAPI also has `Security(...)` with `SecurityScopes` for OAuth2 scope declarations that show up in Swagger." (factory code in §9.)

**⭐ Refresh tokens — why, and how?**

> "Access tokens are short-lived (10–15 min) so a leaked one expires fast. The **refresh token** is long-lived, stored server-side (or rotated), and exchanged at `/token/refresh` for a new access token without re-login. I **rotate** refresh tokens on use and keep a revocation list, so stealing one isn't a permanent backdoor. Logout = revoke the refresh token."

**⭐ Where do you store tokens on the client? (security question)**

> "**httpOnly, Secure, SameSite cookie** over `localStorage`. localStorage is readable by any JS, so an XSS steals the token. An httpOnly cookie isn't reachable from JS, which kills token theft via XSS — the trade-off is you must defend **CSRF** (SameSite=strict/lax + CSRF token for state-changing requests). For a pure SPA hitting an API on another domain, some teams keep the access token in memory (not persisted) and the refresh token in an httpOnly cookie — best of both. I avoid localStorage for anything sensitive."

**API keys (service-to-service / DS team).**
> "For the data-science team's batch jobs calling TARA, a long-lived **API key** in a header (`X-API-Key`) is simpler than full OAuth. I store a **hash** of the key, scope it, rate-limit per key, and support rotation. A dependency validates and resolves the key to a principal — same pattern as JWT, different credential."

```python
from fastapi.security import APIKeyHeader
api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(key: str = Depends(api_key_header), db=Depends(get_db)):
    principal = await repo.lookup_key(db, hash_key(key))
    if not principal:
        raise HTTPException(401, "invalid API key")
    return principal
```

---

<a name="12-validation-errors"></a>
## 12. Validation & Errors

**⭐ How does FastAPI handle validation errors?**

> "Pydantic validates the request against the model; if it fails, FastAPI returns **422 Unprocessable Entity** with a structured body listing each failing field, its location (`body`/`query`/`path`), and the message. I don't write that logic — it's automatic from the type hints. For business-rule failures past schema validation (e.g., 'secret path already exists'), I raise `HTTPException` or my own `AppError` with the right status."

**Default 422 shape:**
```json
{
  "detail": [
    {"loc": ["body", "cvss"], "msg": "Input should be less than or equal to 10", "type": "less_than_equal"}
  ]
}
```

**⭐ Consistent error shape across the API — why and what?**

> "Clients shouldn't have to parse three different error formats. I standardize on one envelope — a stable machine-readable `code`, a human `message`, optional `details`, and a `request_id` for support — and register exception handlers so *every* error (validation, auth, 404, 500) comes out in that shape. I'm aware of **RFC 7807 `application/problem+json`** (`type`, `title`, `status`, `detail`, `instance`) and will adopt it for public APIs; for internal ones I use my own envelope but keep it consistent."

```json
{ "error": { "code": "secret_exists", "message": "A secret already exists at this path",
             "request_id": "req_abc123" } }
```

**Never leak internals.** "5xx responses are generic ('internal error') with a `request_id`; the stack trace goes to logs, never to the client — especially in Secret Vault where an error must not reveal whether a path exists."

---

<a name="13-data-layer"></a>
## 13. Data Layer — SQLAlchemy, Sessions, Transactions, N+1, Alembic

**⭐ How do you manage DB sessions in FastAPI?**

> "**One session per request**, provided by a `yield` dependency. FastAPI opens it before the handler, the handler uses it, and the dependency closes it afterward — even on error. I never share a session across requests (they're not concurrency-safe) and I never create one at module import. With async SQLAlchemy the session comes from an `async_sessionmaker` bound to an async engine." (code in §9 `get_db`.)

**Transactions.**
> "I wrap a unit of work in a transaction — with SQLAlchemy I either use `async with session.begin():` (commit on success, rollback on exception) or commit/rollback explicitly. For the Secret Vault write-plus-audit-log, both rows must commit together or neither, so they share one transaction."

```python
async def store_secret(db, body, user):
    async with db.begin():                  # atomic: secret + audit row
        secret = Secret(path=body.path, value=encrypt(body.value), owner=user.id)
        db.add(secret)
        db.add(AuditLog(action="create", path=body.path, actor=user.id))
    return {"path": body.path}               # commits here; rolls back on error
```

**⭐ What's the N+1 problem and how do you avoid it?**

> "N+1 is when you load N parent rows, then lazily fire one extra query per parent to load a relationship — 1 + N queries instead of 1 or 2. In VMS, listing vulnerabilities and then touching `vuln.asset` per row would hammer the DB. The fix is **eager loading**: `selectinload`/`joinedload` so SQLAlchemy fetches the related rows in one extra query (or a join). I watch query logs / use `echo=True` in dev to catch it, and I keep response models from triggering surprise lazy loads."

```python
from sqlalchemy.orm import selectinload
stmt = select(Vuln).options(selectinload(Vuln.asset)).limit(50)
```

**Alembic migrations.**
> "Schema changes go through **Alembic** — autogenerate a revision from the model diff, review it, run `alembic upgrade head` in CI/CD. Every change is versioned and reversible (`downgrade`), so the DB schema is reproducible across dev/stage/prod. I never edit tables by hand in prod."

**Connection pooling.** "The async engine pools connections (`pool_size`, `max_overflow`). I size the pool against DB max connections × number of uvicorn workers so I don't exhaust the database."

---

<a name="14-performance"></a>
## 14. Performance & Robustness

**⭐ ASGI vs WSGI — and why FastAPI is fast.**

> "**WSGI** (Flask, Django classic) is a synchronous interface — one request per worker thread/process, blocking I/O. **ASGI** (FastAPI/Starlette) is asynchronous — a single worker handles many concurrent requests via an event loop, awaiting I/O instead of blocking. For I/O-bound APIs — DB, HTTP to the LLM, Redis — ASGI gives far higher concurrency per box. FastAPI's speed also comes from Starlette + Pydantic-v2's Rust core for validation/serialization."

**⭐ FastAPI vs Flask vs Django/DRF.**

| | FastAPI | Flask | Django + DRF |
|---|---|---|---|
| Model | ASGI async | WSGI sync (async-ish add-ons) | WSGI (ASGI partial) |
| Validation/docs | Pydantic + auto OpenAPI | manual (extensions) | DRF serializers; docs via add-ons |
| Speed (I/O-bound) | high | moderate | moderate |
| Batteries | minimal, composable | minimal | full (ORM, admin, auth) |
| Best for | async APIs, ML serving, microservices | small apps, flexibility | big apps needing ORM+admin |

> "In VMS we actually used **both**: DRF for the mature CRUD/admin/ORM-heavy parts, and FastAPI for the high-throughput async endpoints — CVE triage APIs and anything calling external services. For TARA and Secret Vault, greenfield async services, FastAPI was the obvious pick."

**Servers — uvicorn/gunicorn workers.**
> "In prod I run **gunicorn with uvicorn workers** (`-k uvicorn.workers.UvicornWorker`), worker count roughly `2×cores+1` for I/O-bound (tune by load test). Gunicorn handles process management/restarts; uvicorn runs the ASGI event loop in each worker. Behind that: nginx/ALB for TLS, buffering, and load balancing. I set sane **timeouts** so a hung LLM call doesn't pin a worker forever."

**⭐ Rate limiting.**
> "Protect against abuse and protect the expensive LLM backend. I rate-limit per API key/user/IP — token-bucket in **Redis** (shared across workers), or `slowapi`, or at the API gateway. Over the limit → **429** with `Retry-After`. For TARA I'd cap LLM calls per user per minute because each call costs money and GPU time."

**⭐ Caching — ETag and Redis.**
> "Two layers. **HTTP caching with ETag**: I hash the resource into an `ETag`; the client sends `If-None-Match`, and if it matches I return **304 Not Modified** with no body — saves bandwidth and DB work for read-heavy GETs. **Application caching with Redis**: cache expensive computed responses or, in TARA, cache retrieval results / embeddings and even full answers for repeated identical queries, with a TTL. I'm careful to invalidate on writes."

```python
import hashlib
from fastapi import Response, Request

@app.get("/api/v1/vulnerabilities/{id}")
async def get_vuln(id: int, request: Request, response: Response, db=Depends(get_db)):
    vuln = await repo.get(db, id)
    etag = hashlib.md5(f"{vuln.id}:{vuln.updated_at}".encode()).hexdigest()
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304)
    response.headers["ETag"] = etag
    return VulnOut.model_validate(vuln)
```

**Timeouts, retries, circuit breakers (awareness).**
> "Every outbound call (LLM, DS service, DB) gets a **timeout** — never unbounded. **Retries** only on idempotent calls, with exponential backoff + jitter, capped. A **circuit breaker** trips after repeated failures so I stop hammering a dead upstream and fail fast (return 503) instead of piling up timeouts — protects the whole service from cascading failure when the model backend is down."

**gzip, request limits.** "gzip large JSON responses. Enforce a **max body size** and reasonable field/array limits in Pydantic so a client can't send a 1GB payload or a million-element list and OOM the worker."

---

<a name="15-testing"></a>
## 15. Testing

**⭐ How do you test a FastAPI app?**

> "FastAPI ships `TestClient` (built on `httpx`/`requests`) for sync tests, and I use **`httpx.AsyncClient` with `ASGITransport`** for async endpoints. The killer feature is **dependency overrides** — I swap `get_db` for a test-DB session and `current_user` for a fake user via `app.dependency_overrides`, so I test handlers in isolation without standing up real auth or hitting the prod DB. I run it all under **pytest**, with a transactional test DB that rolls back per test."

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.deps import get_db, current_user

@pytest.fixture
def client():
    app.dependency_overrides[get_db] = lambda: test_session()
    app.dependency_overrides[current_user] = lambda: FakeUser(scopes=["vuln:write"])
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")

@pytest.mark.asyncio
async def test_patch_vuln(client):
    async with client as c:
        r = await c.patch("/api/v1/vulnerabilities/1", json={"status": "accepted_risk"})
    assert r.status_code == 200
    assert r.json()["status"] == "accepted_risk"

@pytest.mark.asyncio
async def test_forbidden_without_scope(client):
    app.dependency_overrides[current_user] = lambda: FakeUser(scopes=["vuln:read"])
    async with client as c:
        r = await c.delete("/api/v1/secrets/foo")
    assert r.status_code == 403
```

> "I test the contract (status codes, response shape via the Pydantic schema), the auth boundaries (401/403), validation (422 on bad input), and a few integration paths. For the ML calls I **mock** the model/LLM so tests are fast and deterministic — I assert the wiring, not the model output."

---

<a name="16-ml-integration"></a>
## 16. ⭐ Integrating ML / Data-Science Output (the JD's core)

**⭐ The JD says 'integrate algorithmic output from the data-science team via backend REST APIs.' How do you do that well?**

> "I treat the model or pipeline as a dependency behind a clean REST contract, so the DS team and the frontend never couple to each other. The pattern:
> 1. **Stable schema** — define `PredictionIn`/`PredictionOut` Pydantic models; the DS team's notebook output gets normalized into that contract, so I can swap models without changing the API.
> 2. **Load once** — load the model/index at startup via lifespan, not per request.
> 3. **Sync vs async by latency** — fast inference (ms) → synchronous request/response, 200. Slow/heavy → **202 + polling or a callback**.
> 4. **Don't block the loop** — async I/O for LLM/HTTP; threadpool/process pool for blocking CPU inference.
> 5. **Stream when generative** — TARA streams tokens via `StreamingResponse`.
> 6. **Batch** where it helps throughput.
> 7. **Guardrails** — input validation, timeouts, rate limits, and cost controls around the model.
> That's exactly the TARA story: a FastAPI layer wrapping a RAG pipeline, exposing grounded, streamed answers behind a versioned REST API the rest of the org consumes."

**⭐ Sync vs async inference — how do you choose?**

> "Latency budget. If inference returns within the request budget (say <1–2s) and the client can wait, do it **synchronously** — simplest, returns 200 with the prediction. If it's seconds-to-minutes (large batch scoring, a long RAG over many docs, a fine-tune), do it **asynchronously**: accept the job (**202**), return a `job_id` + status URL, run it on a **task queue** (Celery/Arq/RQ), and let the client **poll** `GET /jobs/{id}` or receive a **webhook/SSE** when done. Holding an HTTP connection open for minutes is fragile — proxies and load balancers kill it."

**⭐ "How do you handle a slow ML call in a request?" (named follow-up)**

> "Three tiers by duration. **Short** (sub-second–~2s): synchronous `async def`, await the model, return 200; set a timeout so a hung call returns 504. **Medium** (a few seconds, must feel live): **stream** partial results via SSE so the user sees progress immediately — TARA's token streaming. **Long** (minutes/batch): **202 + job pattern** — enqueue to a worker, return a job id, poll or webhook. The anti-pattern is blocking a worker for 60s on a synchronous request — it kills concurrency and hits proxy timeouts. And whatever the tier, the blocking work goes to a threadpool/queue so the event loop stays free."

**Long-running job pattern (202 + polling):**
```python
from fastapi import status

@app.post("/api/v1/predictions/batch", status_code=status.HTTP_202_ACCEPTED)
async def submit_batch(body: BatchIn, response: Response):
    job_id = enqueue(score_batch, body)        # hand to task queue
    response.headers["Location"] = f"/api/v1/jobs/{job_id}"
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/v1/jobs/{job_id}")
async def job_status(job_id: str):
    job = await get_job(job_id)
    # status: queued | running | succeeded | failed
    return {"job_id": job_id, "status": job.status,
            "result_url": job.result_url if job.status == "succeeded" else None}
```

**Prediction schema (so the contract is explicit):**
```python
class PredictionIn(BaseModel):
    features: dict[str, float]
    model_version: str | None = None     # let caller pin a model

class PredictionOut(BaseModel):
    label: str
    score: float = Field(ge=0, le=1)
    model_version: str                    # always echo which model answered
    explanation: list[str] | None = None
```

**Batching.** "If the model is much faster per-item in batches (GPU), I accept individual requests but **micro-batch** them server-side (a small queue + window), or expose a batch endpoint. I always return `model_version` so results are reproducible and the DS team can A/B versions."

---

<a name="17-followups"></a>
## 17. Likely Follow-ups (rapid)

**⭐ "PUT vs PATCH again, one line."**
> PUT = full replace, idempotent. PATCH = partial update, not necessarily idempotent.

**⭐ "Version without breaking clients?"**
> Additive changes in place; breaking changes get a new `/v2`; keep `/v1` alive with `Deprecation`/`Sunset` headers and migration metrics. Pin output with response models.

**⭐ "Idempotent POST?"**
> `Idempotency-Key` header; store key→response; replay on retry.

**⭐ "Slow ML call in a request?"**
> Short → sync 200 (+ timeout/504). Medium → SSE stream. Long → 202 + job + poll/webhook. Always off the event loop.

**⭐ "Paginate 1M rows?"**
> Keyset/cursor on an indexed sort key; never deep OFFSET; enforce a max page size.

**"async def vs def?"**
> async for async I/O; def (threadpooled) for blocking; never block inside async.

**"401 vs 403?"**
> 401 = not authenticated; 403 = authenticated, not authorized.

**"400 vs 422?"**
> 400 = malformed/unparseable; 422 = parses but fails validation (FastAPI default).

**"Where to store the JWT client-side?"**
> httpOnly Secure SameSite cookie (defend CSRF), not localStorage (XSS-exposed).

**"How do you secure an endpoint?"**
> `Depends(current_user)` for authn + `Depends(require_scope(...))` for authz; deny by default.

**"Stateless but TARA has conversations?"**
> Conversation state lives in a store keyed by `session_id` the client sends; the process holds nothing between requests.

**"How do you document the API?"**
> Auto OpenAPI → /docs (Swagger) + /redoc; enrich with tags, summaries, `response_model`, `responses`.

---

<a name="18-cheatsheet"></a>
## 18. Rapid-fire Cheat Sheet

**HTTP verbs:** GET (safe, idempotent) · POST (neither) · PUT (idempotent replace) · PATCH (partial, not idempotent) · DELETE (idempotent).

**Status codes:** 200 OK · 201 Created (+Location) · 202 Accepted (async) · 204 No Content · 304 Not Modified · 400 malformed · 401 unauthenticated · 403 unauthorized · 404 not found · 409 conflict · 415 wrong type · 422 validation · 429 rate limit (+Retry-After) · 500 our bug · 503/504 upstream down/timeout.

**URI:** plural nouns, kebab-case, no verbs, ≤2 levels nesting, filters in query string.

**Versioning:** prefer `/api/v1`; never break old versions; deprecate with headers.

**Pagination:** offset = simple but slow/unstable deep; cursor/keyset = fast & stable for big data.

**Pydantic:** separate In/Out/Patch models · `response_model` filters output · `from_attributes` for ORM · `field_validator`/`model_validator` · v2: `model_dump()`.

**DI:** `Depends` for DB session (yield), auth, pagination; override in tests.

**Async:** `async def` for async I/O; `def`→threadpool for blocking; `anyio.to_thread.run_sync` for blocking-in-async; CPU → process pool/queue.

**FastAPI features:** lifespan (load model once) · APIRouter modularization · middleware (request-id, gzip, CORS) · exception handlers (consistent errors) · BackgroundTasks (light) vs task queue (heavy) · StreamingResponse + SSE (TARA tokens).

**Auth:** OAuth2 password → JWT bearer · `OAuth2PasswordBearer` · scopes via `require_scope` factory · short access + rotating refresh · API keys for services · httpOnly cookie storage.

**Data:** session per request · transactions (`session.begin()`) · avoid N+1 with `selectinload`/`joinedload` · Alembic migrations · pool sizing.

**Perf:** ASGI > WSGI for I/O · gunicorn+uvicorn workers · rate limit (429) · ETag/304 + Redis cache · timeouts + backoff retries + circuit breaker · gzip · body-size limits.

**Testing:** TestClient / httpx AsyncClient · `dependency_overrides` for DB & user · mock the model · pytest with rollback DB.

**ML integration:** stable prediction schema · load once · sync<2s / SSE for live / 202+job for long · batch · echo `model_version` · guardrails.

---

<a name="19-traps"></a>
## 19. Traps & Gotchas

1. **Blocking inside `async def`** — `requests.get`, `time.sleep`, heavy CPU, a sync DB driver freeze the whole event loop. Use async clients or threadpool/queue.
2. **Using the input model as the output model** — leaks secrets/hashes/internal fields. Always a separate `XOut` + `response_model`.
3. **Mutable default arguments / shared model instances** — Pydantic field defaults that are mutable, or a global DB session, cause cross-request bleakage. Sessions are per-request via `Depends`.
4. **`allow_origins=['*']` with `allow_credentials=True`** — browsers reject it and it's insecure. List exact origins.
5. **Deep OFFSET pagination** — silently O(n) and unstable. Use keyset for large data.
6. **Unbounded list endpoints** — no max `limit` → a client pulls a million rows and OOMs the worker. Enforce a cap.
7. **401 vs 403 mix-up** — auth vs authz; getting it wrong confuses clients and leaks info.
8. **422 vs 400 confusion** — know that FastAPI defaults Pydantic failures to 422.
9. **Returning 500 for known upstream timeouts** — use 503/504; 500 should mean an unhandled bug.
10. **No timeout on the LLM/DS call** — a hung upstream pins workers; always bound it + circuit-break.
11. **Holding the HTTP connection open for a minutes-long ML job** — proxies/LBs kill it. Use 202 + polling/webhook.
12. **JWT in localStorage** — XSS steals it. httpOnly cookie + CSRF defense.
13. **No token expiry / no refresh rotation** — a leaked long-lived token is a permanent backdoor.
14. **Forgetting idempotency on creating POSTs** — network retries double-create payments/secrets. Idempotency-Key.
15. **N+1 queries from lazy relationships** — eager-load; watch query logs.
16. **Leaking stack traces / resource existence in errors** — generic 5xx + request_id; in Secret Vault prefer 404 over 403 to hide existence.
17. **Loading the model per request** — load once at startup (lifespan).
18. **Breaking changes without a new version** — renaming/removing fields silently breaks clients; version it.
19. **Verbs in URLs** (`/getVulnerability`) — the HTTP method *is* the verb.
20. **Sorting/filtering on raw client-supplied column names** — allow-list to prevent injection and unindexed scans.
21. **Not setting `WWW-Authenticate` on 401** — clients expect it on auth failures.
22. **Pydantic v1↔v2 mismatch** — `orm_mode`→`from_attributes`, `@validator`→`@field_validator`, `.dict()`→`.model_dump()`.

---

*End of file. Practice saying the ⭐ answers out loud; have the TARA streaming, VMS RBAC/bulk, and Secret Vault scoped-token stories ready as concrete examples for any abstract question.*
