# Python Question Bank (with Django/DRF)

> Drill: cover the answer, say it out loud, then check. ⭐ = very likely asked.

## Core language

**⭐ Mutable vs immutable types?**
Immutable: `int, float, str, tuple, frozenset, bool, bytes`. Mutable: `list, dict, set, bytearray`. Immutable objects can't be changed in place — operations create new objects. Matters for: dict keys (must be hashable/immutable), default args, and aliasing bugs.

**⭐ The mutable default argument trap?**
```python
def add(x, items=[]):   # BUG: list created ONCE at def time, shared across calls
    items.append(x); return items
add(1) # [1]
add(2) # [1, 2]  <-- surprise
```
Fix: `def add(x, items=None): items = items or []`.

**⭐ `is` vs `==`?**
`==` compares values; `is` compares identity (same object in memory). Use `is` only for `None`/singletons. Gotcha: small ints (−5..256) and short strings are interned/cached, so `is` may *accidentally* work — don't rely on it.

**Shallow vs deep copy?**
`copy.copy()` copies the outer object but shares nested references; `copy.deepcopy()` recursively copies everything. `list2 = list1[:]` is shallow.

**⭐ `*args` and `**kwargs`?**
`*args` collects extra positional args into a tuple; `**kwargs` collects extra keyword args into a dict. Used for flexible signatures and forwarding: `def wrapper(*args, **kwargs): return fn(*args, **kwargs)`.

**⭐ Decorators — what and why?**
A function that takes a function and returns a modified function; adds behavior without changing the original (logging, timing, auth, caching). Use `@functools.wraps` to preserve the wrapped function's metadata.
```python
import functools
def timer(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        import time; t=time.time()
        r = fn(*args, **kwargs)
        print(f"{fn.__name__} took {time.time()-t:.3f}s")
        return r
    return wrapper
```

**⭐ Generators / `yield`?**
A function with `yield` returns a generator — produces values lazily, one at a time, keeping state between calls. Memory-efficient for large/infinite sequences. `next()` resumes execution. Generator expression: `(x*x for x in range(10))`. vs list comp which builds the whole list in memory.

**⭐ Context managers / `with`?**
Guarantees setup/teardown (e.g., closing files, releasing locks) even if an exception occurs. Implemented via `__enter__`/`__exit__`, or `@contextlib.contextmanager` with a generator. `with open(f) as fh:` auto-closes.

**Closures?**
A nested function that captures variables from its enclosing scope and remembers them after the outer function returns. Basis of decorators.

**⭐ The GIL (Global Interpreter Lock)?**
A mutex that lets only one thread execute Python bytecode at a time in CPython. So threads don't give true parallelism for CPU-bound work — use `multiprocessing` (separate processes) for CPU-bound, `threading`/`asyncio` for I/O-bound (where threads release the GIL while waiting).

**`@classmethod` vs `@staticmethod` vs instance method?**
Instance method: takes `self`. `@classmethod`: takes `cls`, can access/modify class state, used for alternative constructors (`from_dict`). `@staticmethod`: takes neither, just a namespaced utility function.

**List comprehension vs map/filter?**
Comprehensions are more readable/Pythonic: `[x*2 for x in nums if x>0]`. Equivalent: `list(map(lambda x:x*2, filter(lambda x:x>0, nums)))`. Comprehensions usually preferred.

**`@property`?**
Lets a method be accessed like an attribute, enabling computed attributes and validation without changing the API. Pair with `@x.setter`.

**Iterator vs iterable?**
Iterable: implements `__iter__` (can be looped). Iterator: implements `__next__` and `__iter__` (produces values, tracks position). `for` calls `iter()` then `next()` until `StopIteration`.

**Exception handling — `try/except/else/finally`?**
`else` runs if no exception; `finally` always runs (cleanup). Catch specific exceptions, not bare `except:`. Custom exceptions: subclass `Exception`.

**How is memory managed?**
Reference counting + a cyclic garbage collector for reference cycles. Objects freed when refcount hits 0.

**`__str__` vs `__repr__`?**
`__str__`: human-readable (for users, `print`). `__repr__`: unambiguous (for devs/debugging, ideally recreatable). If only one, define `__repr__`.

## OOP

**Four pillars + Python specifics?**
Encapsulation (`_protected`, `__name-mangled`), Inheritance, Polymorphism (duck typing — "if it quacks like a duck"), Abstraction (`abc.ABC`, `@abstractmethod`).

**MRO / multiple inheritance?**
Method Resolution Order — the order Python searches base classes (C3 linearization). `super()` follows the MRO, not just the direct parent. Check with `Cls.__mro__`.

**`__init__` vs `__new__`?**
`__new__` creates the instance (rarely overridden); `__init__` initializes it. `__new__` matters for immutables/singletons.

## Django / DRF (your strength — go deep)

**⭐ MVT pattern?**
Model (data/ORM), View (logic, receives request → returns response), Template (presentation). Django's "controller" is the framework/URL dispatcher.

**⭐ The N+1 query problem and the fix?**
Looping over objects and accessing a related field fires one query per object. Fix: `select_related('fk')` (SQL JOIN, for ForeignKey/OneToOne) and `prefetch_related('m2m')` (separate query + Python join, for ManyToMany/reverse FK).

**⭐ ORM: `select_related` vs `prefetch_related`?** (see above) — know *when* each applies. Also: `.only()`/`.defer()` to limit columns, `.annotate()`/`.aggregate()` for computed values, `Q` objects for complex OR queries, `F` objects for field-to-field/atomic updates.

**QuerySets are lazy — what does that mean?**
A QuerySet doesn't hit the DB until evaluated (iterated, sliced with step, `list()`, `len()`, bool). Lets you chain filters efficiently. Cache the result to avoid re-querying.

**⭐ DRF: serializer vs ModelSerializer?**
Serializers convert complex types ↔ JSON and handle validation. `ModelSerializer` auto-generates fields from a model. Validation: field-level `validate_<field>`, object-level `validate`.

**DRF: APIView vs ViewSet vs generic views?**
`APIView` = full control. Generic views = common patterns (`ListCreateAPIView`). `ViewSet` + Router = CRUD with minimal code, auto-routed URLs.

**⭐ Authentication: how does JWT work?**
Client logs in → server returns a signed access token (short-lived) + refresh token (long-lived). Client sends `Authorization: Bearer <token>` on each request; server verifies the signature (stateless, no DB session lookup). Refresh token gets new access tokens. Trade-off vs sessions: scalable/stateless but harder to revoke.

**Middleware?**
Hooks that process every request/response (auth, CORS, logging, security headers). Ordered; runs top-down on request, bottom-up on response.

**Migrations?**
`makemigrations` generates migration files from model changes; `migrate` applies them to the DB. Version-controlled schema changes.

**How do you secure a Django app?**
`DEBUG=False` in prod, `ALLOWED_HOSTS`, secrets in env vars (not code), CSRF protection, parameterized ORM (no SQL injection), HTTPS, `SECURE_*` settings, rate limiting, least-privilege DB user.

**WSGI vs ASGI?**
WSGI = synchronous interface (Gunicorn/uWSGI). ASGI = async-capable (Uvicorn/Daphne) for websockets/async views. Django supports both.

## DSA Big-O quick reference
| Op | Complexity |
|---|---|
| list index / append | O(1) |
| list insert/delete middle | O(n) |
| `x in list` | O(n) |
| dict/set lookup/insert | O(1) avg |
| sort | O(n log n) |
| nested loop over n | O(n²) |

**Common patterns:** hashmap for O(1) lookups (two-sum), two pointers (sorted arrays), sliding window (subarray/substring), recursion + memoization (DP).
