# OOP, LLD & System Design — Deep Interview Study File

**Candidate:** Saiganesh — FullStack (React + Python/FastAPI, Azure/AWS) — Fractal Analytics
**Rounds covered:** Tech Round 1 (OOP/REST + coding), Tech Round 2 (LLD: API design + React), senior expectations.
**Flagship projects used as worked examples:**
- **VMS** — Vulnerability Management System (NVD CVE sync, CPE↔CVE many-to-many, dashboard, RBAC, Jira integration).
- **TARA Copilot** — on-prem RAG assistant (FastAPI, LLaMA/Ollama, pgvector).
- **Secret Vault** — secrets manager.

> ⭐ = very likely to be asked. Each item has: the concept, **"how to say it out loud"**, follow-ups, and trade-offs. Numbers you must verify are marked `[fill in: ...]`.

---

# PART 1 — OOP & DESIGN PRINCIPLES

## ⭐ The 4 Pillars of OOP

### Q1. ⭐ What is Encapsulation?

**Definition:** Bundling data (state) and the methods that operate on it into one unit, and hiding internal state behind a controlled interface so callers can't put the object into an invalid state.

**Python example:**
```python
class SecretVersion:
    def __init__(self, ciphertext: bytes):
        self.__ciphertext = ciphertext      # name-mangled => "private"
        self._created_at = utcnow()         # convention "protected"

    @property
    def is_active(self) -> bool:
        return self._revoked_at is None

    def reveal(self, key) -> str:           # controlled access
        return decrypt(self.__ciphertext, key)
```
Python has no true `private`; we signal intent with `_single` (protected by convention) and `__double` (name-mangled). Encapsulation is about *the interface*, not language enforcement.

**Real-project tie-in (Secret Vault):** the raw ciphertext is never exposed as an attribute. The only way to get the plaintext is `reveal(key)`, which forces the audit log to be written and the decrypt key to be present. You cannot accidentally serialize a plaintext secret because it isn't stored as one.

**How to say it out loud:** "Encapsulation means I hide the ciphertext behind a `reveal()` method so the only path to plaintext also writes an audit entry — callers can't reach around the invariant."

**Follow-up — "Does Python actually enforce private?"** No. `__x` is name-mangled to `_ClassName__x`, which discourages but doesn't prevent access. Real enforcement is social + tooling (linters), not the runtime.

---

### Q2. ⭐ What is Abstraction?

**Definition:** Exposing *what* an object does while hiding *how*. You program against a simplified, stable interface and the messy implementation stays behind it.

**Python example (ABC):**
```python
from abc import ABC, abstractmethod

class Embedder(ABC):
    @abstractmethod
    def embed(self, text: str) -> list[float]: ...

class OllamaEmbedder(Embedder):
    def embed(self, text): return ollama_call(text)

class FakeEmbedder(Embedder):           # for tests
    def embed(self, text): return [0.0] * 768
```

**Real-project tie-in (TARA):** the RAG pipeline depends on the `Embedder` *abstraction*, not on Ollama. Swapping to a different model, or a stub in unit tests, is a one-line change.

**Encapsulation vs abstraction (the trap):** Encapsulation hides *data/state* (the ciphertext bytes). Abstraction hides *complexity/behavior* (you call `embed()` without knowing it's an HTTP call to Ollama). They overlap but answer different questions — "hide the data" vs "hide the implementation."

---

### Q3. ⭐ What is Inheritance?

**Definition:** A class (subclass) derives state and behavior from another (superclass), modeling an "is-a" relationship and enabling reuse.

**Python example:**
```python
class Vulnerability:
    def severity_label(self): ...

class CvssV3Vulnerability(Vulnerability):
    def severity_label(self):
        # uses base_score 0–10 bands
        ...
```

**Real-project tie-in (VMS):** different CVSS versions (v2 vs v3.1) share a base `Vulnerability` but compute severity differently. But — see Q9, we often prefer composition here.

**The danger — fragile base class / deep hierarchies:** changing a base class can silently break far-away subclasses. Liskov violations creep in (a subclass that can't honor the base contract). Keep hierarchies shallow.

**How to say it out loud:** "Inheritance is for genuine is-a + shared contract. The moment I'm inheriting just to reuse code, I switch to composition."

---

### Q4. ⭐ What is Polymorphism?

**Definition:** One interface, many implementations — the *same call* dispatches to different behavior based on the actual object.

**Types:**
- **Subtype (runtime) polymorphism:** `embedder.embed(x)` works for any `Embedder` subclass.
- **Ad-hoc / duck typing:** Python doesn't care about the class, only that the method exists. "If it quacks like a duck…"
- **Parametric (generics):** `list[T]`, generic containers.
- **Overloading:** Python doesn't have true method overloading (last def wins); we use default args / `functools.singledispatch`.

**Python example:**
```python
def sync(source: CveSource):       # works for NVDSource, FileSource, MockSource
    for batch in source.fetch():
        upsert(batch)
```

**Real-project tie-in (VMS):** the sync job takes a `CveSource`. In prod it's `NVDSource` (paged HTTP); in tests it's `FixtureSource` (reads JSON files). Same loop, different source — that's polymorphism doing the heavy lifting.

**Follow-up — "polymorphism vs overriding?"** Overriding is the mechanism (subclass redefines a method); polymorphism is the *effect* (calling through the base picks the right override at runtime).

---

## ⭐ SOLID Principles

> Memory hook: **S**ingle responsibility, **O**pen/closed, **L**iskov, **I**nterface segregation, **D**ependency inversion.

### Q5. ⭐ S — Single Responsibility Principle (SRP)

**One-liner:** A class should have one reason to change.

**Smell it fixes:** "God class" / a service that parses CVEs *and* talks to the DB *and* renders the dashboard *and* calls Jira.

**Tiny example:**
```python
# BAD: one class does fetch + parse + persist + notify
# GOOD: split responsibilities
class CveFetcher: ...      # I/O with NVD
class CveParser: ...       # JSON -> domain objects
class CveRepository: ...   # persistence
class JiraNotifier: ...    # integration
```
**VMS tie-in:** the sync flow is `Fetcher → Parser → Repository`, each independently testable and swappable. When NVD changed its API shape, only `Fetcher`/`Parser` changed.

**Trap:** SRP isn't "one method per class." It's one *axis of change* / one *actor* who would request changes.

---

### Q6. ⭐ O — Open/Closed Principle (OCP)

**One-liner:** Open for extension, closed for modification — add behavior without editing existing, tested code.

**Smell it fixes:** a growing `if source == "nvd": ... elif source == "github": ...` chain you edit every time a new source appears.

**Tiny example:** define `CveSource` ABC; add `GithubAdvisorySource` as a *new* class. The sync loop never changes.

**TARA tie-in:** adding a new embedder or a new LLM backend means writing a new `Embedder`/`LLMClient` class and registering it — the orchestration code is untouched.

**Trade-off:** Don't pre-abstract everything (YAGNI). Apply OCP at the seams where change is *likely* (data sources, payment providers, backends), not everywhere.

---

### Q7. ⭐ L — Liskov Substitution Principle (LSP)

**One-liner:** Subtypes must be usable anywhere the base type is, without surprising the caller.

**Smell it fixes:** a `ReadOnlySecretStore(SecretStore)` that overrides `write()` to throw — now callers holding a `SecretStore` break.

**Classic violation:** `Square(Rectangle)` where setting width also mutates height breaks code that assumed they're independent.

**Rule of thumb:** subclasses may *weaken preconditions* and *strengthen postconditions*, never the reverse. Don't throw new exceptions the base didn't, don't narrow the accepted inputs.

**Vault tie-in:** every `VaultBackend` (local, Azure Key Vault) must honor `get/set/delete` the same way. If Azure backend can't delete, it must not pretend to be a full `VaultBackend` — model it as a narrower interface instead.

---

### Q8. ⭐ I — Interface Segregation Principle (ISP)

**One-liner:** Many small, focused interfaces beat one fat one; don't force clients to depend on methods they don't use.

**Smell it fixes:** a `Repository` with 30 methods where the read path is forced to import write/delete it never calls.

**Tiny example:**
```python
class Readable(Protocol):
    def get(self, id): ...
class Writable(Protocol):
    def put(self, obj): ...
# A read-only dashboard service depends only on Readable.
```
**VMS tie-in:** the triage dashboard depends on a read-only `CveQuery` interface; the sync worker depends on a `CveWriter`. Neither carries the other's surface area.

---

### Q9. ⭐ D — Dependency Inversion Principle (DIP)

**One-liner:** High-level modules depend on abstractions, not concretions; details depend on abstractions too.

**Smell it fixes:** business logic that `import requests` and hard-codes the NVD URL — untestable, unswappable.

**Tiny example:**
```python
class SyncService:
    def __init__(self, source: CveSource, repo: CveRepository):
        self.source, self.repo = source, repo   # injected abstractions
```
**TARA tie-in:** the RAG service receives `Embedder`, `VectorStore`, `LLMClient` via constructor injection. In tests I pass fakes; in prod, real ones. The service never news-up a concrete dependency.

**DIP vs DI:** DIP is the *principle* (depend on abstractions). Dependency Injection is one *technique* to achieve it (pass dependencies in). See Q19.

---

## Other Core Principles

### Q10. ⭐ Composition vs Inheritance — "favor composition"

**Inheritance** = "is-a", tight coupling to a base, compile/import-time. **Composition** = "has-a", assemble behavior from parts, swap at runtime.

**Why favor composition:**
- No fragile base class; changes don't ripple down a hierarchy.
- Multiple behaviors mix freely (no diamond problem).
- Easier to test (inject a part), easier to change at runtime.

**Example — Strategy via composition:**
```python
class RagPipeline:
    def __init__(self, embedder: Embedder, reranker: Reranker):
        self.embedder = embedder     # has-a, not is-a
        self.reranker = reranker
```
**Say it:** "I reach for inheritance only when there's a true is-a *and* a shared contract I won't violate (LSP). Otherwise I compose — it keeps coupling low and lets me swap parts at runtime, like switching the reranker in TARA."

**When inheritance is right:** framework hooks (`class MyModel(BaseModel)`), exceptions (`class VaultError(Exception)`), small stable hierarchies.

---

### Q11. Coupling vs Cohesion

- **Coupling** = how much modules depend on each other. **Low coupling** is the goal (change one without touching others).
- **Cohesion** = how related the responsibilities inside a module are. **High cohesion** is the goal (a module does one thing well).

**Target: low coupling, high cohesion.** SRP drives cohesion; DIP/interfaces drive low coupling.

**Say it:** "VMS sync is highly cohesive — fetch/parse/persist each focused — and loosely coupled via the `CveSource` interface, so swapping NVD for a mirror didn't touch persistence."

---

### Q12. DRY, KISS, YAGNI

- **DRY** (Don't Repeat Yourself): every piece of knowledge has one authoritative source. *Trap:* don't over-DRY — two things that look alike but change for different reasons should stay separate (false sharing creates coupling).
- **KISS** (Keep It Simple): the simplest thing that works; complexity must earn its place.
- **YAGNI** (You Aren't Gonna Need It): don't build for imagined future requirements. Build the seam (OCP) but not the speculative implementation.

**Say it:** "I balance DRY against coupling — I'd rather duplicate a 3-line validation than couple two domains that evolve independently."

---

### Q13. Law of Demeter ("don't talk to strangers")

A method should only call methods of: itself, its parameters, objects it creates, and its direct fields. Avoid `a.getB().getC().doThing()` — that's a *train wreck* and couples you to the whole chain.

**Fix:** add a method on `a` that does the work (`a.doThing()`), hiding the internal structure (Tell-Don't-Ask).

---

# PART 2 — DESIGN PATTERNS

> For each: when to use, short Python example, real-project tie-in.

### Q14. ⭐ Singleton

**What:** exactly one instance, globally accessible.
**When:** a single shared resource — config, a connection pool, a logger.
**Python idiom:** a module is already a singleton. Or:
```python
class Settings:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```
Better in FastAPI: use `@lru_cache` on a provider:
```python
@lru_cache
def get_settings() -> Settings: return Settings()
```
**Tie-in:** the Vault's KMS/encryption client and the DB engine are singletons (expensive to create, safe to share).
**Trade-offs:** global state = hidden coupling + hard to test + thread-safety concerns. Prefer DI of a single instance over a hard Singleton.

---

### Q15. ⭐ Factory / Abstract Factory

**Factory Method:** a function/method decides *which* concrete class to instantiate.
**Abstract Factory:** an object that creates *families* of related objects.

**When:** object creation depends on config/runtime input and you want callers decoupled from concrete classes.

```python
def make_backend(kind: str) -> VaultBackend:
    return {
        "local": LocalBackend,
        "azure": AzureKeyVaultBackend,
        "aws":   AwsSecretsManagerBackend,
    }[kind]()
```
**Tie-in (Vault):** `make_backend(settings.backend)` picks the storage backend at startup. Adding AWS = add one class + one map entry (OCP).
**Tie-in (TARA):** `make_embedder(model_name)` returns the right `Embedder`.
**Trade-off:** indirection. Don't add a factory until there are ≥2 implementations.

---

### Q16. ⭐ Strategy

**What:** encapsulate interchangeable algorithms behind a common interface; pick one at runtime.
**When:** multiple ways to do the same thing (rank, embed, rate-limit, score).

```python
class Reranker(Protocol):
    def rerank(self, q, docs): ...

class CrossEncoderReranker: ...
class NoopReranker: ...

pipeline = RagPipeline(reranker=CrossEncoderReranker())
```
**Tie-in (TARA):** pluggable embedders/rerankers; the retrieval strategy (dense vs hybrid) is a Strategy.
**Strategy vs Factory:** Factory *creates*; Strategy *uses*. Often combined — a Factory builds the Strategy.

---

### Q17. ⭐ Observer (Pub/Sub)

**What:** subjects notify subscribers of events without knowing who they are.
**When:** one event, many reactions; decoupling producers from consumers.

```python
class EventBus:
    def __init__(self): self._subs = defaultdict(list)
    def subscribe(self, evt, fn): self._subs[evt].append(fn)
    def publish(self, evt, payload):
        for fn in self._subs[evt]: fn(payload)
```
**Tie-in (VMS):** when a new *critical* CVE matches an asset's CPE, observers fire: create a Jira ticket, send a Slack alert, bump the dashboard counter. The matcher doesn't know about Jira.
**At scale:** this becomes a real message queue / event stream (Kafka, Service Bus) — Observer is the in-process version of the same idea.

---

### Q18. ⭐ Decorator

**What:** wrap an object to add behavior without changing it; same interface in/out.
**When:** cross-cutting concerns — logging, caching, retry, auth — layered on.

```python
class CachingEmbedder(Embedder):
    def __init__(self, inner: Embedder, cache): self.inner, self.cache = inner, cache
    def embed(self, text):
        if text in self.cache: return self.cache[text]
        v = self.inner.embed(text); self.cache[text] = v; return v
```
**Python language decorators** (`@retry`, `@audit`) are the function-level form.
**Tie-in (Vault):** `@audit_log` decorator wraps every `reveal()` so every secret access is recorded — encapsulation + cross-cutting in one.
**Decorator vs inheritance:** decorator composes at runtime and stacks (`Caching(Retrying(Real()))`); subclassing is static and combinatorially explodes.

---

### Q19. ⭐ Adapter

**What:** convert one interface into another a client expects (a wrapper for incompatible APIs).
**When:** integrating a third-party SDK whose shape doesn't match your domain.

```python
class JiraAdapter(TicketSink):           # our interface
    def __init__(self, jira_sdk): self._jira = jira_sdk
    def create_ticket(self, t: Ticket):  # translate domain -> SDK
        return self._jira.issues.create(fields=to_jira_fields(t))
```
**Tie-in (VMS):** the Jira SDK is wrapped behind our `TicketSink` interface. If we later add ServiceNow, we write `ServiceNowAdapter` and the triage code is unchanged.
**Adapter vs Facade:** Adapter makes incompatible things compatible (interface translation); Facade simplifies a complex subsystem (see Q23).

---

### Q20. ⭐ Repository

**What:** abstract the data layer behind a collection-like interface; domain code never sees SQL.
**When:** you want persistence-agnostic domain logic, testability, and a single place for queries.

```python
class CveRepository(Protocol):
    def get(self, cve_id: str) -> Cve | None: ...
    def upsert_many(self, cves: list[Cve]) -> None: ...
    def search(self, filt: CveFilter) -> Page[Cve]: ...

class SqlCveRepository(CveRepository):
    def __init__(self, session): self.session = session
    ...
class InMemoryCveRepository(CveRepository):   # tests
    ...
```
**Tie-in (VMS):** the whole data layer is repositories. Service logic depends on `CveRepository`/`AssetRepository` interfaces. Unit tests use in-memory repos; no DB needed.
**Trade-off:** can become an anemic pass-through over an ORM that's already a repository. Justify it by testability + query centralization, not dogma.

---

### Q21. ⭐ Dependency Injection (DI)

**What:** give an object its dependencies from outside instead of constructing them inside.
**Forms:** constructor injection (preferred), setter, parameter.

```python
# FastAPI does DI via Depends
def get_repo(session = Depends(get_session)) -> CveRepository:
    return SqlCveRepository(session)

@app.get("/cves/{id}")
def read(id: str, repo: CveRepository = Depends(get_repo)):
    return repo.get(id)
```
**Tie-in:** all three projects use FastAPI `Depends` for session/repo/auth injection. Testing an endpoint = override the dependency with a fake.
**Why it matters:** achieves DIP, makes everything testable, kills hidden global state.

---

### Q22. Builder

**What:** construct a complex object step by step; separate construction from representation.
**When:** many optional params, invalid intermediate states, or fluent config.

```python
q = (CveQueryBuilder()
     .severity("CRITICAL")
     .published_after("2026-01-01")
     .has_exploit()
     .page(1, size=50)
     .build())
```
**Tie-in (VMS):** building complex triage filters for the dashboard. Beats a constructor with 12 optional args.
**Python note:** often a keyword-args dataclass + validation is simpler than a full Builder — use Builder when there's real step-wise logic.

---

### Q23. Facade

**What:** a single simplified entry point over a complicated subsystem.
**When:** hide orchestration complexity behind one clean call.

```python
class RagService:                       # facade
    def answer(self, question, tenant):
        chunks = self.retriever.search(question, tenant)
        ctx = self.reranker.rerank(question, chunks)
        return self.llm.generate(question, ctx)
```
**Tie-in (TARA):** `RagService.answer()` is a facade over embed → retrieve → rerank → prompt → generate → cite. The API layer calls one method.

---

### Q24. Quick pattern catalog (rapid)

| Pattern | One line | Project tie-in |
|---|---|---|
| Singleton | one shared instance | Vault KMS client, DB engine |
| Factory | decouple creation | `make_backend`, `make_embedder` |
| Strategy | swap algorithms | pluggable rerankers (TARA) |
| Observer | fan-out events | new-CVE → Jira+Slack (VMS) |
| Decorator | wrap to add behavior | `@audit_log` on reveal (Vault) |
| Adapter | translate interfaces | Jira/ServiceNow adapters (VMS) |
| Repository | abstract data layer | all VMS persistence |
| DI | inject dependencies | FastAPI `Depends` everywhere |
| Builder | step-wise construction | triage query builder (VMS) |
| Facade | simplify subsystem | `RagService.answer()` (TARA) |

---

# PART 3 — LOW-LEVEL DESIGN (LLD) — Tech Round 2

## ⭐ Q25. How to approach ANY LLD problem (the script)

Say this framework out loud before coding:

1. **Clarify requirements & scope** — functional ("what must it do?") and constraints ("single machine? thread-safe? in-memory or persisted?"). Ask 2–3 sharp questions; don't assume.
2. **Identify the core entities/classes** — nouns become classes (Cve, Ticket, Secret, ParkingSpot).
3. **Define relationships** — has-a (composition), is-a (inheritance), many-to-many (association tables), cardinalities.
4. **Define interfaces/methods** — verbs become methods; design the public API first, hide internals.
5. **Pick data structures** — what gives the right complexity (hash map for O(1) lookup, doubly-linked list + map for LRU).
6. **Handle edge cases** — concurrency, full/empty, expiry, invalid input, idempotency.
7. **Talk trade-offs** — memory vs speed, simplicity vs extensibility, where you'd extend (apply OCP at the seams).

**Senior signal:** narrate the requirements/clarifications, name the patterns you're using (Strategy, Repository), and call out thread-safety and extensibility explicitly.

---

## ⭐ Q26. LLD — Design a Rate Limiter

**Clarify:** per-user or global? In-memory (single node) or distributed (Redis)? Which algorithm? Allowed burst?

**Algorithms (know all four):**
- **Fixed window:** count per fixed interval. Simple; suffers boundary bursts (2x at the edge).
- **Sliding window log:** store timestamps; exact but memory-heavy.
- **Sliding window counter:** weighted blend of current+previous window — good accuracy, cheap.
- **Token bucket:** tokens refill at rate R, capacity C; each request takes a token. Allows bursts up to C. **Most common.**
- **Leaky bucket:** processes at constant rate, smooths output.

**Token bucket skeleton:**
```python
import time

class TokenBucket:
    def __init__(self, capacity: int, refill_per_sec: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill = refill_per_sec
        self.last = time.monotonic()
        self._lock = threading.Lock()

    def allow(self, cost: int = 1) -> bool:
        with self._lock:
            now = time.monotonic()
            self.tokens = min(self.capacity,
                              self.tokens + (now - self.last) * self.refill)
            self.last = now
            if self.tokens >= cost:
                self.tokens -= cost
                return True
            return False

class RateLimiter:                       # per-key buckets
    def __init__(self, cap, rate):
        self.buckets = defaultdict(lambda: TokenBucket(cap, rate))
    def allow(self, key: str) -> bool:
        return self.buckets[key].allow()
```
**Distributed version:** move state to **Redis** — `INCR` + `EXPIRE` for fixed window, or a Lua script for atomic token bucket. Why Lua? to make read-modify-write atomic across nodes.
**Edge cases:** clock skew, the boundary-burst problem, memory growth (evict idle buckets), what to return (HTTP 429 + `Retry-After`).
**Trade-offs:** in-memory is fast but not shared across instances; Redis is shared but adds a network hop + a dependency.

---

## ⭐ Q27. LLD — Design a Parking Lot (the classic)

**Clarify:** multiple levels? vehicle sizes? pricing? entry/exit gates? find nearest spot?

**Entities:**
```python
from enum import Enum

class VehicleType(Enum): MOTORCYCLE=1; CAR=2; TRUCK=3
class SpotType(Enum):    SMALL=1; MEDIUM=2; LARGE=3

class Vehicle:
    def __init__(self, plate, vtype): self.plate, self.vtype = plate, vtype

class ParkingSpot:
    def __init__(self, id, stype):
        self.id, self.stype, self.vehicle = id, stype, None
    def is_free(self): return self.vehicle is None
    def can_fit(self, v: Vehicle) -> bool: ...   # size rules
    def park(self, v): self.vehicle = v
    def remove(self): self.vehicle = None

class Level:
    def __init__(self, floor, spots): self.floor, self.spots = floor, spots
    def find_spot(self, v) -> ParkingSpot | None:
        return next((s for s in self.spots if s.is_free() and s.can_fit(v)), None)

class Ticket:
    def __init__(self, vehicle, spot): 
        self.vehicle, self.spot = vehicle, spot
        self.entry = utcnow(); self.exit = None

class ParkingLot:
    def __init__(self, levels): self.levels = levels; self.active = {}
    def park(self, v: Vehicle) -> Ticket:
        for lvl in self.levels:
            spot = lvl.find_spot(v)
            if spot:
                spot.park(v); t = Ticket(v, spot)
                self.active[v.plate] = t; return t
        raise ParkingFullError()
    def unpark(self, plate) -> float:
        t = self.active.pop(plate)
        t.exit = utcnow(); t.spot.remove()
        return self.pricing.cost(t)        # Strategy for pricing
```
**Patterns shown:** Strategy (pricing), composition (Lot has-a Level has-a Spot), enums for types.
**Edge cases:** lot full, vehicle not found on exit, concurrent parking (lock the spot allocation), oversize vehicle taking multiple spots.
**Extensions to mention:** nearest-spot search (priority queue per level), reservations, EV charging spots (new SpotType), display board (Observer on free-count).

---

## ⭐ Q28. LLD — Design a URL Shortener (LLD level)

**Clarify:** custom aliases? expiry? analytics? how many URLs (sizing → key length)?

**Core:**
```python
import string
BASE62 = string.digits + string.ascii_letters

def encode(n: int) -> str:
    if n == 0: return "0"
    s = []
    while n: n, r = divmod(n, 62); s.append(BASE62[r])
    return "".join(reversed(s))

class UrlShortener:
    def __init__(self, repo: UrlRepository, id_gen):
        self.repo, self.id_gen = repo, id_gen
    def shorten(self, long_url, alias=None, ttl=None) -> str:
        if alias:
            if self.repo.exists(alias): raise AliasTaken()
            code = alias
        else:
            code = encode(self.id_gen.next())     # counter -> base62
        self.repo.save(Mapping(code, long_url, expires=ttl_to_ts(ttl)))
        return f"https://sho.rt/{code}"
    def resolve(self, code) -> str:
        m = self.repo.get(code)
        if not m or m.is_expired(): raise NotFound()
        return m.long_url
```
**Key generation strategies:**
- **Counter + base62** (shown): no collisions, but sequential/guessable → add a hash/offset or per-shard counters.
- **Hash (MD5/SHA) + truncate:** collision risk → check-and-retry.
- **Pre-generated key pool (KGS):** hand out unique keys, best for scale.
**Edge cases:** collisions, custom alias clashes, expiry, idempotency (same long URL → same short? a product decision).
**LLD↔HLD bridge:** at scale this needs a counter service / KGS, caching of hot codes, and a redirect path (301 vs 302 — 302 if you want to keep counting clicks). See Q39 for the full HLD.

---

## ⭐ Q29. LLD — Secret Vault core domain

**Clarify:** versioning? rotation? access policies? audit? encryption at rest (envelope)?

**Domain model:**
```python
class Secret:                # logical secret with versions
    def __init__(self, name, owner):
        self.name, self.owner = name, owner
        self.versions: list[SecretVersion] = []
    def add_version(self, plaintext, dek) -> "SecretVersion":
        v = SecretVersion(len(self.versions)+1, encrypt(plaintext, dek))
        self.versions.append(v); return v
    def current(self) -> "SecretVersion":
        return next(v for v in reversed(self.versions) if not v.revoked)

class SecretVersion:
    def __init__(self, n, ciphertext):
        self.n, self.ciphertext = n, ciphertext
        self.created_at = utcnow(); self.revoked = False

class Policy:                # who can do what
    def __init__(self): self.rules: dict[str, set[str]] = {}  # principal -> {read,write,delete}
    def allows(self, principal, action) -> bool:
        return action in self.rules.get(principal, set())

class AuditLog:
    def record(self, principal, action, secret_name, ok): ...

class VaultService:                      # facade
    def __init__(self, backend: VaultBackend, policy: Policy,
                 audit: AuditLog, kms: Kms):
        self.backend, self.policy, self.audit, self.kms = backend, policy, audit, kms
    def get(self, principal, name) -> str:
        if not self.policy.allows(principal, "read"):
            self.audit.record(principal, "read", name, ok=False)
            raise Forbidden()
        secret = self.backend.load(name)
        dek = self.kms.unwrap(secret.wrapped_dek)     # envelope encryption
        pt = decrypt(secret.current().ciphertext, dek)
        self.audit.record(principal, "read", name, ok=True)
        return pt
```
**Key concepts to name:** **envelope encryption** (a KMS-wrapped DEK encrypts the secret; you never store the master key), versioning + rotation, **policy as data** (RBAC, Q31), **audit on every access** (Decorator/explicit), pluggable **VaultBackend** via Factory (local/Azure/AWS).
**Edge cases:** revoked versions, key rotation (re-wrap DEK without re-encrypting payload), least privilege, audit must be append-only.

---

## ⭐ Q30. LLD — VMS triage domain model

**Entities & relationships:**
- **Cve** (id like CVE-2024-1234, cvss score/vector, severity, description, published).
- **Cpe** (vendor/product/version — what's affected).
- **Cve ↔ Cpe: many-to-many** (one CVE affects many products; one product has many CVEs) → association table `cve_cpe`.
- **Asset** (a thing you own) has CPEs.
- **Vulnerability** = a (Cve × Asset) instance with state (open/triaged/mitigated/false-positive).
- **Ticket** (Jira) linked to a Vulnerability.
- **User / Role / Permission** (RBAC).

```python
class Cve:
    def __init__(self, id, score, vector, published):
        self.id, self.score, self.vector, self.published = id, score, vector, published
    @property
    def severity(self) -> str:           # banding logic (CVSS v3)
        s = self.score
        return ("CRITICAL" if s>=9 else "HIGH" if s>=7 else
                "MEDIUM" if s>=4 else "LOW")

class Cpe:
    def __init__(self, uri, vendor, product, version): ...

class Vulnerability:                     # CVE found on a specific asset
    def __init__(self, cve: Cve, asset: "Asset"):
        self.cve, self.asset = cve, asset
        self.state = "OPEN"; self.ticket = None
    def triage(self, decision): self.state = decision
    def open_ticket(self, sink: TicketSink):
        self.ticket = sink.create_ticket(self.to_ticket())

class Asset:
    def __init__(self, name, cpes: list[Cpe]): self.name, self.cpes = name, cpes
```
**Patterns:** Repository for data access; Adapter (`TicketSink`) for Jira; Observer for "new critical CVE → notify"; Strategy for severity scoring (CVSS v2 vs v3).
**Edge cases:** CPE matching (version ranges!), de-dup CVEs from sync, false positives, idempotent ticket creation (don't open 5 tickets for the same vuln — idempotency key = vuln id).

---

## ⭐ Q31. LLD — RBAC modeling (roles/permissions)

**Model:** Users have Roles; Roles grant Permissions; Permission = (resource, action). Check at the boundary.

```python
class Permission(Enum):
    CVE_READ="cve:read"; CVE_TRIAGE="cve:triage"
    SECRET_READ="secret:read"; SECRET_WRITE="secret:write"; ADMIN="admin:*"

class Role:
    def __init__(self, name, perms: set[Permission]):
        self.name, self.perms = name, perms

class User:
    def __init__(self, id, roles: list[Role]): self.id, self.roles = id, roles
    @property
    def permissions(self) -> set[Permission]:
        return set().union(*(r.perms for r in self.roles)) if self.roles else set()
    def can(self, p: Permission) -> bool:
        return Permission.ADMIN in self.permissions or p in self.permissions

# enforcement (FastAPI dependency)
def require(perm: Permission):
    def dep(user: User = Depends(current_user)):
        if not user.can(perm): raise Forbidden()
        return user
    return dep

@app.post("/cves/{id}/triage")
def triage(id, user = Depends(require(Permission.CVE_TRIAGE))): ...
```
**RBAC vs ABAC:** RBAC = permissions via roles (coarse, simple). ABAC = policy over attributes (user.dept == resource.owner_dept) — finer but complex. Mention you'd start RBAC, add attribute checks where needed.
**Edge cases:** role hierarchy/inheritance, deny-overrides, per-tenant roles (multi-tenancy), least privilege, caching the permission set per request.

---

## ⭐ Q32. LLD — In-memory cache with TTL + LRU

**Goal:** O(1) get/put, evict least-recently-used when full, expire by TTL.
**Data structures:** hash map (O(1) lookup) + doubly linked list (O(1) move-to-front / pop-tail). Python: `OrderedDict` gives this for free.

```python
from collections import OrderedDict
import time, threading

class LRUCacheTTL:
    def __init__(self, capacity: int, ttl: float):
        self.cap, self.ttl = capacity, ttl
        self.store: OrderedDict[str, tuple] = OrderedDict()  # key -> (value, expires_at)
        self.lock = threading.Lock()

    def get(self, key):
        with self.lock:
            if key not in self.store: return None
            value, exp = self.store[key]
            if time.monotonic() > exp:           # lazy expiry
                del self.store[key]; return None
            self.store.move_to_end(key)          # mark as MRU
            return value

    def put(self, key, value):
        with self.lock:
            if key in self.store: self.store.move_to_end(key)
            self.store[key] = (value, time.monotonic() + self.ttl)
            if len(self.store) > self.cap:
                self.store.popitem(last=False)   # evict LRU
```
**Expiry strategies:** lazy (check on read, shown) vs active (background sweeper) vs both. Lazy is simplest; add a sweeper if memory matters.
**Edge cases:** thread-safety (lock), TTL=0, cache stampede (many misses on hot key → use a lock/single-flight), capacity 0.
**Tie-in (TARA):** cache embeddings + retrieved contexts to cut latency and Ollama load.
**Trade-offs:** LRU vs LFU (frequency), memory vs hit-rate, lock contention (shard the cache for concurrency).

---

# PART 4 — HIGH-LEVEL / SYSTEM DESIGN

## ⭐ Q33. The system-design framework (say this first, every time)

1. **Requirements** — functional (features) + **non-functional** (scale, latency p99, availability, consistency, durability, security/multi-tenancy).
2. **Estimate scale** — QPS, data volume, read:write ratio, growth. Back-of-envelope drives every later decision.
3. **API design** — the contract: endpoints, request/response, auth, pagination, idempotency.
4. **Data model** — entities, relationships, SQL vs NoSQL, indexes, partitioning key.
5. **High-level components** — draw boxes: clients → LB → API → cache → DB → queue → workers → external.
6. **Deep dive** — pick the hard part the interviewer cares about (the sync job, the retrieval path) and go deep.
7. **Bottlenecks & trade-offs** — single points of failure, hot keys, scaling reads, consistency choices; how you'd evolve it.

**Senior signal:** lead with non-functionals and numbers, state assumptions, and always close with trade-offs and "here's where it breaks first."

---

## Core building blocks (know each cold)

### Q34. ⭐ Scaling, load balancing, statelessness
- **Vertical scaling** = bigger box (simple, hard ceiling, SPOF). **Horizontal scaling** = more boxes (needs LB + statelessness, near-limitless).
- **Load balancer** spreads traffic (round-robin, least-connections, consistent hashing); also health-checks and removes dead nodes. L4 (TCP) vs L7 (HTTP, can route by path/header).
- **Statelessness** is the enabler: keep no session in app memory — push session/state to Redis/DB/JWT. Then any node can serve any request and you scale by adding nodes.
**Say it:** "FastAPI services are stateless; sessions live in Redis/JWT, so I scale horizontally behind an LB and a dead pod doesn't lose state."

### Q35. ⭐ Caching
- **Cache-aside (lazy):** app checks cache, on miss reads DB and populates. Most common. Risk: stale data → set TTL; cold start.
- **Write-through:** write to cache + DB together (consistent, slower writes).
- **Write-back:** write cache now, DB later (fast, risk data loss).
- **Eviction:** LRU / LFU / TTL.
- **What to cache:** hot reads — dashboard aggregates (VMS), embeddings/answers (TARA), session, permission sets.
- **Pitfalls:** stale data, **cache stampede** (lock/single-flight or stagger TTL), **hot key** (replicate/shard), cache penetration (cache negative results).
- **Redis** = the default distributed cache (also pub/sub, rate-limit counters, locks).

### Q36. CDN
Edge-cache static assets (the React bundle, images) close to users → lower latency, less origin load. Use for the SPA; not for per-tenant secret data.

### Q37. ⭐ Database scaling
- **Replication / read replicas:** copy writes to replicas; route reads to them → scale reads. Trade-off: **replication lag** → reads can be stale (read-your-writes needs care).
- **Sharding / partitioning:** split data across nodes by a **partition key** → scale writes + storage. Hard part: choosing the key (avoid hot shards), cross-shard queries, rebalancing. Consistent hashing reduces reshuffle.
- **Vertical partitioning** (split columns/tables) vs **horizontal** (split rows).
- **Indexing:** B-tree for range/equality; indexes speed reads, slow writes, cost storage. Index the columns you filter/sort on (severity, published, tenant_id in VMS).

### Q38. ⭐ SQL vs NoSQL
- **SQL (Postgres):** relations, joins, ACID transactions, strong consistency, ad-hoc queries. Default when data is relational and you need integrity — **VMS** (CVE↔CPE m2m, RBAC), **Vault** metadata, TARA's pgvector all sit on Postgres.
- **NoSQL:** key-value (Redis), document (Mongo), wide-column (Cassandra), search (Elasticsearch). Pick for scale-out, flexible schema, or specific access patterns (huge write throughput, denormalized reads).
**Say it:** "I default to Postgres for relational + transactional needs; I reach for NoSQL when the access pattern (massive writes, flexible docs, full-text search) outgrows what a relational DB does well. Postgres often covers both — JSONB, pgvector, full-text — before I add a second store."

### Q39. ⭐ Message queues (async / decoupling)
- **Why:** decouple producer from consumer, smooth spikes (buffer), retry/durability, async work. Producer returns fast; workers process later.
- **RabbitMQ** (smart broker, routing, per-message ack — good for task queues), **Kafka** (distributed log, high-throughput, replayable streams, event sourcing), **Azure Service Bus / SQS** (managed).
- **Tie-in (VMS):** CVE sync enqueues batches → workers parse/persist → on critical match, publish event → ticket/alert consumers. Decouples ingest from notification.
- **Delivery semantics:** at-least-once (default → make consumers **idempotent**), at-most-once, exactly-once (hard/expensive). **DLQ** (dead-letter queue) for poison messages.

### Q40. ⭐ Consistency & CAP
- **CAP:** under a network **P**artition you choose **C**onsistency or **A**vailability. P is non-negotiable in distributed systems, so it's really C-vs-A during partitions.
- **Strong consistency:** every read sees the latest write (Vault secrets, RBAC, financial). **Eventual:** replicas converge over time (dashboard counts, analytics — fine if slightly stale).
- **In practice:** Postgres primary = strong for writes; read replicas = eventual. Pick per-feature: secrets/permissions strong; dashboard aggregates eventual.
- **PACELC** (bonus): even without partitions, there's a Latency-vs-Consistency tradeoff.

### Q41. ⭐ Idempotency
An operation you can repeat safely with the same result. Critical because networks retry. Implement with an **idempotency key**: client sends a unique key; server records "key → result" and returns the stored result on replay.
**Tie-ins:** sync upserts (`ON CONFLICT DO UPDATE`) are naturally idempotent; ticket creation keyed by vuln-id; secret writes keyed by request id. See Q49.

### Q42. Search / Elasticsearch
For full-text + faceted search over large corpora (search CVE descriptions, filter by vendor/severity). Inverted index → fast text queries. Trade-off: it's a secondary store you must keep in sync (eventual). Postgres full-text or pgvector may suffice before adding ES.

### Q43. Rate limiting (system view)
Protect APIs from abuse/overload; per-user/IP/API-key. Distributed → Redis token bucket (Q26). Return 429 + `Retry-After`. Place at gateway/LB and/or app.

---

## ⭐ Worked System Designs (talk-throughs)

### Q44. ⭐ Design a URL shortener (full HLD)

**Requirements:** shorten/redirect; custom alias; expiry; analytics. NFR: redirects must be **fast** (low latency) and **highly available**; read-heavy (~100:1 read:write).
**Scale (example):** `[fill in: writes/day]` → assume 100M new URLs/yr; reads 100×. Key length: 7 base62 chars ≈ 62⁷ ≈ 3.5T combos — plenty.
**API:** `POST /urls {long_url, alias?, ttl?}` → `{short}`; `GET /{code}` → 301/302 redirect.
**Data model:** `mappings(code PK, long_url, created_at, expires_at, owner)`. Key-value access pattern → could be NoSQL, but Postgres is fine at this scale.
**Components:** Clients → CDN/LB → stateless API → **cache (Redis) for hot codes** → DB. **Key Generation Service** (counter or pre-gen pool) avoids collisions. Async **analytics** via queue (don't block redirect on a click write).
**Deep dives:** key gen (counter+base62 vs KGS pool); cache-aside on resolve (hot URLs); 301 vs 302 (302 to keep counting clicks); expiry (lazy on read + sweeper).
**Bottlenecks:** hot keys → cache + replicas; counter as SPOF → range-allocate per node; DB read scaling → replicas.

### Q45. ⭐ Design the VMS backend (sync millions of CVEs + serve a triage dashboard)

**Requirements (functional):** periodically sync NVD CVEs; match CVEs↔assets via CPE; let analysts triage; open Jira tickets; RBAC; dashboard. **NFR:** sync of millions of records must not block the API; dashboard must stay fast; auditable; strong consistency on RBAC/triage, eventual OK on dashboard counts.
**Scale:** `[fill in: total CVEs ~ 250k+, growing]`, `[fill in: assets]`, sync `[fill in: hourly/daily]`.

**The long-running sync (the deep dive — they'll push here):**
- Run it as a **background worker / scheduled job**, never in the request path.
- **Incremental, not full:** use NVD's `lastModStartDate` to fetch only deltas. Page through results; respect rate limits (token bucket / API key).
- **Batch + bulk upsert:** chunk records, `INSERT ... ON CONFLICT DO UPDATE` (idempotent → safe to re-run after a crash).
- **Checkpointing:** persist the last successful watermark so a failed run resumes, not restarts.
- **Backpressure & retries:** exponential backoff with jitter on NVD 5xx/429; DLQ for poison batches.
- **Decouple matching:** after upsert, enqueue affected CPEs → matcher worker recomputes vulnerabilities → on new critical, **Observer/queue** fires ticket + alert (idempotent by vuln-id so you don't double-file).

**Keep the dashboard fast over millions of rows (the other deep dive):**
- **Pre-aggregate** counts (by severity/team/status) into a summary table or **materialized view**, refreshed on sync — don't `COUNT(*)` millions per request.
- **Index** filter/sort columns (severity, published, tenant_id, state); **keyset pagination** (`WHERE id > last`) not OFFSET for deep pages.
- **Cache** the dashboard payload in Redis (cache-aside, short TTL) — eventual consistency is acceptable for counts.
- **Read replicas** for dashboard reads, primary for triage writes.

**Data model:** Postgres. `cve`, `cpe`, `cve_cpe` (m2m join), `asset`, `vulnerability` (cve_id, asset_id, state, ticket_ref), `users/roles/permissions`. Indexes on join + filter cols.
**API:** `GET /vulnerabilities?severity=&state=&page=`, `POST /vulnerabilities/{id}/triage`, `POST /vulnerabilities/{id}/ticket`.
**Components:** React SPA (CDN) → LB → FastAPI (stateless) → Redis cache → Postgres (+replicas) ; Worker(s) + scheduler + queue ; Jira via Adapter.
**Trade-offs:** SQL chosen for the relational m2m + RBAC + transactions. Sync isolated so spikes never hurt the dashboard. Strong consistency where it matters (triage/RBAC), eventual for aggregates.

### Q46. ⭐ Design a RAG assistant like TARA at scale (multi-tenant)

**Requirements (functional):** ingest docs → chunk → embed → store; answer questions grounded in retrieved context with citations; on-prem; **multi-tenant** isolation. **NFR:** answer latency (p95) `[fill in]`, data never leaves tenant boundary, scale ingestion + serving independently.

**Two pipelines (separate them explicitly):**
- **Ingestion (offline, async):** upload → parse → **chunk** (size+overlap) → **embed** (Embedder Strategy, Q16) → upsert into **pgvector** with `tenant_id`. Run on workers via a queue; ingestion spikes don't touch serving.
- **Serving (online, sync):** embed query → **vector search** (ANN over pgvector, filtered by `tenant_id`) → optional **rerank** → build prompt with context → **LLM (LLaMA/Ollama)** generate → return answer **with citations**.

**Multi-tenancy:** every chunk/query carries `tenant_id`; filter in the vector query; per-tenant rate limits; isolate so one tenant can't retrieve another's docs (the #1 thing they'll probe). Option: separate collections/schemas per tenant for hard isolation.
**Scale & latency:**
- **Cache** embeddings (dedup identical chunks) and **cache answers** for repeated questions (Q32).
- Scale Ollama/LLM and embedder as **separate pools** (GPU-bound) behind a queue; the API stays stateless.
- ANN index (HNSW/IVF) for fast top-k; tune recall vs latency.
- **Streaming** tokens (SSE) so perceived latency is low.
**Reliability:** if retrieval is empty → graceful "I don't know" (don't hallucinate); timeouts + fallback model; circuit breaker around the LLM.
**Components:** React (CDN) → LB → FastAPI (retrieval orchestrator, stateless) → pgvector (Postgres) + Redis cache → LLM/embedder worker pool ; ingestion workers + queue + object store for raw docs.
**Trade-offs:** pgvector keeps everything in one Postgres (simpler ops, on-prem friendly) vs a dedicated vector DB (more scale). Chunk size: small = precise but more chunks; large = more context but noisier.

### Q47. Design a notification / ticketing integration

**Requirements:** when a domain event happens (new critical CVE), reliably create a Jira ticket + send alerts, without coupling core logic to Jira.
**Design:** domain publishes an event → queue → notification worker → **Adapter** to Jira/Slack/email. **Idempotency** by event/vuln id (don't double-file). **Retries with backoff**; **DLQ** for failures; **circuit breaker** when Jira is down (queue and retry later, degrade gracefully). Outbox pattern to avoid lost events (write event + state in one transaction).
**Trade-offs:** async = decoupled + resilient but eventual (ticket appears seconds later). Synchronous would couple latency/availability to Jira — bad.

### Q48. Design rate limiting for an API

**Requirements:** protect API; per-API-key limits; consistent across many app instances.
**Design:** **token bucket in Redis** (atomic via Lua), keyed by API key. Enforce at gateway and app. Return 429 + `Retry-After` + rate-limit headers. Per-tier limits (free vs paid). Local in-memory bucket as a fast first layer + Redis as the shared source of truth.
**Trade-offs:** Redis hop adds latency + a dependency, but it's the only way to share counts across instances. Sliding-window-counter if boundary bursts matter.

---

## Reliability & Ops

### Q49. ⭐ Idempotency keys, retries, backoff
- **Retries** with **exponential backoff + jitter** (avoid thundering herd) on transient failures; cap attempts.
- **Idempotency keys** so retries don't double-apply (Q41). Upserts (`ON CONFLICT`) and DB unique constraints enforce it server-side.
- **At-least-once + idempotent consumers** is the standard durable pattern.

### Q50. ⭐ Circuit breaker & graceful degradation
- **Circuit breaker:** after N consecutive failures, "open" the circuit and fail fast (don't hammer a dead dependency); periodically "half-open" to test recovery. Protects you and the dependency.
- **Graceful degradation:** serve a reduced experience instead of failing — VMS dashboard serves cached/stale counts if the DB is slow; TARA returns "I don't know" rather than hallucinate when retrieval fails; Vault returns cached policy if the policy store blips (carefully).

### Q51. ⭐ Observability (metrics / logs / traces)
- **Metrics:** counters/gauges/histograms (request rate, error rate, p50/p95/p99 latency, queue depth, sync lag) — Prometheus/Grafana.
- **Logs:** structured (JSON), with a **correlation/request id** threaded through.
- **Traces:** distributed tracing (OpenTelemetry) to follow a request across API → worker → DB.
- **The four golden signals:** latency, traffic, errors, saturation. **Alert** on SLO breaches, not noise.

### Q52. Background jobs / workers
Anything slow or external goes off the request path: CVE sync, embeddings ingestion, ticket creation, notifications. Scheduler (cron/Celery beat/K8s CronJob) triggers; workers pull from the queue; scale workers independently; make tasks idempotent and resumable (checkpointing).

---

## ⭐ Likely follow-ups (snappy answers)

**Q53. SQL vs NoSQL — when?** SQL for relational + transactional + ad-hoc queries (default; VMS/Vault). NoSQL for scale-out writes, flexible schema, or specific access patterns (KV, search, time-series). Postgres (JSONB, pgvector, FTS) often defers the need for a second store.

**Q54. How to scale reads?** Cache (Redis, cache-aside) → read replicas → pre-aggregate/materialized views → denormalize/index for the query → CDN for static. Accept eventual consistency where reads tolerate staleness.

**Q55. How to handle a long-running sync?** Background worker (off request path), incremental deltas (watermark), batch bulk-upserts (idempotent), checkpoint/resume, backoff+retries, DLQ, decouple downstream via queue. (Full version Q45.)

**Q56. How to make an operation idempotent?** Idempotency key recorded server-side + return stored result on replay; or natural idempotency via upsert/unique constraint/`PUT` semantics; design consumers to tolerate at-least-once delivery.

**Q57. How to keep a dashboard fast over millions of rows?** Pre-aggregate (summary tables / materialized views), index filter/sort columns, keyset (not OFFSET) pagination, Redis cache the payload, read replicas, eventual consistency for counts. (Full version Q45.)

---

# Rapid-fire Cheat Sheet

- **4 pillars:** Encapsulation (hide state), Abstraction (hide complexity), Inheritance (is-a reuse), Polymorphism (one interface, many forms).
- **SOLID:** SRP (one reason to change), OCP (extend don't modify), LSP (subtypes substitutable), ISP (small interfaces), DIP (depend on abstractions).
- **Favor composition over inheritance.** Low coupling, high cohesion. DRY/KISS/YAGNI. Law of Demeter.
- **Patterns:** Singleton, Factory, Strategy, Observer, Decorator, Adapter, Repository, DI, Builder, Facade.
- **LLD script:** clarify → entities → relationships → interfaces/methods → data structures → edge cases → trade-offs.
- **HLD script:** requirements (F + NF) → estimate scale → API → data model → components → deep dive → bottlenecks/trade-offs.
- **Scaling:** horizontal + stateless + LB; cache (cache-aside/Redis); replicas (read scale) + sharding (write scale); CDN for static.
- **Async:** queues decouple + buffer + retry; at-least-once → idempotent consumers; DLQ.
- **Consistency:** CAP → C-vs-A under partition; strong where it matters (secrets/RBAC), eventual where tolerable (dashboards).
- **Reliability:** retries w/ backoff+jitter, idempotency keys, circuit breaker, graceful degradation, observability (metrics/logs/traces).
- **Default DB:** Postgres (relational + JSONB + pgvector + FTS) until an access pattern forces NoSQL.

---

# Traps & Gotchas

1. **Encapsulation ≠ abstraction.** One hides data/state, the other hides complexity/behavior. Know the distinction cold.
2. **Python has no real `private`** — `__x` is name-mangling, not enforcement. Say "by convention."
3. **No method overloading in Python** — last definition wins; use `singledispatch`/default args.
4. **Inheritance overuse** — if it's "reuse code," it's composition. Watch for LSP violations (subclass that throws on a base method).
5. **SRP isn't "tiny classes"** — it's one axis of change / one actor.
6. **OCP/abstraction overkill** = YAGNI. Add the seam only where change is likely (≥2 implementations).
7. **Singleton is global state** — hard to test, thread-unsafe if naive; prefer DI of a single instance.
8. **Repository over an ORM** can be a pointless pass-through — justify by testability + query centralization.
9. **LLD: forgetting concurrency/thread-safety** (rate limiter, cache, parking allocation) — always mention locks/atomicity.
10. **OFFSET pagination** is O(n) for deep pages — use keyset/cursor pagination.
11. **`COUNT(*)` over millions per request** kills dashboards — pre-aggregate.
12. **At-least-once delivery** means duplicates — consumers MUST be idempotent. Don't claim "exactly once" casually.
13. **Replication lag** breaks read-your-writes — route critical reads to primary.
14. **CAP misuse** — you don't "give up P"; you choose C or A *during* a partition.
15. **Cache stampede / hot key** — mention single-flight locks and TTL jitter; don't forget them.
16. **Sync in the request path** — a multi-million-record sync must be a background job; saying otherwise fails the round.
17. **RAG: hallucination on empty retrieval** — degrade to "I don't know," and enforce **tenant_id filtering** for multi-tenant isolation.
18. **Idempotent ticket creation** — key by vuln id or you'll file duplicate Jira tickets on retry.
19. **Naming patterns without justification** — always tie a pattern to the *problem it solves*, not "because it's a pattern."
20. **Forgetting non-functionals** in HLD — lead with scale/latency/consistency/availability, not just features.

---

*End of file. Practice saying the ⭐ items out loud in 60–90 seconds each, and always close every design answer with explicit trade-offs.*
