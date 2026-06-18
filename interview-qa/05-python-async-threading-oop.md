# Python Language Depth, Concurrency & OOP — Deep Interview Q&A

> **Candidate:** Saiganesh — FullStack (React + Python/FastAPI, Azure/AWS) @ Fractal Analytics
> **Why this file matters:** The JD explicitly calls out *"performance optimization and multithreading."* Python is your strongest pillar. This is where you turn an interview into free points.
> **Flagship projects referenced throughout:**
> 1. **VMS** — Django NVD CVE sync, **16–18h → ~4h** via bulk DB ops + parallelizing/batching I/O-bound NVD API calls. *(The concurrency story.)*
> 2. **TARA Copilot** — FastAPI async backend serving a RAG pipeline (async I/O to Ollama + pgvector).
> 3. **Secret Vault** — FastAPI + Postgres.
>
> Legend: ⭐ = very likely to be asked. "Say it out loud" = the spoken version. Numbers you must verify are marked `[fill in: ...]`.

---

## Table of Contents

1. [Concurrency — The GIL, Threads, Multiprocessing, Asyncio (HIGH YIELD)](#1-concurrency)
2. [Async/await, the Event Loop, FastAPI](#2-asyncawait-event-loop-fastapi)
3. [The VMS Optimization — Concurrency Case Study](#3-vms-case-study)
4. [Core Language — Mutability, Scope, Closures](#4-core-language)
5. [Decorators](#5-decorators)
6. [Generators, Iterators, Context Managers](#6-generators-iterators-context-managers)
7. [Args/kwargs, Comprehensions, Functional Tools, Unpacking](#7-args-comprehensions-functional)
8. [Data Model / Dunder Methods, Dataclasses, Enum](#8-data-model-dunders)
9. [OOP — The 4 Pillars, MRO, super, Methods, Properties, ABCs](#9-oop)
10. [Typing & Pydantic](#10-typing-pydantic)
11. [Memory & Internals — Refcounting, GC, Interning, Copy](#11-memory-internals)
12. [Errors & Exceptions, EAFP vs LBYL](#12-errors)
13. [Performance — Big-O, Containers, Profiling, Caching](#13-performance)
14. [Stdlib Gems — collections, itertools, functools, pathlib](#14-stdlib)
15. [Likely Follow-ups (live coding)](#15-followups)
16. [Rapid-fire Cheat Sheet](#16-cheat-sheet)
17. [Traps & Gotchas](#17-traps)

---

<a name="1-concurrency"></a>
## 1. Concurrency — The GIL, Threads, Multiprocessing, Asyncio (HIGH YIELD)

### ⭐ Q1. What is the GIL?

**Say it out loud:** "The GIL — Global Interpreter Lock — is a mutex inside CPython that allows only **one thread to execute Python bytecode at a time**, per process. So even on an 8-core machine, a single Python process runs Python code on effectively one core at any instant. The GIL exists because CPython's memory management — specifically reference counting — isn't thread-safe; the GIL is the cheap, simple way to protect every object's refcount from being corrupted by concurrent threads."

**Deeper:** Without the GIL, every `Py_INCREF`/`Py_DECREF` would need its own lock or atomic operation, which historically made single-threaded code slower and the interpreter far more complex. The GIL is a pragmatic trade: simpler C extensions, fast single-threaded performance, at the cost of true multi-threaded CPU parallelism.

**Gotcha to mention:** The GIL is a **CPython** implementation detail, not part of the Python *language*. Jython and IronPython have no GIL. And **Python 3.13** ships an experimental **free-threaded build (PEP 703, "no-GIL")** behind a flag — worth name-dropping to show you're current.

---

### ⭐ Q2. Why do threads NOT give CPU parallelism but DO help I/O-bound work?

**Say it out loud:** "Because of the GIL, two Python threads can't run bytecode simultaneously, so CPU-bound work doesn't speed up — you just pay context-switching overhead. But I/O-bound work is different: when a thread makes a blocking I/O call — a network request, a DB query, a disk read — **CPython releases the GIL while it waits**. So another thread can run Python during that wait. That's why threads are great for I/O concurrency: you're overlapping the *waiting*, not the *computing*."

**The one-liner to nail it:**
> "Threads in Python overlap **waiting**, not **computing**."

**Concrete numbers framing:** If you have 100 NVD API calls that each take ~500ms of network wait, serially that's ~50s. With 20 threads you overlap the waits and finish in ~2.5s — even though only one thread ever runs Python at a time. That's exactly the VMS win (Q under §3).

---

### ⭐ Q3. I/O-bound vs CPU-bound — define and give examples.

| | **I/O-bound** | **CPU-bound** |
|---|---|---|
| Bottleneck | Waiting on external resource | Doing computation |
| Examples | NVD API calls, DB queries (Postgres/pgvector), reading files, calling Ollama | Hashing, image resizing, number crunching, parsing huge JSON, ML inference on CPU |
| Best tool | **threads** or **asyncio** | **multiprocessing** (or native/C libs that release the GIL) |
| Why | GIL released during I/O wait | Need real parallel cores; GIL blocks thread parallelism |

**Say it out loud:** "First question I ask before reaching for concurrency: *is this I/O-bound or CPU-bound?* That single decision picks the tool. VMS's NVD sync was I/O-bound — almost all the time was network wait — so threads/async were the right answer, not multiprocessing."

---

### ⭐ Q4. Threads vs multiprocessing vs asyncio — when do you use each?

**Say it out loud:** "Three tools, three jobs:

- **`threading`** → I/O-bound, when the library is blocking/synchronous and I can't easily make it async (e.g. the `requests` library, a sync DB driver). Threads release the GIL on I/O. Lower memory than processes, shared memory so easy data sharing, but you must guard shared state with locks.
- **`multiprocessing`** → CPU-bound. Each process has its own interpreter and its **own GIL**, so they run on multiple cores for real parallelism. Cost: higher memory, data must be pickled across process boundaries (IPC), slower to start.
- **`asyncio`** → I/O-bound at high concurrency, when I have async-native libraries (`httpx`, `asyncpg`, async SQLAlchemy). Single thread, cooperative scheduling via an event loop. Thousands of concurrent connections cheaply, no lock headaches, but **one blocking call freezes the whole loop**."

**Decision table:**

| Workload | Library is... | Use |
|---|---|---|
| I/O-bound | sync/blocking | `ThreadPoolExecutor` |
| I/O-bound | async-native | `asyncio` + `gather` |
| CPU-bound | anything pure-Python | `multiprocessing` / `ProcessPoolExecutor` |
| CPU-bound | C lib that releases GIL (NumPy) | threads can work |

**Follow-up — "asyncio vs threads, both I/O — why pick one?"**
"asyncio scales to *tens of thousands* of concurrent tasks on one thread with no lock overhead — ideal for a high-concurrency server like a FastAPI app. Threads are simpler to retrofit onto existing **blocking** code and don't require the whole call stack to be `async`. In VMS (Django, sync ecosystem) threads were the pragmatic choice; in TARA (FastAPI, async-native) asyncio is natural."

---

### Q5. Show me threads for I/O concurrency (the VMS shape).

```python
import concurrent.futures
import requests

def fetch_cve_page(start_index: int) -> dict:
    """One blocking NVD API call — releases the GIL while waiting on the network."""
    resp = requests.get(
        "https://services.nvd.nist.gov/rest/json/cves/2.0",
        params={"startIndex": start_index, "resultsPerPage": 2000},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()

start_indices = range(0, 200_000, 2000)  # NVD paginates

results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
    # map preserves input order; or use submit + as_completed for streaming
    for page in pool.map(fetch_cve_page, start_indices):
        results.append(page)
```

**Say it out loud:** "`ThreadPoolExecutor` from `concurrent.futures` is the clean, modern way to do threaded I/O. I cap `max_workers` so I don't hammer the API or exhaust connections — NVD also rate-limits, so I tune concurrency to its limits. Each `requests.get` releases the GIL during the network wait, so the pool genuinely overlaps the calls."

---

### Q6. Same thing with asyncio (the TARA shape).

```python
import asyncio
import httpx

async def fetch_cve_page(client: httpx.AsyncClient, start_index: int) -> dict:
    resp = await client.get(
        "https://services.nvd.nist.gov/rest/json/cves/2.0",
        params={"startIndex": start_index, "resultsPerPage": 2000},
    )
    resp.raise_for_status()
    return resp.json()

async def fetch_all() -> list[dict]:
    async with httpx.AsyncClient(timeout=30) as client:
        tasks = [fetch_cve_page(client, i) for i in range(0, 200_000, 2000)]
        return await asyncio.gather(*tasks)

results = asyncio.run(fetch_all())
```

**Say it out loud:** "Same overlap-the-waits idea, but cooperative on a single thread. `asyncio.gather` schedules all the coroutines concurrently and waits for all of them. The key: I use `httpx` (async) and `await` each call so the event loop can run other tasks during the network wait. If I'd used blocking `requests` here instead, I'd block the whole loop and kill the concurrency."

**Bound the concurrency** (important in real systems):
```python
sem = asyncio.Semaphore(10)  # at most 10 in flight, respect rate limits

async def fetch_bounded(client, i):
    async with sem:
        return await fetch_cve_page(client, i)
```

---

### ⭐ Q7. `asyncio.gather` — what does it do and what are the gotchas?

**Say it out loud:** "`gather` takes multiple awaitables, schedules them to run concurrently, and returns a list of results in the **order you passed them in** (not the order they finish). By default, if any task raises, `gather` propagates that exception and the others keep running in the background. Pass `return_exceptions=True` to collect exceptions as results instead of blowing up the whole batch — useful when I want partial success, like 'sync the CVE pages that succeeded, log the few that failed.'"

```python
results = await asyncio.gather(*tasks, return_exceptions=True)
oks = [r for r in results if not isinstance(r, Exception)]
errs = [r for r in results if isinstance(r, Exception)]
```

**Follow-up — gather vs `asyncio.as_completed` vs TaskGroup?**
- `gather` → all results at once, ordered.
- `as_completed` → iterate results **as they finish** (good for streaming/progress bars).
- `asyncio.TaskGroup` (3.11+) → structured concurrency; if one task fails it **cancels siblings** and raises an `ExceptionGroup`. Modern best practice.

```python
async with asyncio.TaskGroup() as tg:      # 3.11+
    for i in start_indices:
        tg.create_task(fetch_cve_page(client, i))
# all tasks awaited at block exit; failure cancels the rest
```

---

### Q8. `concurrent.futures` — ThreadPoolExecutor vs ProcessPoolExecutor.

**Say it out loud:** "`concurrent.futures` gives one uniform API — `Executor.submit()` returns a `Future`, or `Executor.map()`. The only difference is the backend: `ThreadPoolExecutor` for I/O-bound, `ProcessPoolExecutor` for CPU-bound. Same code shape, swap one class. I usually prototype with threads and switch to processes only if profiling shows I'm CPU-bound."

```python
from concurrent.futures import ProcessPoolExecutor

def cpu_heavy(n):           # e.g. hashing, parsing, crunching
    return sum(i*i for i in range(n))

with ProcessPoolExecutor() as pool:
    results = list(pool.map(cpu_heavy, [10_000_000]*8))  # uses all cores
```

**Gotcha:** Functions submitted to `ProcessPoolExecutor` and their args/results must be **picklable** (no lambdas, no local closures, no open sockets). On Windows the entry point must be guarded by `if __name__ == "__main__":` because it uses `spawn`.

---

### ⭐ Q9. Race conditions and locks — explain and show a thread-safe counter.

**Say it out loud:** "A race condition is when two threads touch shared mutable state and the result depends on timing. The classic is `counter += 1` — that's actually *read, add, write*, three steps. Two threads can both read the same old value and one increment gets lost. Even though the GIL serializes bytecode, it can switch threads *between* those steps, so `+=` is not atomic. The fix is a `Lock` to make the read-modify-write a single critical section."

```python
import threading

class Counter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def increment(self):
        with self._lock:          # critical section
            self._value += 1

    @property
    def value(self):
        return self._value

counter = Counter()
threads = [threading.Thread(target=lambda: [counter.increment() for _ in range(100_000)])
           for _ in range(8)]
for t in threads: t.start()
for t in threads: t.join()
print(counter.value)   # reliably 800_000 with the lock
```

**Follow-ups to be ready for:**
- "Without the lock?" → result is non-deterministic, usually < 800,000.
- "Other primitives?" → `RLock` (re-entrant, same thread can acquire twice), `Semaphore` (limit N concurrent), `Event`, `Condition`, `Barrier`, and **`queue.Queue`** which is already thread-safe (often cleaner than manual locks).
- "Deadlock?" → two threads each holding a lock the other wants. Avoid by always acquiring locks in a consistent global order, or using timeouts.
- "In asyncio?" → use `asyncio.Lock`, not `threading.Lock`. But single-threaded async has fewer races *between awaits* — state is only ever interrupted at an `await` point, so non-awaiting sections are effectively atomic.

---

### ⭐ Q10. "Why is my threaded CPU-bound code not faster?" (THE trap question)

**Say it out loud:** "Because of the GIL. Threads can't run Python bytecode in parallel, so pure-Python CPU work doesn't scale across cores with threads — you actually get a small *slowdown* from context-switching and lock contention. The fix is **multiprocessing** (or `ProcessPoolExecutor`), where each process has its own GIL and runs on its own core. Alternatively, push the heavy work into a C extension that releases the GIL — NumPy, for instance, does real work outside the GIL, so threads *can* help there."

**Demonstrate you know the exception:** "So the nuance is: threads don't help *pure-Python* CPU work, but they *can* help CPU work that happens inside GIL-releasing C code (NumPy, some compression libs, native hashing)."

---

### Q11. When does async *hurt*?

**Say it out loud:** "Async is a trap for CPU-bound work. A long synchronous computation inside an async function **blocks the entire event loop** — every other request on that worker stalls until it finishes, because it's all one thread cooperating. So the rule: never do heavy CPU work or call a blocking library directly inside an `async def`. Offload it."

**The fix — `run_in_executor` / `asyncio.to_thread`:**
```python
import asyncio

def blocking_pdf_parse(data: bytes) -> str:   # CPU/blocking, sync lib
    ...

@app.post("/ingest")
async def ingest(file: bytes):
    loop = asyncio.get_running_loop()
    # offload to a thread (I/O-blocking) or a ProcessPool (CPU-bound)
    text = await loop.run_in_executor(None, blocking_pdf_parse, file)
    # 3.9+ shorthand for the default thread pool:
    text = await asyncio.to_thread(blocking_pdf_parse, file)
    return {"len": len(text)}
```

**Other async footguns:** mixing blocking libs (`requests`, sync `psycopg2`, `time.sleep`) inside async code; forgetting to `await` (you get a coroutine object, not a result, and a "coroutine was never awaited" warning); and CPU work hidden inside an `async def`.

---

<a name="2-asyncawait-event-loop-fastapi"></a>
## 2. Async/await, the Event Loop, FastAPI

### Q12. What is the event loop, in plain terms?

**Say it out loud:** "The event loop is a single-threaded scheduler that runs coroutines cooperatively. It keeps a queue of ready tasks. It runs one until it hits an `await` on something not-yet-ready — an I/O operation — at which point the coroutine *yields control* back to the loop. The loop registers interest in that I/O (via the OS, e.g. epoll/kqueue/IOCP) and runs another ready task. When the I/O completes, the loop resumes the parked coroutine. So one thread juggles thousands of in-flight I/O operations by never sitting idle during a wait."

**Key word — cooperative:** "It's *cooperative* scheduling, not pre-emptive. Tasks must `await` to give up control. If a task never awaits — a tight CPU loop — it hogs the loop and starves everything else. That's why blocking calls are poison in async."

---

### Q13. Coroutine vs `async def` vs `await` — define each.

**Say it out loud:**
- "**`async def`** defines a **coroutine function**. Calling it doesn't run it — it returns a **coroutine object**, a paused computation.
- **`await`** runs an awaitable and suspends the current coroutine until that awaitable completes, yielding control to the event loop meanwhile. You can only `await` inside an `async def`.
- A **coroutine** is the resumable unit; a **Task** is a coroutine the loop has scheduled to run (created via `asyncio.create_task` or `gather`)."

```python
async def get_user(uid):       # coroutine FUNCTION
    return await db.fetch(uid)  # await suspends until DB responds

coro = get_user(1)             # coroutine OBJECT — nothing ran yet
result = await coro            # now it runs (inside another async def)
# or at top level:
result = asyncio.run(get_user(1))
```

**Gotcha:** `get_user(1)` with no `await` and no `create_task` does nothing and warns "coroutine was never awaited."

---

### ⭐ Q14. Why is FastAPI async? Why does `async def` + `await` give concurrency?

**Say it out loud:** "FastAPI is built on ASGI and an async event loop so a single worker can handle many concurrent requests efficiently. The win is I/O concurrency: when request A awaits a slow DB query or an external API, the event loop doesn't sit blocked — it serves requests B, C, D during A's wait. So with mostly-I/O endpoints, one async worker handles far more concurrent connections than a thread-per-request model, with much lower memory overhead. That's exactly TARA's profile — the RAG pipeline is I/O-bound: embedding calls and generation to Ollama, vector search in pgvector. Each request spends most of its time waiting on those, so async lets one worker overlap many in-flight requests."

**The crucial nuance interviewers probe:**
> "Async only helps if you actually `await` real async I/O. If your async route calls a **blocking** library — `requests`, blocking `psycopg2`, `time.sleep` — you block the event loop and lose all the concurrency. So in TARA I use async-native clients: `httpx` for HTTP, an async Postgres driver (`asyncpg`/async SQLAlchemy) for pgvector."

---

### ⭐ Q15. FastAPI: when do you write `async def` vs `def` for a route?

**Say it out loud:** "FastAPI handles both, and it's smart about it:
- **`async def`** → use when the endpoint's work is genuinely async — you `await` async DB/HTTP clients. Runs directly on the event loop.
- **plain `def`** → use when you have only **blocking/synchronous** code (a sync DB driver, a CPU-light blocking lib). FastAPI runs sync routes in an **external threadpool** so they don't block the event loop.

The mistake to avoid: writing `async def` and then calling a **blocking** library inside it — that blocks the loop and is worse than just using a plain `def` route. So: if all your I/O is async-native, go `async def`; if you're stuck with blocking libs, a plain `def` route is the safe, correct choice."

**Rule of thumb table:**

| Your I/O is... | Route signature |
|---|---|
| async-native (`httpx`, `asyncpg`) | `async def` + `await` |
| blocking (`requests`, `psycopg2`, sync SDK) | plain `def` (FastAPI threadpools it) |
| `async def` but must call one blocking thing | `await asyncio.to_thread(...)` |

---

### Q16. How do Pydantic and async fit together in FastAPI?

**Say it out loud:** "Pydantic does request/response validation and serialization — it's orthogonal to async but ties the whole FastAPI story together. I declare a Pydantic model as the body type; FastAPI parses and validates the JSON, gives me a typed object, and auto-generates the OpenAPI docs. Validation is synchronous and fast (Pydantic v2's core is in Rust), so it doesn't meaningfully block the loop."

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()

class SecretIn(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    value: str
    ttl_seconds: int | None = None

@app.post("/secrets")
async def create_secret(body: SecretIn):       # validated + typed
    await repo.save(body.name, body.value)      # async DB I/O
    return {"name": body.name}
```

---

<a name="3-vms-case-study"></a>
## 3. The VMS Optimization — Concurrency Case Study (tell this as a STORY)

### ⭐ Q17. Walk me through how you took the VMS sync from 16–18h to ~4h.

**Say it out loud (the full narrative):**

"VMS syncs CVE data from NVD into our Django/Postgres database. The original job ran **16–18 hours**. I profiled it and found two separate bottlenecks, and fixing them needed two different techniques:

**1. The network was I/O-bound and serial.** NVD's API is paginated, and we were fetching pages one at a time — each call mostly *waiting* on the network. That's the textbook case for concurrency. Since it's I/O-bound, the GIL releases during each request, so I parallelized the fetches with a bounded thread pool (`ThreadPoolExecutor`), and **batched** the work — pulling pages concurrently while respecting NVD's rate limits with a capped `max_workers`. Overlapping the waits collapsed hours of sequential network latency into a fraction of that.

**2. The database writes were row-by-row.** We were doing per-row inserts/updates inside the ORM, which means one round-trip per CVE — thousands of tiny transactions. I switched to **bulk operations** — `bulk_create` / `bulk_update` (and batched upserts) — so we write thousands of rows per round-trip instead of one. That alone was a massive cut because it eliminated per-row ORM and network overhead.

Combined — concurrent/batched I/O on the fetch side, bulk writes on the persistence side — the job went from **16–18h to about 4h**, roughly a `[fill in: ~4x]` improvement."

**Why this answer scores:** it shows you (a) profiled before optimizing, (b) correctly classified the workload as I/O-bound, (c) knew *why* threads work here (GIL released on I/O), (d) handled the rate-limit constraint, and (e) attacked the DB layer separately with bulk ops.

---

### Q18. Why threads and not multiprocessing for the NVD fetch?

**Say it out loud:** "Because the fetch was **I/O-bound** — almost all the time was network wait, not CPU. The GIL releases during blocking I/O, so threads overlap the waits perfectly with no need for separate processes. Multiprocessing would've added overhead — process startup, pickling the results back across process boundaries — for zero benefit, since I wasn't CPU-limited. Multiprocessing earns its keep only when you're burning CPU."

**Follow-up — "Could you have used asyncio instead?"**
"Yes — with an async HTTP client like `httpx` and `asyncio.gather` it'd achieve the same overlap, and arguably scale to higher concurrency more cheaply. But VMS lives in the Django/sync ecosystem with the `requests` library, so a `ThreadPoolExecutor` was the lower-friction, lower-risk choice — I didn't have to make the entire call stack async. If I were greenfielding it on FastAPI like TARA, I'd lean asyncio."

---

### Q19. How did you stop hammering / getting rate-limited by NVD?

**Say it out loud:** "Two levers. First, I capped concurrency — `max_workers` (or an `asyncio.Semaphore`) tuned to NVD's published rate limit, so I never had more in-flight requests than allowed. Second, retries with backoff on `429`/`5xx` and respecting `Retry-After`, plus a timeout on every request so one stuck call couldn't stall a worker. The goal is maximum throughput *under* the rate limit, not maximum requests."

---

### Q20. Why are bulk DB operations so much faster than per-row?

**Say it out loud:** "Three reasons. **Round-trips** — per-row means one network round-trip and one transaction per CVE; bulk batches thousands of rows into a single statement, so you amortize latency. **Transaction overhead** — committing once per batch instead of per row removes huge per-transaction cost. **ORM overhead** — per-row goes through the full ORM object lifecycle each time; `bulk_create`/`bulk_update` skip a lot of that. Round-trips are the killer — if each one is even a few milliseconds, multiply by hundreds of thousands of rows and you've got hours."

---

<a name="4-core-language"></a>
## 4. Core Language — Mutability, Scope, Closures

### ⭐ Q21. Mutable vs immutable — and the mutable-default-argument trap.

**Say it out loud:** "Immutable types can't be changed after creation — `int`, `float`, `str`, `tuple`, `frozenset`, `bytes`. Mutable types can — `list`, `dict`, `set`, and most custom objects. This matters for sharing: if two names point at the same mutable object, a change through one is visible through the other. Only **hashable** (effectively immutable) objects can be dict keys or set members."

**⭐ The trap — the gotcha they love:**
```python
def add_item(item, basket=[]):     # BUG: default list created ONCE
    basket.append(item)
    return basket

add_item("a")   # ['a']
add_item("b")   # ['a', 'b']  <-- surprise! same list reused
```
"The default value is evaluated **once**, at function-definition time, not per call. So a mutable default is shared across every call. The fix is the `None` sentinel:"
```python
def add_item(item, basket=None):
    if basket is None:
        basket = []
    basket.append(item)
    return basket
```

---

### ⭐ Q22. `is` vs `==`?

**Say it out loud:** "`==` compares **values** (calls `__eq__`). `is` compares **identity** — whether two names point to the exact same object in memory (same `id()`). Rule: use `==` for value equality, and reserve `is` for singletons — `is None`, `is True`, `is False`. Never use `is` to compare numbers or strings, because it depends on interning and you'll get inconsistent results."

```python
a = [1, 2, 3]; b = [1, 2, 3]
a == b   # True  (same value)
a is b   # False (different objects)

x = 256; y = 256
x is y   # True  — small ints (-5..256) are interned/cached
x = 257; y = 257
x is y   # often False — outside the cache  (CPython detail!)
```

---

### ⭐ Q23. Variable scope and the LEGB rule.

**Say it out loud:** "Python resolves names by **LEGB**: **L**ocal, then **E**nclosing (any outer functions), then **G**lobal (module level), then **B**uilt-in. It searches outward in that order and uses the first match. To *rebind* a name in an outer scope you need `global` (for module level) or `nonlocal` (for an enclosing function), otherwise an assignment creates a new local."

```python
x = "global"
def outer():
    x = "enclosing"
    def inner():
        # reads find 'enclosing' via E before G
        print(x)
    inner()
outer()   # "enclosing"
```

**Classic gotcha:**
```python
count = 0
def bump():
    count += 1     # UnboundLocalError! assignment makes count local,
                   # but it's read before assigned
def bump_fixed():
    global count
    count += 1
```

---

### ⭐ Q24. What's a closure?

**Say it out loud:** "A closure is a function that captures and remembers variables from its enclosing scope, even after that outer scope has returned. The inner function keeps a live reference to those variables. Closures are how decorators carry state, and they're the lightweight alternative to a class when you only need to bundle one function with some data."

```python
def make_multiplier(factor):
    def multiply(n):
        return n * factor     # 'factor' captured from enclosing scope
    return multiply

triple = make_multiplier(3)
triple(10)   # 30  — 'factor' still remembered after make_multiplier returned
```

**Late-binding gotcha (loved in interviews):**
```python
funcs = [lambda: i for i in range(3)]
[f() for f in funcs]          # [2, 2, 2] — all capture the SAME i, final value
# fix: bind per-iteration via default arg
funcs = [lambda i=i: i for i in range(3)]
[f() for f in funcs]          # [0, 1, 2]
```

---

<a name="5-decorators"></a>
## 5. Decorators

### ⭐ Q25. What is a decorator? Write one.

**Say it out loud:** "A decorator is a callable that takes a function and returns a new function, usually wrapping the original to add behavior — logging, timing, caching, auth — without touching its body. `@decorator` above a function is just sugar for `func = decorator(func)`. It leans on closures and Python treating functions as first-class objects."

```python
import functools, time

def timed(func):
    @functools.wraps(func)              # preserve name/docstring/signature
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timed
def sync_cve_page(start_index):
    ...
```

**⭐ Why `functools.wraps`?**
"Without it, the wrapper *replaces* the original function's metadata — `__name__` becomes `'wrapper'`, the docstring is lost, and introspection/auto-docs break. `@functools.wraps(func)` copies the wrapped function's name, docstring, and signature onto the wrapper. Always use it."

---

### ⭐ Q26. Write a decorator that takes arguments.

**Say it out loud:** "A decorator with arguments is a function that *returns a decorator* — so you have three nested layers: the outer takes the decorator's args, the middle takes the function, the inner is the wrapper."

```python
import functools, time

def retry(times=3, delay=1.0, exceptions=(Exception,)):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == times:
                        raise
                    print(f"retry {attempt}/{times} after {e}")
                    time.sleep(delay * attempt)   # backoff
        return wrapper
    return decorator

@retry(times=5, delay=0.5, exceptions=(ConnectionError, TimeoutError))
def fetch_cve_page(start_index):
    ...
```

**Tie-in:** "This is essentially the retry-with-backoff I wrapped around the NVD calls in VMS so a transient `429` or timeout didn't fail the whole sync."

**Bonus — know these:** class-based decorators (implement `__call__`), and built-in decorators `@property`, `@staticmethod`, `@classmethod`, `@functools.lru_cache`, `@functools.wraps`, `@dataclass`.

---

<a name="6-generators-iterators-context-managers"></a>
## 6. Generators, Iterators, Context Managers

### ⭐ Q27. What's a generator and why use `yield`?

**Say it out loud:** "A generator is a function that uses `yield` to produce a sequence **lazily** — it computes and hands back one value at a time, pausing its entire state between values, instead of building the whole list in memory. The payoff is memory: you can stream a million-row file or an infinite sequence while holding only one item at a time. Calling a generator function returns a generator object; nothing runs until you iterate it."

```python
def read_large_file(path):
    with open(path) as f:
        for line in f:          # file iteration is already lazy
            yield line.strip()   # one line at a time, constant memory

# eager list: loads everything -> O(n) memory
lines = [l.strip() for l in open(path)]
# lazy generator: O(1) memory
lines = read_large_file(path)
```

**Infinite/lazy example:**
```python
def cve_page_indices(step=2000):
    i = 0
    while True:
        yield i
        i += step      # infinite — caller decides when to stop
```

**Generator expression** (same idea, inline — note `()` not `[]`):
```python
total = sum(x*x for x in range(10_000_000))   # never materializes the list
```

**Say it out loud — list comp vs gen exp:** "Square brackets build the whole list in memory eagerly; parentheses give a lazy generator that yields one at a time. Use the generator when you only iterate once and the data is large — like streaming CVE records into a bulk-insert batcher instead of loading them all."

---

### Q28. Iterators and the iterator protocol.

**Say it out loud:** "An **iterable** is anything you can loop over — it implements `__iter__`, which returns an **iterator**. An iterator implements `__next__`, returning the next item and raising `StopIteration` when exhausted. `for` loops are sugar over this: call `iter()` once, then `next()` repeatedly until `StopIteration`. Generators are just the easy way to build iterators — `yield` writes the `__iter__`/`__next__` machinery for you."

```python
class Countdown:
    def __init__(self, start): self.n = start
    def __iter__(self):  return self          # iterable
    def __next__(self):                        # iterator
        if self.n <= 0:
            raise StopIteration
        self.n -= 1
        return self.n + 1

list(Countdown(3))   # [3, 2, 1]
```

---

### ⭐ Q29. Context managers — `with`, `__enter__`/`__exit__`, `contextlib`.

**Say it out loud:** "A context manager guarantees setup and teardown around a block, even if an exception fires — that's what `with` does. It's the right tool for any resource that must be released: files, DB connections, locks, network sessions. You implement `__enter__` (runs on entry, return value goes to `as`) and `__exit__` (runs on exit, always — return `True` to suppress an exception). The win is no leaked resources and no manual try/finally everywhere."

```python
class DBTransaction:
    def __init__(self, conn): self.conn = conn
    def __enter__(self):
        self.conn.begin()
        return self.conn
    def __exit__(self, exc_type, exc, tb):
        if exc_type:                # block raised
            self.conn.rollback()
        else:
            self.conn.commit()
        return False                # don't suppress exceptions
```

**The `contextlib` shortcut** (generator-based — cleaner for simple cases):
```python
from contextlib import contextmanager

@contextmanager
def timer(label):
    import time
    start = time.perf_counter()
    try:
        yield                       # everything before yield = __enter__
    finally:
        print(f"{label}: {time.perf_counter()-start:.3f}s")  # __exit__

with timer("nvd_sync"):
    run_sync()
```

**Async version:** `async with`, implemented via `__aenter__`/`__aexit__` (or `@contextlib.asynccontextmanager`) — used for async DB sessions in FastAPI / TARA.

---

<a name="7-args-comprehensions-functional"></a>
## 7. Args/kwargs, Comprehensions, Functional Tools, Unpacking

### Q30. `*args` and `**kwargs`?

**Say it out loud:** "`*args` collects extra **positional** arguments into a tuple; `**kwargs` collects extra **keyword** arguments into a dict. They let a function accept any number of arguments, and at the call site `*` and `**` *unpack* an iterable/dict back into arguments. They're the backbone of decorators — `wrapper(*args, **kwargs)` forwards whatever the wrapped function took."

```python
def log_call(*args, **kwargs):
    print("positional:", args, "keyword:", kwargs)

log_call(1, 2, x=3)            # positional: (1, 2)  keyword: {'x': 3}

params = {"startIndex": 0, "resultsPerPage": 2000}
requests.get(url, **params)    # unpack dict into keyword args
```

---

### Q31. Comprehensions, lambda, map/filter/reduce.

**Say it out loud:** "Comprehensions are the Pythonic way to build lists/dicts/sets — they're more readable and usually faster than an explicit loop with `.append`. `map`/`filter` apply a function across an iterable lazily; `reduce` folds an iterable to one value. `lambda` is a small anonymous function. I generally prefer comprehensions over `map`/`filter` for readability, but `map` shines when I already have a named function."

```python
# comprehensions
squares   = [x*x for x in range(10)]
evens     = [x for x in range(10) if x % 2 == 0]
name_to_id = {c["name"]: c["id"] for c in cves}        # dict comp
unique    = {c["severity"] for c in cves}              # set comp

# functional
from functools import reduce
nums = [1, 2, 3, 4]
list(map(lambda x: x*2, nums))                # [2, 4, 6, 8]
list(filter(lambda x: x % 2 == 0, nums))      # [2, 4]
reduce(lambda a, b: a + b, nums, 0)           # 10
```

**Nested / conditional in comprehension:**
```python
flat = [x for row in matrix for x in row]                # flatten
labeled = ["high" if c["cvss"] >= 7 else "low" for c in cves]
```

---

### Q32. Unpacking — tuple, star, dict.

**Say it out loud:** "Python unpacks iterables into names positionally, with `*` to grab 'the rest', and `**` for dicts. Great for clean, intention-revealing code — swapping, splitting, merging."

```python
a, b = b, a                       # swap, no temp
first, *rest = [1, 2, 3, 4]       # first=1, rest=[2,3,4]
*init, last = [1, 2, 3, 4]        # init=[1,2,3], last=4
x, (y, z) = 1, (2, 3)             # nested

merged = {**defaults, **overrides}        # dict merge (or defaults | overrides, 3.9+)
combined = [*list_a, *list_b]             # list merge
```

---

<a name="8-data-model-dunders"></a>
## 8. Data Model / Dunder Methods, Dataclasses, Enum

### ⭐ Q33. The key dunder methods — what do they do?

**Say it out loud:** "Dunder ('double underscore') methods are how your objects hook into Python's syntax and built-ins — they're the 'data model.' The important ones:
- `__init__` — initializer (not the constructor; `__new__` is).
- `__repr__` — unambiguous developer-facing string (for debugging/REPL); aim to make it eval-able.
- `__str__` — readable user-facing string; falls back to `__repr__` if absent.
- `__eq__` — value equality (`==`).
- `__hash__` — lets the object be a dict key / set member; must be consistent with `__eq__`.
- `__len__` — `len(obj)`.
- `__getitem__` / `__setitem__` — indexing `obj[key]`.
- `__call__` — makes the instance callable like a function.
- `__iter__` / `__next__` — iteration.
- arithmetic/comparison dunders — `__add__`, `__lt__`, etc. → operator overloading."

```python
class CVE:
    def __init__(self, cve_id, cvss):
        self.cve_id, self.cvss = cve_id, cvss
    def __repr__(self):
        return f"CVE(cve_id={self.cve_id!r}, cvss={self.cvss})"   # dev
    def __str__(self):
        return f"{self.cve_id} (CVSS {self.cvss})"                 # user
    def __eq__(self, other):
        return isinstance(other, CVE) and self.cve_id == other.cve_id
    def __hash__(self):
        return hash(self.cve_id)        # consistent with __eq__
    def __lt__(self, other):            # enables sorting by cvss
        return self.cvss < other.cvss
```

---

### ⭐ Q34. `__eq__` and `__hash__` — why must they go together?

**Say it out loud:** "The contract: if `a == b`, then `hash(a) == hash(b)`. Sets and dicts find items by hashing to a bucket, then comparing with `==`. If two equal objects hash differently they'd land in different buckets and the set would think they're distinct — silent bugs. So if I override `__eq__`, I must override `__hash__` consistently. Note: defining `__eq__` *without* `__hash__` makes the class **unhashable** by default — Python sets `__hash__ = None` to protect you."

---

### Q35. `__repr__` vs `__str__` — which and when?

**Say it out loud:** "`__repr__` is for developers — unambiguous, ideally something you could paste back to recreate the object — and it's what the REPL and containers show. `__str__` is for end users — readable. If I only write one, I write `__repr__`, because `str()` falls back to it. So `__repr__` is the higher-value one to always define."

---

### Q36. `__call__` — making an instance callable.

```python
class RateLimiter:
    def __init__(self, max_per_sec): self.max_per_sec = max_per_sec
    def __call__(self, func):
        # ... wrap with rate limiting ...
        return func

limit = RateLimiter(10)
@limit               # works because the instance is callable
def fetch(): ...
```
**Say it out loud:** "`__call__` lets an instance be invoked like a function — useful for stateful callables and class-based decorators, where the object carries config and the call does the work."

---

### ⭐ Q37. Dataclasses vs namedtuple vs Enum.

**Say it out loud:** "Three ways to model data:
- **`@dataclass`** — auto-generates `__init__`, `__repr__`, `__eq__` from annotated fields. Mutable by default, `frozen=True` for immutable+hashable. My default for plain data-holding classes — kills boilerplate.
- **`namedtuple`** — lightweight **immutable** record, tuple under the hood, supports `.field` access and unpacking. Tiny memory footprint. (Or `typing.NamedTuple` for the typed, class-based form.)
- **`Enum`** — a set of named constant values; use instead of magic strings/ints for fixed choices like severity levels."

```python
from dataclasses import dataclass, field
from enum import Enum
from collections import namedtuple

@dataclass(frozen=True, slots=True)        # immutable + hashable + memory-lean
class CVE:
    cve_id: str
    cvss: float
    tags: list[str] = field(default_factory=list)   # mutable default, done right

Point = namedtuple("Point", ["x", "y"])
p = Point(1, 2); p.x          # 1, and unpacks: x, y = p

class Severity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

Severity.HIGH.value           # "high"
Severity("high")              # Severity.HIGH  (lookup by value)
```

**Gotcha:** dataclass mutable defaults need `field(default_factory=list)` — same trap as mutable default args, and the dataclass decorator actually errors if you write `tags: list = []` directly. Good thing to mention.

---

<a name="9-oop"></a>
## 9. OOP — The 4 Pillars, MRO, super, Methods, Properties, ABCs (Tech Round 1)

### ⭐ Q38. The 4 pillars of OOP — with Python examples.

**Say it out loud:** "Four pillars: encapsulation, inheritance, polymorphism, abstraction.

**Encapsulation** — bundle data and the methods that operate on it, and control access. Python uses convention, not hard enforcement: `_name` means 'internal, hands off', `__name` triggers name-mangling. Properties let me expose controlled access.

**Inheritance** — a subclass reuses and extends a base class — `is-a`.

**Polymorphism** — different types respond to the same interface; in Python this is largely **duck typing** — if it has the method, it works, regardless of type.

**Abstraction** — hide implementation behind a clean interface; abstract base classes define *what* without the *how*."

```python
from abc import ABC, abstractmethod

# Abstraction + the contract
class SecretStore(ABC):
    @abstractmethod
    def get(self, key: str) -> str: ...
    @abstractmethod
    def put(self, key: str, value: str) -> None: ...

# Inheritance + Encapsulation
class PostgresStore(SecretStore):
    def __init__(self, dsn):
        self._dsn = dsn          # "internal"
    def get(self, key): ...      # concrete impl
    def put(self, key, value): ...

class VaultStore(SecretStore):
    def get(self, key): ...
    def put(self, key, value): ...

# Polymorphism — same call, different backends (duck typing too)
def rotate(store: SecretStore, key):
    store.put(key, generate())   # works for any SecretStore
```

**Tie-in:** "In Secret Vault I used exactly this — a `SecretStore` interface with swappable backends, so the API code is polymorphic over the storage implementation."

---

### Q39. Encapsulation in Python — public, `_protected`, `__private`, name mangling.

**Say it out loud:** "Python has no true private. It's conventions plus one mechanism:
- **public** — normal name.
- **`_single`** — 'protected by convention,' internal use; tools and humans treat it as off-limits.
- **`__double`** — triggers **name mangling**: `__x` in class `C` becomes `_C__x`, which avoids accidental name clashes in subclasses. It's not security — you can still reach `_C__x` — it's collision avoidance."

```python
class Account:
    def __init__(self):
        self.owner = "public"
        self._cache = "internal"
        self.__token = "mangled"     # -> self._Account__token

a = Account()
a.__token          # AttributeError
a._Account__token  # works — proves it's not real privacy
```

---

### ⭐ Q40. `@classmethod` vs `@staticmethod` vs instance method.

**Say it out loud:**
- "**Instance method** — takes `self`, operates on a specific instance.
- **`@classmethod`** — takes `cls` instead of `self`, operates on the class; the classic use is an **alternative constructor / factory** (`from_json`, `from_config`).
- **`@staticmethod`** — takes neither; it's just a plain function namespaced inside the class because it's logically related but doesn't touch instance or class state."

```python
class CVE:
    def __init__(self, cve_id, cvss):
        self.cve_id, self.cvss = cve_id, cvss

    @classmethod
    def from_nvd(cls, payload: dict):           # alternative constructor
        return cls(payload["id"], payload["metrics"]["cvss"])

    @staticmethod
    def is_critical(cvss: float) -> bool:        # no self/cls needed
        return cvss >= 9.0

cve = CVE.from_nvd(nvd_json)        # factory, returns a CVE (or subclass!)
CVE.is_critical(9.8)               # utility
```

**Why classmethod factories beat hardcoding the class:** "`cls(...)` respects subclasses — if `EnterpriseCVE` subclasses `CVE`, `EnterpriseCVE.from_nvd(...)` returns an `EnterpriseCVE`. Hardcoding `CVE(...)` wouldn't."

---

### ⭐ Q41. `@property` / getters and setters.

**Say it out loud:** "`@property` turns a method into a computed attribute, so callers write `obj.x` but a method runs underneath. It's the Pythonic way to add validation or computed values *without* breaking the existing attribute interface — you start with a plain attribute and upgrade to a property later, no caller changes. Setters add validation on assignment."

```python
class Secret:
    def __init__(self, value):
        self._value = value

    @property
    def value(self):                 # getter:  s.value
        return decrypt(self._value)

    @value.setter
    def value(self, new):            # setter:  s.value = "x"
        if not new:
            raise ValueError("empty secret")
        self._value = encrypt(new)

    @property
    def masked(self):                # computed, read-only
        return "****"
```

---

### ⭐ Q42. `super()`, MRO, and multiple inheritance.

**Say it out loud:** "`super()` calls the next method in the **MRO** — the Method Resolution Order — not literally 'the parent.' With single inheritance that *is* the parent. With multiple inheritance it's whatever the MRO says comes next, and Python computes the MRO with the **C3 linearization** algorithm, which gives a consistent left-to-right, depth-respecting order with no class appearing before its subclasses. `super().__init__()` is how cooperative multiple inheritance passes initialization along the chain. You can inspect it with `Cls.__mro__` or `Cls.mro()`."

```python
class A:
    def __init__(self): print("A"); super().__init__()
class B(A):
    def __init__(self): print("B"); super().__init__()
class C(A):
    def __init__(self): print("C"); super().__init__()
class D(B, C):
    def __init__(self): print("D"); super().__init__()

D()                 # prints D, B, C, A  — diamond resolved once via MRO
print(D.__mro__)    # [D, B, C, A, object]
```

**The diamond problem:** "D inherits from B and C which both inherit A. Naive inheritance could call A twice. C3 linearization gives one consistent order — `D → B → C → A → object` — and cooperative `super()` calls each exactly once. That's why you use `super()` instead of naming base classes directly."

---

### Q43. Abstract base classes (`abc`) and duck typing — when each?

**Say it out loud:** "**ABCs** (`abc.ABC` + `@abstractmethod`) define an explicit contract — you *can't instantiate* a subclass until it implements every abstract method, so they catch missing methods at construction time. Good when you want an enforced interface. **Duck typing** is the looser Python default — 'if it walks like a duck...': don't check the type, just call the method and let it work if the object supports it. ABCs give safety and clarity for plugin-style interfaces; duck typing gives flexibility. I reach for an ABC when I have several interchangeable implementations I want to keep honest — like the `SecretStore` backends."

```python
from abc import ABC, abstractmethod

class Embedder(ABC):                  # TARA RAG: pluggable embedders
    @abstractmethod
    def embed(self, text: str) -> list[float]: ...

class OllamaEmbedder(Embedder):
    def embed(self, text): ...         # must implement or can't instantiate
```

---

### ⭐ Q44. Composition vs inheritance — which and why?

**Say it out loud:** "**Inheritance** is an `is-a` relationship; **composition** is `has-a` — you build behavior by holding other objects rather than subclassing. The guidance — 'favor composition over inheritance' — is because deep inheritance hierarchies get rigid and fragile (the fragile base class problem), while composition keeps pieces loosely coupled and swappable. I use inheritance for genuine `is-a` with a shared interface, and composition when I'm assembling capabilities. In TARA, a `RAGPipeline` *has-a* retriever, *has-a* embedder, *has-a* generator — composition — so I can swap any piece without touching a class hierarchy."

```python
class RAGPipeline:                    # composition: has-a
    def __init__(self, retriever, embedder, generator):
        self.retriever = retriever
        self.embedder = embedder
        self.generator = generator
    async def answer(self, query):
        vec = self.embedder.embed(query)
        ctx = await self.retriever.search(vec)
        return await self.generator.generate(query, ctx)
```

---

### Q45. `__slots__` — what and why?

**Say it out loud:** "By default every instance stores attributes in a per-instance `__dict__`, which is flexible but costs memory and a dict lookup. `__slots__` declares a fixed set of attributes, so Python skips the `__dict__` and stores them in a compact array-like layout. Two wins: **less memory per instance** and slightly **faster attribute access** — meaningful when you create millions of small objects, like CVE records during a sync. Trade-off: you can't add new attributes not in `__slots__`, and you lose `__dict__`."

```python
class CVE:
    __slots__ = ("cve_id", "cvss")    # no per-instance __dict__
    def __init__(self, cve_id, cvss):
        self.cve_id, self.cvss = cve_id, cvss

c = CVE("CVE-2024-0001", 9.8)
c.extra = 1     # AttributeError — not in __slots__
```

**Numbers framing:** "For a sync materializing hundreds of thousands of CVE objects, `__slots__` can cut per-object memory substantially `[fill in: ~40-50% per object]` — worth it at that scale."

---

<a name="10-typing-pydantic"></a>
## 10. Typing & Pydantic

### Q46. Type hints — and are they enforced at runtime?

**Say it out loud:** "Type hints annotate expected types. They are **not enforced at runtime** by Python itself — they're for tooling: static checkers like **mypy**/pyright catch type errors before you run, IDEs use them for autocomplete, and libraries like Pydantic and FastAPI *do* read them at runtime to drive validation. So hints are documentation + a static safety net, and frameworks opt into runtime use."

```python
from typing import Optional, Union

def get(key: str, default: Optional[str] = None) -> str | None:
    ...
# Optional[str] == str | None == Union[str, None]
```

---

### Q47. Optional, Union, Generics, Protocol.

**Say it out loud:**
- "**`Optional[X]`** = `X | None`. **`Union[A, B]`** = either type (`A | B` in modern syntax).
- **Generics** — `list[int]`, `dict[str, CVE]`, or your own via `TypeVar`/`Generic` — parameterize over types for reusable, type-safe containers.
- **`Protocol`** — *structural* typing: defines an interface by the methods/attributes an object has, not by inheritance. It's static-checker-friendly duck typing — 'anything with an `embed` method satisfies `Embedder`' without subclassing."

```python
from typing import TypeVar, Generic, Protocol

T = TypeVar("T")
class Repository(Generic[T]):              # generic container
    def get(self, id: int) -> T | None: ...

class SupportsEmbed(Protocol):             # structural / duck-typed interface
    def embed(self, text: str) -> list[float]: ...

def run(e: SupportsEmbed): e.embed("hi")   # any object with embed() passes mypy
```

---

### ⭐ Q48. Pydantic — what it gives you, tie to FastAPI.

**Say it out loud:** "Pydantic does runtime data validation and parsing driven by type hints. You declare a model with typed fields; Pydantic coerces and validates incoming data, raising clear errors on bad input, and serializes back out. FastAPI uses it for the whole request/response cycle: declare a model as the body type and you get automatic validation, typed access, and auto-generated OpenAPI docs. Pydantic v2's core is in Rust, so it's fast. In Secret Vault and TARA, Pydantic models are the API contract — invalid requests are rejected at the boundary before any business logic runs."

```python
from pydantic import BaseModel, Field, field_validator

class CVEIn(BaseModel):
    cve_id: str = Field(pattern=r"^CVE-\d{4}-\d+$")
    cvss: float = Field(ge=0, le=10)
    tags: list[str] = []

    @field_validator("cve_id")
    @classmethod
    def upper(cls, v): return v.upper()

CVEIn(cve_id="cve-2024-1", cvss=9.8)     # validates, coerces, normalizes
CVEIn(cve_id="bad", cvss=99)             # ValidationError with field details
```

---

<a name="11-memory-internals"></a>
## 11. Memory & Internals — Refcounting, GC, Interning, Copy

### ⭐ Q49. How does Python manage memory / garbage collection?

**Say it out loud:** "CPython's primary mechanism is **reference counting**: every object tracks how many references point to it, and the instant that count hits zero the object is freed — immediately, deterministically. The problem refcounting can't solve alone is **reference cycles** — A points to B, B points to A, so neither count ever reaches zero even when nothing else references them. For that, CPython has a separate **cyclic garbage collector** that periodically finds and collects unreachable cycles. So: refcounting for the common case (immediate), cyclic GC as backstop for cycles."

**Bonus to drop:** "The GIL ties in here — refcount updates aren't thread-safe, and the GIL is what protects them, which is one of the core reasons the GIL exists."

```python
import sys, gc
x = []
sys.getrefcount(x)     # refcount (slightly inflated by the call itself)
gc.collect()           # manually trigger cyclic collection
```

---

### Q50. Interning — what is it?

**Say it out loud:** "Interning is caching certain immutable objects so identical values share one object in memory. CPython interns small integers (`-5` to `256`) and many short strings (identifier-like ones), so `a is b` can be `True` for them. It saves memory and speeds equality checks. The practical takeaway is the trap: **don't rely on `is` for value comparison** — interning is an implementation detail that varies, so `257 is 257` may be `False` while `256 is 256` is `True`."

---

### ⭐ Q51. Deep vs shallow copy.

**Say it out loud:** "A **shallow copy** makes a new outer object but shares the *inner* objects — so mutating a nested list shows up in both copies. A **deep copy** recursively copies everything, fully independent. The distinction only matters for nested mutable structures. `copy.copy` is shallow, `copy.deepcopy` is deep; deepcopy is correct but slower, so I use it only when I genuinely need full independence."

```python
import copy
original = {"tags": ["a", "b"]}

shallow = copy.copy(original)
shallow["tags"].append("c")
original["tags"]              # ['a', 'b', 'c']  <- shared inner list!

deep = copy.deepcopy(original)
deep["tags"].append("z")
original["tags"]              # unchanged — fully independent
```

---

<a name="12-errors"></a>
## 12. Errors & Exceptions, EAFP vs LBYL

### Q52. try/except/else/finally — what's each clause for?

**Say it out loud:**
- "**`try`** — the code that might fail.
- **`except`** — handle specific exceptions (catch narrow types, not bare `except:`).
- **`else`** — runs only if **no** exception occurred; keeps the success path out of the `try`, so you don't accidentally catch exceptions from it.
- **`finally`** — always runs, exception or not — cleanup that must happen (close, release)."

```python
try:
    resp = fetch_cve_page(idx)
except (ConnectionError, TimeoutError) as e:
    log.warning("network issue: %s", e)
    raise
except ValueError as e:
    log.error("bad payload: %s", e)
else:
    save(resp)              # only if fetch succeeded
finally:
    metrics.record(idx)     # always
```

---

### Q53. Custom exceptions — why and how?

**Say it out loud:** "Custom exceptions give callers something specific to catch and make error handling self-documenting. I subclass `Exception` (or a relevant built-in), usually under one app-level base so callers can catch broadly or narrowly. In the VMS sync I had things like `NVDRateLimitError` and `SyncBatchError` so the orchestration could retry rate limits but fail fast on real bugs."

```python
class VMSError(Exception):
    """Base for all VMS errors."""

class NVDRateLimitError(VMSError):
    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__(f"rate limited, retry after {retry_after}s")
```

---

### ⭐ Q54. EAFP vs LBYL?

**Say it out loud:** "**EAFP** — 'Easier to Ask Forgiveness than Permission' — just try the operation and handle the exception if it fails. **LBYL** — 'Look Before You Leap' — check preconditions first with `if`s. Python idiomatically prefers **EAFP**: it's cleaner, and it avoids a race condition where the state changes between your check and your use (TOCTOU). Classic example: dict access."

```python
# LBYL — has a race window, two lookups
if "cvss" in data:
    score = data["cvss"]

# EAFP — Pythonic, one lookup, atomic
try:
    score = data["cvss"]
except KeyError:
    score = None
# or just: score = data.get("cvss")
```

---

<a name="13-performance"></a>
## 13. Performance — Big-O, Containers, Profiling, Caching

### ⭐ Q55. Big-O of common list / dict / set operations.

**Say it out loud:** "The headline: **dict and set lookups are O(1)** (hash tables), **list membership `in` is O(n)** (linear scan). So if I'm checking membership repeatedly, I convert a list to a set first — that single change turns an O(n²) loop into O(n)."

| Operation | list | dict | set |
|---|---|---|---|
| index `a[i]` | O(1) | — | — |
| `key in` / lookup | **O(n)** | **O(1)** | **O(1)** |
| append / add | O(1)* | O(1) | O(1) |
| insert/delete at front | O(n) | — | — |
| delete by key | O(n) | O(1) | O(1) |

\* amortized. **`collections.deque`** gives O(1) appends/pops at *both* ends.

**The optimization to mention:**
```python
# O(n*m): list membership inside a loop
seen = [...]
dupes = [x for x in new if x in seen]          # slow

# O(n+m): set membership
seen = set(existing_ids)
dupes = [x for x in new if x in seen]          # fast — VMS-style dedup
```

---

### Q56. Which container when?

**Say it out loud:**
- "**list** — ordered, indexed, allows duplicates; default sequence.
- **tuple** — immutable list; fixed records, hashable so usable as dict keys.
- **set** — unique elements, O(1) membership and set algebra (union/intersection); use for dedup and 'is X in this collection.'
- **dict** — key→value, O(1) lookup, insertion-ordered since 3.7; the workhorse.
- **deque** — O(1) at both ends; queues, sliding windows, bounded buffers."

---

### ⭐ Q57. How would you profile and speed up slow Python? ("make this faster")

**Say it out loud:** "First rule: **measure, don't guess.** I profile with **`cProfile`** to find where time actually goes — the bottleneck is rarely where you'd expect. For line-level detail I use `line_profiler`; for memory, `tracemalloc` or `memory_profiler`. Once I know the hotspot, the toolbox is: better algorithm/data structure (the list→set fix), avoid redundant work (caching with `lru_cache`), batch I/O and DB calls, use generators to cut memory, parallelize I/O (threads/async) or CPU (multiprocessing), and push hot loops into NumPy/vectorized or C-backed libs. That measure-first approach is exactly how I found VMS's two bottlenecks — serial network I/O and per-row DB writes."

```python
import cProfile, pstats
cProfile.run("run_sync()", "stats.out")
pstats.Stats("stats.out").sort_stats("cumulative").print_stats(15)
```

---

### ⭐ Q58. Caching with `functools.lru_cache`.

**Say it out loud:** "`@functools.lru_cache` memoizes a function's results keyed by its arguments — repeat calls with the same args return instantly from cache instead of recomputing. It's an LRU cache, so `maxsize` bounds memory. Perfect for pure, deterministic, expensive functions with repeated inputs. Constraint: arguments must be **hashable** (no lists/dicts as args). `functools.cache` (3.9+) is the unbounded version."

```python
import functools

@functools.lru_cache(maxsize=1024)
def severity_label(cvss: float) -> str:
    # expensive/pure computation, repeated inputs
    ...

severity_label.cache_info()    # hits, misses, size — great for tuning
```

**Tie-in:** "In TARA I cache deterministic lookups so the RAG pipeline doesn't recompute the same derived values per request."

---

<a name="14-stdlib"></a>
## 14. Stdlib Gems — collections, itertools, functools, pathlib

### Q59. `collections` — the ones to know.

**Say it out loud:** "Three I reach for constantly:
- **`defaultdict`** — a dict that auto-creates a default for missing keys, so I skip the `if key not in d` dance — great for grouping.
- **`Counter`** — counts occurrences in one line, with `.most_common()`.
- **`deque`** — O(1) appends/pops at both ends; queues and sliding windows."

```python
from collections import defaultdict, Counter, deque

# group CVEs by severity
groups = defaultdict(list)
for c in cves:
    groups[c.severity].append(c.cve_id)

Counter(c.severity for c in cves).most_common(3)   # top severities

dq = deque(maxlen=100)     # bounded buffer; old items drop off
dq.append(x)
```

---

### Q60. `itertools` and `functools` highlights.

**Say it out loud:** "`itertools` gives memory-efficient, lazy iterator building blocks — `chain`, `islice`, `groupby`, `product`, `count`, `cycle`, and crucially **`batched`** (3.12+) for chunking, which is exactly what you want for batched API/DB calls. `functools` has `lru_cache`/`cache`, `partial` (pre-fill arguments), `reduce`, and `wraps` for decorators."

```python
from itertools import islice, chain
from functools import partial

def batched(iterable, n):              # pre-3.12 version
    it = iter(iterable)
    while chunk := list(islice(it, n)):
        yield chunk

for page_batch in batched(range(0, 200_000, 2000), 10):
    fetch_concurrently(page_batch)     # VMS-style: chunk then parallelize

get_json = partial(requests.get, headers={"apiKey": KEY})  # pre-bind args
```

---

### Q61. `pathlib`.

**Say it out loud:** "`pathlib` is the modern, object-oriented way to handle filesystem paths — cross-platform, no manual string joining or `os.path`. Operator `/` joins paths, and `Path` objects have readable methods."

```python
from pathlib import Path
config = Path(__file__).parent / "config" / "nvd.yaml"
if config.exists():
    text = config.read_text()
for py in Path("src").rglob("*.py"):
    ...
```

---

<a name="15-followups"></a>
## 15. Likely Follow-ups (live coding)

### ⭐ Q62. "Write a thread-safe counter." → see Q9.
Lead with: "`+=` isn't atomic — read-modify-write — so I guard it with a `threading.Lock` in a `with` block, or use a `queue.Queue` / `itertools.count` to sidestep shared state entirely."

### ⭐ Q63. "Explain a decorator you actually wrote."
**Say it out loud:** "In VMS I wrote a `@retry` decorator with backoff around the NVD API calls — transient `429`s and timeouts shouldn't fail the whole sync. It's a decorator-with-arguments: outer takes `times`/`delay`/`exceptions`, middle takes the function, inner is the wrapper that loops, catches the listed exceptions, sleeps with increasing backoff, and re-raises on the final attempt. `functools.wraps` preserves the wrapped function's identity." *(Code in Q26.)*

### ⭐ Q64. "Why is my threaded CPU code not faster?" → see Q10.
"GIL. Switch to `multiprocessing`/`ProcessPoolExecutor` for real cores, or move the work into a GIL-releasing C lib."

### ⭐ Q65. "Make this slow function faster."
"Profile first with `cProfile` to find the real hotspot. Then, in order of usual payoff: pick the right data structure (list→set for membership), cache pure functions with `lru_cache`, batch I/O and DB calls, use generators for memory, and parallelize — threads/async for I/O, processes for CPU. Don't optimize blind."

### Q66. "Process a 50GB file that won't fit in memory."
"Stream it — never load it all. A generator yielding line by line (or fixed-size chunks) keeps memory constant. Combine with `itertools.batched` to write to the DB in bulk batches as I go." *(Generators in Q27.)*

### Q67. "Two services need the same heavy computed value per request — how do you avoid recomputing?"
"`functools.lru_cache` if it's pure and the inputs are hashable; an external cache (Redis) if it must be shared across processes/workers or persist."

---

<a name="16-cheat-sheet"></a>
## 16. Rapid-fire Cheat Sheet

| Prompt | One-liner answer |
|---|---|
| GIL | One thread runs Python bytecode at a time per process; protects refcounts. |
| Threads good for | I/O-bound (GIL releases on I/O). Overlap *waiting*, not *computing*. |
| Multiprocessing good for | CPU-bound; own GIL per process → real parallel cores. |
| Asyncio good for | High-concurrency I/O with async-native libs; single thread, event loop. |
| Why FastAPI async | Overlap I/O across requests on one worker — `await` real async I/O. |
| `async def` route vs `def` | async for async-native I/O; plain `def` (FastAPI threadpools it) for blocking libs. |
| When async hurts | CPU-bound or blocking calls freeze the loop → `asyncio.to_thread`/process pool. |
| `asyncio.gather` | Run awaitables concurrently, results in input order; `return_exceptions=True`. |
| `is` vs `==` | `is` = identity (same object), `==` = value. `is` only for `None`/singletons. |
| Mutable default trap | Evaluated once → shared. Use `None` sentinel. |
| LEGB | Local → Enclosing → Global → Built-in. `nonlocal`/`global` to rebind. |
| Closure | Inner fn remembers enclosing vars after outer returns. |
| Decorator | `func = deco(func)`; wrap to add behavior. Use `functools.wraps`. |
| Generator / yield | Lazy, one item at a time, constant memory; `()` = gen expr. |
| Context manager | `with`; `__enter__`/`__exit__` guarantee cleanup even on error. |
| `__eq__`/`__hash__` | Override together; equal ⇒ equal hashes; `__eq__` alone → unhashable. |
| `__repr__` vs `__str__` | repr=dev/unambiguous, str=user/readable; define repr at least. |
| classmethod vs staticmethod | `cls` (factories) vs neither (namespaced utility). |
| `@property` | Method that acts like an attribute; validation/computed values. |
| `super()` / MRO | Next in MRO (C3 linearization), not literally parent. |
| Composition vs inheritance | has-a vs is-a; favor composition for flexibility. |
| `__slots__` | Fixed attrs, no `__dict__` → less memory, faster access. |
| Duck typing | If it has the method, it works — don't check type. |
| Memory mgmt | Refcounting (immediate) + cyclic GC (cycles). |
| Deep vs shallow copy | shallow shares inner objects; deep copies recursively. |
| EAFP vs LBYL | try/except vs check-first; Python prefers EAFP. |
| dict/set lookup | O(1); list `in` is O(n) → use a set. |
| `lru_cache` | Memoize pure fns; hashable args; bounded by `maxsize`. |
| Pydantic | Runtime validation from type hints; FastAPI's request/response contract. |
| Type hints enforced? | No, not at runtime by Python; mypy/Pydantic/FastAPI use them. |
| VMS win | I/O-bound NVD calls → threads+batching; per-row → bulk ops. 16–18h → ~4h. |

---

<a name="17-traps"></a>
## 17. Traps & Gotchas (the ones interviewers spring)

1. **Mutable default argument** — `def f(x, acc=[])` shares one list across calls. Use `None` sentinel. *(Same trap in dataclass fields → `field(default_factory=...)`.)*
2. **`is` on numbers/strings** — works for small ints/interned strings, breaks otherwise (`257 is 257` → often `False`). Use `==`.
3. **Late-binding closures in loops** — `[lambda: i for i in range(3)]` all return `2`. Bind with `lambda i=i: i`.
4. **`UnboundLocalError`** — assigning to a name anywhere in a function makes it local for the *whole* function; reading it before assignment errors. Use `global`/`nonlocal`.
5. **Threaded CPU code isn't faster** — GIL. Use processes (or GIL-releasing C libs).
6. **Blocking call inside `async def`** — freezes the entire event loop. Use `asyncio.to_thread` / a process pool, or a plain `def` FastAPI route.
7. **Forgetting `await`** — you get a coroutine object, not a result; "coroutine was never awaited" warning.
8. **`async def` route + blocking lib** — worse than a sync route. Match async routes with async-native clients (`httpx`, `asyncpg`).
9. **`__eq__` without `__hash__`** — Python sets `__hash__ = None`; the object becomes unhashable (can't go in a set/dict key).
10. **Shallow copy of nested structures** — inner objects are shared; mutations leak. Use `deepcopy` when you need independence.
11. **`gather` default error behavior** — one task raising propagates; siblings keep running detached. Use `return_exceptions=True` or a `TaskGroup`.
12. **`+=` is not atomic** — read-modify-write; race condition across threads. Lock it.
13. **List membership in a loop** — O(n²). Convert to a set for O(1) lookups.
14. **`requests`/`time.sleep`/`psycopg2` in async code** — silent loop-blockers; they look fine but kill concurrency.
15. **`ProcessPoolExecutor` + lambdas/closures** — not picklable → fails. On Windows, guard with `if __name__ == "__main__":`.
16. **Mutating a list while iterating it** — skips elements / undefined behavior. Iterate a copy or build a new list.
17. **Comparing floats with `==`** — precision; use `math.isclose`.
18. **`from x import *` and bare `except:`** — anti-patterns; catch specific exceptions, import explicitly.

---

### Closing framing for the interviewer

> "My instinct on any performance problem is: **classify the workload first** — I/O-bound or CPU-bound — because that one decision picks the tool. I/O-bound → threads or asyncio to overlap the waiting; CPU-bound → multiprocessing for real cores; and always **profile before optimizing**. That's exactly the playbook that took the VMS NVD sync from 16–18 hours to about 4 — concurrent, batched I/O for the network side and bulk operations for the database side."
