# Databases, SQL & Data Warehousing — Deep Interview Study File

> **Candidate:** Saiganesh — Engineer/Senior Engineer FullStack (React + Python/FastAPI, Cloud: Azure/AWS) @ Fractal Analytics, Fortune-500 "Data to Decision".
> **Stack anchor:** Postgres + pgvector.
> **Flagship projects woven throughout:**
> 1. **VMS** — Postgres; CPE↔CVE many-to-many join table; 3,500+ rows; sync 16–18h → 4h via indexing + killing N+1 + bulk ops. (indexing / query optimization / bulk writes)
> 2. **TARA Copilot** — Postgres + pgvector; embeddings, HNSW/IVFFlat, cosine distance. (vector DB inside Postgres)
> 3. **Secret Vault** — Postgres storing encrypted secrets + append-only audit log.
>
> ⭐ = very likely to be asked. `[fill in: ...]` = plug in a real verifiable number before the interview.

---

## Table of Contents
1. [SQL — JOINs ⭐](#1-sql--joins-)
2. [SQL — GROUP BY / HAVING / Aggregates ⭐](#2-sql--group-by--having--aggregates-)
3. [SQL — Window Functions ⭐](#3-sql--window-functions-)
4. [SQL — Subqueries, CTEs, Recursive CTEs](#4-sql--subqueries-ctes-recursive-ctes)
5. [SQL — Set Ops, CASE, NULL handling, DISTINCT, Pagination](#5-sql--set-ops-case-null-handling-distinct-pagination)
6. [SQL — Write-by-hand drills](#6-sql--write-by-hand-drills)
7. [Indexing & Performance ⭐](#7-indexing--performance-)
8. [The N+1 Problem & Fixes ⭐ (VMS)](#8-the-n1-problem--fixes--vms)
9. [Bulk Inserts/Updates & Connection Pooling](#9-bulk-insertsupdates--connection-pooling)
10. [pgvector specifics (TARA)](#10-pgvector-specifics-tara)
11. [Transactions & ACID ⭐](#11-transactions--acid-)
12. [Isolation Levels & Anomalies ⭐](#12-isolation-levels--anomalies-)
13. [Locking, Optimistic vs Pessimistic, Deadlocks](#13-locking-optimistic-vs-pessimistic-deadlocks)
14. [Normalization & Denormalization ⭐](#14-normalization--denormalization-)
15. [Keys & Constraints](#15-keys--constraints)
16. [SQL vs NoSQL & CAP ⭐](#16-sql-vs-nosql--cap-)
17. [OLTP vs OLAP ⭐ (JD)](#17-oltp-vs-olap--jd)
18. [Data Warehousing: schemas, ETL/ELT, columnar, lake/warehouse/lakehouse](#18-data-warehousing-schemas-etlelt-columnar-lakewarehouselakehouse)
19. [Caching (Redis) & Read Replicas](#19-caching-redis--read-replicas)
20. [Likely follow-ups (the "what do you do" questions)](#20-likely-follow-ups-the-what-do-you-do-questions)
21. [Rapid-fire cheat sheet](#21-rapid-fire-cheat-sheet)
22. [Traps & gotchas](#22-traps--gotchas)

---

## 1. SQL — JOINs ⭐

**⭐ Q: Explain the different JOIN types and give me a mental model.**

Out loud: "A JOIN combines rows from two tables based on a matching condition. My mental model is a Venn diagram of two sets, **left** and **right**:

- **INNER JOIN** — only rows where the condition matches in *both* tables. The intersection.
- **LEFT JOIN** (LEFT OUTER) — all rows from the left table, plus matching right rows; where there's no match the right columns come back `NULL`.
- **RIGHT JOIN** — mirror image: all rows from the right, `NULL`s on the left for non-matches. I usually just rewrite it as a LEFT join with the tables flipped because it reads more naturally.
- **FULL OUTER JOIN** — every row from both sides; `NULL`s fill wherever there's no match. The whole Venn diagram including both crescents.
- **CROSS JOIN** — Cartesian product, every left row paired with every right row. No condition. M×N rows. Useful for generating combinations or a date grid.
- **SELF JOIN** — a table joined to itself with aliases, e.g. an employees table joined to itself to pair each employee with their manager."

**Mental model trick:** INNER = match required on both sides. OUTER (LEFT/RIGHT/FULL) = "keep the unmatched rows from this side and pad with NULL."

```sql
-- INNER
SELECT u.id, o.id
FROM users u
INNER JOIN orders o ON o.user_id = u.id;

-- LEFT (users with or without orders)
SELECT u.id, o.id
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;

-- FULL OUTER
SELECT u.id, o.id
FROM users u
FULL OUTER JOIN orders o ON o.user_id = u.id;

-- CROSS (every product × every region)
SELECT p.name, r.name
FROM products p
CROSS JOIN regions r;

-- SELF (employee ↔ manager)
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

**⭐ Q: Resolve the CPE↔CVE many-to-many in VMS with a join query.**

Out loud: "In VMS, a **CVE** (a vulnerability) can affect many **CPEs** (configuration/platform identifiers — basically a product version), and any given CPE can be hit by many CVEs. That's a classic **many-to-many**, so you can't put a foreign key directly on either side. You introduce a **join table** (also called a bridge / associative / link table) — `cpe_cve` — that holds one row per (cpe_id, cve_id) pair. Each side has its own one-to-many to the join table, and together they express the M:N."

```sql
-- Schema sketch
CREATE TABLE cpe (
  id   BIGSERIAL PRIMARY KEY,
  uri  TEXT UNIQUE NOT NULL          -- e.g. cpe:2.3:a:nginx:nginx:1.21.0:*:*:*
);

CREATE TABLE cve (
  id        BIGSERIAL PRIMARY KEY,
  cve_id    TEXT UNIQUE NOT NULL,     -- e.g. CVE-2024-1234
  severity  TEXT,
  cvss      NUMERIC(3,1)
);

-- The bridge table
CREATE TABLE cpe_cve (
  cpe_id BIGINT NOT NULL REFERENCES cpe(id) ON DELETE CASCADE,
  cve_id BIGINT NOT NULL REFERENCES cve(id) ON DELETE CASCADE,
  PRIMARY KEY (cpe_id, cve_id)        -- composite PK prevents dup pairs + indexes (cpe_id, cve_id)
);
-- Add the reverse-direction index so lookups by cve_id are also fast:
CREATE INDEX idx_cpe_cve_cve_id ON cpe_cve (cve_id);
```

```sql
-- "Which CVEs affect this product (cpe uri)?"
SELECT c.cve_id, c.severity, c.cvss
FROM cpe
JOIN cpe_cve cc ON cc.cpe_id = cpe.id
JOIN cve c      ON c.id = cc.cve_id
WHERE cpe.uri = 'cpe:2.3:a:nginx:nginx:1.21.0:*:*:*'
ORDER BY c.cvss DESC NULLS LAST;

-- Reverse: "Which products are affected by this CVE?"
SELECT p.uri
FROM cve
JOIN cpe_cve cc ON cc.cve_id = cve.id
JOIN cpe p      ON p.id = cc.cpe_id
WHERE cve.cve_id = 'CVE-2024-1234';
```

**Why the composite PK + reverse index matters (and ties to the perf story):** the PK `(cpe_id, cve_id)` makes "all CVEs for a CPE" an index scan. But a B-tree on `(cpe_id, cve_id)` is *useless* for "all CPEs for a CVE" (wrong leading column), so I add `idx_cpe_cve_cve_id`. Before indexing those join columns, the sync did the lookups as sequential scans on a growing table — part of why it took 16–18h.

**Follow-up — "Why not store CVE ids as an array column on CPE?"** "Postgres *can* do `BIGINT[]` with a GIN index, and for read-mostly tagging it's fine. But the join table gives me referential integrity (FK both ways), per-pair metadata if I need it (e.g. `first_seen`, `source`), clean cascade deletes, and standard SQL joins. For a relational vulnerability model I want the integrity, so bridge table."

---

## 2. SQL — GROUP BY / HAVING / Aggregates ⭐

**⭐ Q: Explain GROUP BY, the aggregate functions, and WHERE vs HAVING.**

Out loud: "`GROUP BY` collapses rows that share the same value(s) in the grouping column(s) into a single row, and aggregate functions — `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` — compute one value per group. The key rule that trips people up: **every column in the SELECT must either be in the GROUP BY or be wrapped in an aggregate.**

`WHERE` and `HAVING` both filter, but at different stages: **WHERE filters individual rows *before* grouping; HAVING filters *groups* after aggregation.** So you can't reference an aggregate in WHERE — `WHERE COUNT(*) > 5` is illegal; that goes in HAVING. Rule of thumb: filter on raw columns in WHERE (it's cheaper, runs first, and can use indexes), filter on aggregates in HAVING."

**Logical order of evaluation** (worth saying — explains a lot of confusion):
`FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT`.
That's why a column alias defined in SELECT can't be used in WHERE (SELECT runs later) but *can* be used in ORDER BY.

```sql
-- Count vulnerabilities per severity, only severities with more than 100
SELECT severity,
       COUNT(*)              AS n,
       AVG(cvss)             AS avg_cvss,
       MAX(cvss)             AS worst,
       MIN(cvss)             AS least_bad
FROM cve
WHERE cvss IS NOT NULL          -- row filter, runs first
GROUP BY severity
HAVING COUNT(*) > 100           -- group filter, runs after aggregation
ORDER BY n DESC;
```

**Aggregate gotchas to mention:**
- `COUNT(*)` counts rows (including NULLs); `COUNT(col)` counts non-NULL values of `col`; `COUNT(DISTINCT col)` counts distinct non-NULL values.
- `AVG`, `SUM`, `MIN`, `MAX` all **ignore NULLs**. `AVG` over `[10, NULL, 20]` = 15, not 10.
- `SUM` over zero rows returns `NULL`, not `0` — wrap in `COALESCE(SUM(x), 0)` if you need a number.
- `FILTER` clause is a clean Postgres way to do conditional aggregates:
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE severity = 'CRITICAL') AS critical,
    COUNT(*) FILTER (WHERE severity = 'HIGH')     AS high
  FROM cve;
  ```

**Follow-up — "How would you get a count of CVEs per CPE in VMS?"**
```sql
SELECT cc.cpe_id, COUNT(*) AS cve_count
FROM cpe_cve cc
GROUP BY cc.cpe_id
HAVING COUNT(*) > 0
ORDER BY cve_count DESC
LIMIT 20;        -- top 20 most-vulnerable products
```

---

## 3. SQL — Window Functions ⭐

**⭐ Q: What are window functions and why are they powerful? (High yield for senior.)**

Out loud: "A window function computes a value across a set of rows *related to the current row*, **without collapsing the rows** like GROUP BY does. So you keep every row *and* get the aggregate/rank alongside it. The `OVER()` clause defines the 'window': `PARTITION BY` slices the data into groups, `ORDER BY` orders rows within each partition, and an optional frame clause (`ROWS BETWEEN ...`) controls which rows feed a running calc."

The mental model: GROUP BY = "fold the rows up." Window = "leave the rows, but let each row see its neighbors."

**The big ones:**

```sql
-- ROW_NUMBER, RANK, DENSE_RANK
SELECT
  name, dept, salary,
  ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn,
  RANK()       OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk,
  DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS dense
FROM employees;
```
- `ROW_NUMBER` — always unique 1,2,3,4 (arbitrary tie-break).
- `RANK` — ties share a rank, then it **skips**: 1,1,3.
- `DENSE_RANK` — ties share a rank, **no gaps**: 1,1,2.

```sql
-- LAG / LEAD: compare to previous / next row
SELECT
  month,
  revenue,
  LAG(revenue)  OVER (ORDER BY month) AS prev_month,
  LEAD(revenue) OVER (ORDER BY month) AS next_month,
  revenue - LAG(revenue) OVER (ORDER BY month) AS mom_change
FROM monthly_revenue;
```

```sql
-- Running total (cumulative sum) with an explicit frame
SELECT
  txn_date,
  amount,
  SUM(amount) OVER (
    ORDER BY txn_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM transactions;
```

```sql
-- Per-partition running total + share of partition
SELECT
  region, txn_date, amount,
  SUM(amount) OVER (PARTITION BY region ORDER BY txn_date) AS region_running,
  amount * 100.0 / SUM(amount) OVER (PARTITION BY region)  AS pct_of_region
FROM sales;
```

**Frame note (a senior detail):** default frame when you have `ORDER BY` but no `ROWS`/`RANGE` clause is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. With ties on the ORDER BY column, `RANGE` lumps tied rows together (they all get the same running total). Use `ROWS` if you want a strict row-by-row cumulative. This is a classic "why is my running total wrong" gotcha.

**Other useful window fns:** `NTILE(4)` (quartiles/buckets), `FIRST_VALUE`/`LAST_VALUE`/`NTH_VALUE`, `PERCENT_RANK`, `CUME_DIST`.

**Follow-up — "Top N per group without window functions?"** "You *can* with a correlated subquery counting how many rows beat the current one, but it's O(n²)-ish and ugly. `ROW_NUMBER()` filtered in an outer query is the clean way (shown in the drills section)."

---

## 4. SQL — Subqueries, CTEs, Recursive CTEs

**Q: Subquery vs CTE — what's the difference and when do you use each?**

Out loud: "A **subquery** is a query nested inside another — in the FROM, WHERE, or SELECT. A **CTE** (Common Table Expression, the `WITH` clause) is a named, query-scoped temporary result set you define up front. Functionally they often do the same thing; CTEs win on **readability** when you'd otherwise nest 3 levels deep, and they let you **reference the same intermediate result multiple times** and write **recursive** queries. Modern Postgres (12+) inlines non-recursive CTEs by the optimizer, so the old 'CTEs are an optimization fence' warning is mostly gone — but you can force materialization with `WITH ... AS MATERIALIZED` if you want it computed once."

```sql
-- Same logic, three ways

-- Subquery in WHERE
SELECT * FROM cve
WHERE id IN (SELECT cve_id FROM cpe_cve WHERE cpe_id = 42);

-- Derived table (subquery in FROM)
SELECT t.cve_id, t.n
FROM (
  SELECT cve_id, COUNT(*) AS n
  FROM cpe_cve GROUP BY cve_id
) t
WHERE t.n > 5;

-- CTE — most readable
WITH cve_counts AS (
  SELECT cve_id, COUNT(*) AS n
  FROM cpe_cve
  GROUP BY cve_id
)
SELECT * FROM cve_counts WHERE n > 5;
```

**Q: Correlated subquery — what is it and what's the cost?**

Out loud: "A correlated subquery references a column from the *outer* query, so it can't be evaluated once — it's re-run logically for **each outer row**. Powerful but can be slow; often a JOIN or window function is faster."

```sql
-- "Users whose latest order is over $1000" (correlated)
SELECT u.id, u.name
FROM users u
WHERE (SELECT o.amount
       FROM orders o
       WHERE o.user_id = u.id          -- correlation: depends on u
       ORDER BY o.created_at DESC
       LIMIT 1) > 1000;

-- EXISTS is the idiomatic correlated pattern for "has any":
SELECT u.id FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```
`EXISTS` short-circuits on the first match and is usually preferable to `IN (subquery)` when the subquery can return NULLs (NULL semantics with `NOT IN` are a notorious trap — see gotchas).

**Q: Recursive CTE — when and how?**

Out loud: "For hierarchies and graphs — org charts, category trees, bill-of-materials, or walking a dependency chain. A recursive CTE has an **anchor** (base case) `UNION ALL` a **recursive term** that references the CTE itself, and it iterates until the recursive term returns no new rows."

```sql
-- Walk a category tree down from a root
WITH RECURSIVE subtree AS (
  SELECT id, parent_id, name, 1 AS depth
  FROM categories
  WHERE id = 1                       -- anchor: the root

  UNION ALL

  SELECT c.id, c.parent_id, c.name, s.depth + 1
  FROM categories c
  JOIN subtree s ON c.parent_id = s.id   -- recursive term
)
SELECT * FROM subtree ORDER BY depth;
```
**Guard against cycles** in real graph data with a visited-path array and a `WHERE NOT c.id = ANY(path)` check, or you get infinite recursion.

---

## 5. SQL — Set Ops, CASE, NULL handling, DISTINCT, Pagination

**Q: UNION vs UNION ALL vs INTERSECT vs EXCEPT.**

Out loud: "These combine the *results* of two queries vertically (they must have the same number/compatible types of columns).
- `UNION` — combine and **remove duplicates** (does a sort/hash dedup → costs more).
- `UNION ALL` — combine and **keep duplicates** (cheaper, no dedup). Default to this unless you actually need dedup.
- `INTERSECT` — rows in **both**.
- `EXCEPT` (called MINUS in Oracle) — rows in the first but **not** the second."

```sql
SELECT email FROM customers
UNION ALL
SELECT email FROM leads;          -- keep dups, fast

SELECT user_id FROM active_users
INTERSECT
SELECT user_id FROM paying_users; -- both

SELECT user_id FROM all_users
EXCEPT
SELECT user_id FROM banned_users; -- minus
```

**Q: CASE expressions.**

```sql
SELECT cve_id,
  CASE
    WHEN cvss >= 9.0 THEN 'CRITICAL'
    WHEN cvss >= 7.0 THEN 'HIGH'
    WHEN cvss >= 4.0 THEN 'MEDIUM'
    WHEN cvss IS NULL THEN 'UNKNOWN'
    ELSE 'LOW'
  END AS severity_band
FROM cve;
```
CASE is also the trick for **pivoting** (conditional aggregation) and for custom `ORDER BY`.

**⭐ Q: Explain NULL and three-valued logic.**

Out loud: "`NULL` means *unknown / no value*, not zero and not empty string. SQL uses **three-valued logic**: TRUE, FALSE, and UNKNOWN. Any comparison with NULL yields UNKNOWN — so `x = NULL` is never TRUE; you must use `IS NULL` / `IS NOT NULL`. UNKNOWN in a WHERE clause is treated as 'not TRUE', so the row is excluded. This bites you in `NOT IN` subqueries: if the subquery returns even one NULL, `NOT IN` returns no rows at all — use `NOT EXISTS` instead."

NULL handling toolkit:
```sql
COALESCE(a, b, c)          -- first non-NULL of the list
NULLIF(a, b)               -- NULL if a = b else a (avoid divide-by-zero: NULLIF(denom,0))
x IS DISTINCT FROM y       -- NULL-safe inequality (treats NULL as a comparable value)
x IS NOT DISTINCT FROM y   -- NULL-safe equality
ORDER BY col NULLS LAST    -- control where NULLs sort
```

**Q: DISTINCT vs GROUP BY.**
`SELECT DISTINCT col` and `SELECT col GROUP BY col` produce the same set; use GROUP BY when you also need aggregates. Postgres has `DISTINCT ON (col)` — "keep one row per col value" — great for top-1-per-group:
```sql
-- Latest order per user (Postgres-specific)
SELECT DISTINCT ON (user_id) user_id, id, created_at
FROM orders
ORDER BY user_id, created_at DESC;
```

**⭐ Q: LIMIT/OFFSET vs keyset pagination — how do you paginate millions of rows?**

Out loud: "`LIMIT 20 OFFSET 100000` *works* but it's a trap at scale: the database still has to **scan and discard** all 100,000 skipped rows every time, so deep pages get linearly slower. The fix is **keyset (a.k.a. cursor / seek) pagination**: instead of an offset, remember the last row's sort key and ask for rows *after* it. It uses the index directly, so page 5000 costs the same as page 1. The downside is you can't jump to an arbitrary page number — it's 'next/previous' navigation, which is fine for infinite scroll and APIs."

```sql
-- OFFSET pagination (slow on deep pages)
SELECT * FROM cve ORDER BY id LIMIT 20 OFFSET 100000;

-- Keyset pagination (fast, constant time)
SELECT * FROM cve
WHERE id > :last_seen_id        -- the cursor from the previous page
ORDER BY id
LIMIT 20;

-- Composite sort key keyset (e.g. created_at, then id as tie-breaker)
SELECT * FROM cve
WHERE (created_at, id) > (:last_created_at, :last_id)
ORDER BY created_at, id
LIMIT 20;
```
Requires an index on the sort key(s). The row-comparison tuple `(a, b) > (x, y)` is the clean way to keyset on a compound key.

---

## 6. SQL — Write-by-hand drills

These come up live. Memorize the *shape*.

**Top N per group (top 3 highest-paid per department):**
```sql
WITH ranked AS (
  SELECT name, dept, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn
  FROM employees
)
SELECT name, dept, salary
FROM ranked
WHERE rn <= 3;
```

**Second highest salary** (handles ties + the "what if there isn't one" edge):
```sql
-- DENSE_RANK approach (true "second distinct salary")
SELECT DISTINCT salary
FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dr
  FROM employees
) t
WHERE dr = 2;

-- Classic interview one-liner
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- OFFSET version (returns NULL-safe single value, n-th highest = OFFSET n-1)
SELECT salary FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;
```

**Find duplicates (emails appearing more than once):**
```sql
SELECT email, COUNT(*) AS n
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Find the duplicate ROWS (to delete all but the first)
SELECT id, email
FROM (
  SELECT id, email,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
  FROM users
) t
WHERE rn > 1;     -- rn=1 is the keeper; rn>1 are dupes to delete
```

**Users with no orders (anti-join — three idioms):**
```sql
-- LEFT JOIN ... IS NULL
SELECT u.id
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;

-- NOT EXISTS (usually the planner's favorite, NULL-safe)
SELECT u.id
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- NOT IN (CAREFUL: breaks if subquery has NULLs)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM orders WHERE user_id IS NOT NULL);
```

**Running total:**
```sql
SELECT txn_date, amount,
       SUM(amount) OVER (ORDER BY txn_date
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
FROM transactions;
```

**Month-over-month change:**
```sql
WITH monthly AS (
  SELECT date_trunc('month', created_at) AS m,
         SUM(amount) AS revenue
  FROM orders
  GROUP BY 1
)
SELECT m,
       revenue,
       LAG(revenue) OVER (ORDER BY m)                               AS prev,
       revenue - LAG(revenue) OVER (ORDER BY m)                     AS mom_abs,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY m))
             / NULLIF(LAG(revenue) OVER (ORDER BY m), 0), 1)        AS mom_pct
FROM monthly
ORDER BY m;
```
Note the `NULLIF(..., 0)` to avoid divide-by-zero on the first month.

---

## 7. Indexing & Performance ⭐

**⭐ Q: What is an index? Explain the B-tree.**

Out loud: "An index is a separate, sorted data structure that lets the database find rows by a column's value **without scanning the whole table**. Postgres's default is a **B-tree** — a balanced tree where each node holds sorted keys and pointers, so a lookup is O(log n) instead of O(n). It's like the index at the back of a book: instead of reading every page to find 'transactions', you jump straight there. B-trees are great for equality (`=`), ranges (`<`, `>`, `BETWEEN`), `IN`, sorting, and prefix `LIKE 'abc%'`."

**⭐ Q: When does an index help, and when does it hurt?**

Helps:
- High-selectivity lookups (the predicate matches a small fraction of rows).
- JOIN columns, FK columns, WHERE filters, ORDER BY columns.

Hurts / doesn't help:
- **Writes get slower** — every INSERT/UPDATE/DELETE must also update *every* index on the table. This is the core trade-off: indexes speed reads, slow writes, and use disk.
- **Low-selectivity columns** (e.g. a boolean, or a status with 3 values across millions of rows) — the planner may correctly ignore the index and seq-scan because reading the index + jumping to rows is more expensive than a straight scan.
- A function/expression on the column kills index use: `WHERE lower(email) = 'x'` can't use a plain index on `email` — you need an **expression index**: `CREATE INDEX ON users (lower(email))`.
- Leading-wildcard `LIKE '%abc'` can't use a B-tree.

**⭐ Q: Composite indexes and column order — the leftmost-prefix rule.**

Out loud: "A composite index on `(a, b, c)` is sorted by `a`, then `b`, then `c`. The **leftmost-prefix rule**: it can serve queries filtering on `a`, on `a,b`, or on `a,b,c` — but **not** `b` alone or `c` alone, because the first column is the primary sort. So column order matters enormously. Put the column you filter by **equality** first, the **range** column last. A query like `WHERE a = ? AND b > ?` wants the index `(a, b)`; if you make it `(b, a)` the equality can't be used efficiently."

This is exactly the VMS `cpe_cve` story: PK `(cpe_id, cve_id)` serves CPE→CVE lookups; CVE→CPE needs its own `(cve_id)` index because `cve_id` isn't the leftmost column.

**Q: Covering index (index-only scan).**

Out loud: "A covering index includes **all columns the query needs**, so Postgres can answer entirely from the index and never touch the heap (the table) — an 'index-only scan'. In Postgres you do this with `INCLUDE`:"
```sql
CREATE INDEX idx_cve_sev ON cve (severity) INCLUDE (cvss, cve_id);
-- SELECT cvss, cve_id FROM cve WHERE severity='HIGH'  → index-only scan
```
(For index-only scans to actually fire, the table's visibility map must be up to date — i.e. recently `VACUUM`ed.)

**Q: Partial index.**

Out loud: "A partial index covers only rows matching a `WHERE` predicate — smaller, faster, cheaper to maintain. Perfect when you only query a subset, e.g. only un-resolved vulnerabilities or only active rows."
```sql
CREATE INDEX idx_open_cve ON cve (cvss)
WHERE status = 'OPEN';     -- index only the open ones
-- In Secret Vault: index only non-revoked secrets
CREATE INDEX idx_active_secret ON secrets (name) WHERE revoked_at IS NULL;
```

**Other index types worth a sentence each:**
- **Hash** — equality only, niche.
- **GIN** — for arrays, `JSONB`, full-text search (inverted index; "which rows contain this element").
- **GiST** — geometric, range types, nearest-neighbor.
- **BRIN** — block-range, tiny, great for huge naturally-ordered tables (time-series) where exact precision isn't needed.
- **HNSW / IVFFlat** (pgvector) — vector similarity (see §10).

**⭐ Q: EXPLAIN vs EXPLAIN ANALYZE — how do you read a plan?**

Out loud: "`EXPLAIN` shows the planner's **estimated** plan without running it. `EXPLAIN ANALYZE` actually **runs** the query and shows **real** timings and row counts, so you can compare estimated vs actual rows — a big gap there means stale statistics (`ANALYZE` the table). I read the plan **bottom-up / inside-out**: leaf nodes are the scans, parents are joins/sorts/aggregations. Key things I look for:
- **Seq Scan** on a big table where I expected an index → missing/unused index.
- **Index Scan / Index Only Scan** → good.
- The **join type**: Nested Loop (good for small inputs), Hash Join (good for big unsorted), Merge Join (good for pre-sorted).
- `rows=` estimate vs `actual rows=` — large divergence = bad stats → run `ANALYZE`.
- `cost=` (startup..total, in arbitrary units) and, with ANALYZE, `actual time=`.
- Rows being filtered late, big sorts spilling to disk, or a Nested Loop over a huge table."

```sql
EXPLAIN ANALYZE
SELECT c.cve_id FROM cpe
JOIN cpe_cve cc ON cc.cpe_id = cpe.id
JOIN cve c ON c.id = cc.cve_id
WHERE cpe.uri = 'cpe:2.3:a:nginx:nginx:1.21.0:*:*:*';
-- Look for Index Scan on cpe.uri and on the cpe_cve PK, not Seq Scan.
```

**Q: Seq scan vs index scan — when is a seq scan actually right?**
"When the query returns a **large fraction** of the table, a sequential scan is *faster* than an index scan, because the index scan does random I/O jumping back to the heap per match. The planner picks based on selectivity and table stats. So a seq scan isn't automatically a bug — only a bug when it's scanning a big table to return few rows."

---

## 8. The N+1 Problem & Fixes ⭐ (VMS)

**⭐ Q: What is the N+1 query problem, and how did you fix it in VMS?**

Out loud: "N+1 is when you run **1 query to fetch a list of N parent rows, then 1 query per row to fetch its children — N+1 total round trips**. It's usually invisible in ORM code: you loop over objects and lazily access a relationship, and each access fires a query. Individually each is fast, but the network round-trip overhead × thousands of rows dominates. In VMS this was a big chunk of why the CPE/CVE sync took 16–18 hours — for each CPE we were doing per-row lookups against CVE and the join table, plus per-row inserts.

The fixes:
1. **Batch the reads** — replace per-row queries with a single `JOIN` or an `IN (...)` query / `ANY(array)` that fetches all children at once.
2. **In Django ORM**: `select_related` (does a SQL JOIN, for forward FK / one-to-one) and `prefetch_related` (does a second query with `IN`, for many-to-many / reverse FK) — so you go from N+1 down to 1 or 2 queries.
3. **In SQLAlchemy**: `joinedload` (JOIN) or `selectinload` (separate `IN` query) eager loading.
4. **Bulk the writes** — `bulk_create` / `executemany` / `COPY` instead of one INSERT per row.

Combined with **indexing the join columns** and **bulk operations**, that's what took the sync from 16–18h to ~4h." `[fill in: exact before/after row counts and timings]`

```python
# N+1 (bad) — 1 + N queries
for cpe in Cpe.objects.all():            # 1 query
    for link in cpe.cpe_cve_set.all():   # N queries, one per cpe
        process(link.cve)

# Fixed — prefetch the M:N in a second IN-query (2 queries total)
for cpe in Cpe.objects.prefetch_related('cves').all():
    for cve in cpe.cves.all():           # no extra DB hit
        process(cve)

# select_related for forward FK (single JOIN, 1 query)
links = CpeCve.objects.select_related('cpe', 'cve').all()
```

```python
# Raw "IN" batching instead of per-row lookups
ids = [c.id for c in cpes]
cves = Cve.objects.filter(cpe_cve__cpe_id__in=ids)   # one query, not N
```

**Follow-up — "How do you *detect* N+1?"** "Watch the query log / use `django-debug-toolbar` or SQLAlchemy echo; if you see the same parametrized query fired hundreds of times in one request, that's N+1. APM tools (e.g. New Relic, Datadog) flag it as a 'N+1 query' pattern too."

---

## 9. Bulk Inserts/Updates & Connection Pooling

**Q: How do you do efficient bulk writes?**

Out loud: "Per-row INSERTs in a loop are the slow path — each is a round trip and (if you're not careful) its own transaction. Options, fastest first:
1. **`COPY`** — Postgres's bulk-load path, by far the fastest for large volumes (it bypasses a lot of per-row overhead). `psycopg`'s `copy_from` / `cursor.copy`.
2. **Multi-row INSERT** — `INSERT INTO t (...) VALUES (...), (...), (...)` batched (e.g. 1,000 rows per statement).
3. **`executemany`** / ORM `bulk_create(objs, batch_size=1000)`.
4. **Wrap in one transaction** — committing once per 1,000 rows instead of per row removes per-commit fsync cost.
5. For updates/inserts, **`INSERT ... ON CONFLICT DO UPDATE`** (upsert) does it in one statement instead of select-then-insert."

```sql
-- Upsert (idempotent sync — important for VMS re-runs)
INSERT INTO cpe_cve (cpe_id, cve_id)
VALUES (1, 10), (1, 11), (2, 10)
ON CONFLICT (cpe_id, cve_id) DO NOTHING;   -- skip dup pairs

-- Bulk update from a VALUES list
UPDATE cve AS c
SET cvss = v.cvss
FROM (VALUES (1, 9.8), (2, 7.5)) AS v(id, cvss)
WHERE c.id = v.id;
```

```python
# Django bulk_create
CpeCve.objects.bulk_create(objs, batch_size=1000, ignore_conflicts=True)
```

**Perf tip for huge loads:** dropping non-essential indexes, doing the bulk load, then **rebuilding the indexes** once is often faster than maintaining them per row — because each insert otherwise updates every index. This is the same write-amplification trade-off from §7. (Tie-in: the VMS speedup combined indexing the *read* path with bulk-writing the *write* path.)

**Q: Connection pooling — why and how?**

Out loud: "Opening a Postgres connection is expensive — it forks a backend process and does auth/TLS — and Postgres has a hard cap (`max_connections`, often ~100). Under load you don't want each request opening its own connection. A **connection pool** keeps a set of warm connections and hands them out, so requests reuse them. App-side I use SQLAlchemy's pool (`pool_size`, `max_overflow`); in front of Postgres in production you often put **PgBouncer** (transaction-mode pooling) to multiplex thousands of clients onto a small pool. In FastAPI with async, I use an async pool (asyncpg / `databases`) so connections aren't held while awaiting. The danger is **pool exhaustion** — holding connections during long external calls, or leaking them — which manifests as requests hanging waiting for a free connection."

---

## 10. pgvector specifics (TARA)

**⭐ Q: How does vector search inside Postgres work? (TARA Copilot)**

Out loud: "In TARA Copilot we do RAG / semantic search. We turn text into **embeddings** — fixed-length float vectors (e.g. `[fill in: 1536]`-dim from the embedding model) that capture meaning, so semantically similar text lands close together in vector space. We store those in Postgres using the **pgvector** extension, which adds a `vector` column type and distance operators. A query is itself embedded, then we find the **nearest neighbors** by vector distance and feed those chunks to the LLM as context. The win of pgvector is we keep vectors *next to* our relational data — same DB, same transactions, same backups, filter by metadata in plain SQL — instead of running a separate vector DB like Pinecone."

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id        BIGSERIAL PRIMARY KEY,
  content   TEXT,
  embedding vector(1536)            -- [fill in: actual dim]
);

-- Nearest neighbors by cosine distance (<=>), pre-filtered by metadata
SELECT id, content
FROM documents
WHERE tenant_id = :tenant            -- metadata filter in plain SQL
ORDER BY embedding <=> :query_vec    -- cosine distance, ascending = closest
LIMIT 5;
```

**Q: The distance operators — cosine vs L2 vs inner product.**

| Operator | Meaning | Use when |
|---|---|---|
| `<->` | **L2 / Euclidean** distance | magnitudes matter |
| `<=>` | **cosine** distance (1 − cosine similarity) | text embeddings (direction matters, not length) — what we use |
| `<#>` | **negative inner product** | embeddings already normalized; cheapest |

Out loud: "For text embeddings, **cosine** is the usual choice because it compares *direction* (semantic orientation), not vector length. Many models output normalized vectors, in which case cosine and inner product rank identically and inner product is a hair faster."

**⭐ Q: HNSW vs IVFFlat — which index and why?**

Out loud: "Both are **approximate nearest neighbor (ANN)** indexes — exact KNN means scanning every vector, which is O(n) and too slow at scale, so we trade a little **recall** for a lot of **speed**.

- **IVFFlat** — partitions vectors into `lists` clusters (Voronoi cells) at build time; at query time it only searches the nearest `probes` clusters. *Must be built on existing data* (it needs to know the distribution to cluster), more `probes` = better recall, slower. Lower memory, faster build.
- **HNSW** (Hierarchical Navigable Small World) — a multi-layer graph you navigate greedily. Generally **better recall/speed trade-off** and you can build it incrementally (no need for data up front), but **slower to build and more memory**. It's the default I reach for now.

The knobs:
- IVFFlat: `lists` at build time (rule of thumb ~`rows/1000`), `probes` at query time (`SET ivfflat.probes = 10`).
- HNSW: `m` (graph degree) and `ef_construction` at build; `ef_search` at query time (`SET hnsw.ef_search = 40`) — **higher `ef_search` = higher recall, slower query**. That's the dial for the recall-vs-latency trade-off."

```sql
-- HNSW (cosine)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
SET hnsw.ef_search = 40;   -- per-session recall/speed dial

-- IVFFlat (cosine)
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
SET ivfflat.probes = 10;
```

**Recall vs speed, in one sentence:** "ANN indexes don't guarantee the *exact* top-K; tuning `ef_search`/`probes` higher recovers more of the true neighbors (higher recall) at the cost of latency — you pick the point on that curve your product can tolerate."

**Follow-up — "How do you combine vector search with filters?"** "Two ways: pre-filter in the WHERE (works, but the ANN index and the filter can fight — if the filter is very selective you may want a partial index or to over-fetch then filter). pgvector + a B-tree/partial index, or recent 'iterative scan' features, help here. In TARA, tenant/permission filters live in the WHERE alongside the `ORDER BY embedding <=> ...`."

---

## 11. Transactions & ACID ⭐

**⭐ Q: What does ACID mean?**

Out loud:
- **Atomicity** — a transaction is all-or-nothing; if any statement fails, the whole thing rolls back. No half-applied state.
- **Consistency** — the transaction moves the DB from one valid state to another, respecting all constraints (PK, FK, CHECK, NOT NULL). It never leaves integrity rules violated.
- **Isolation** — concurrent transactions don't step on each other; the result is *as if* they ran in some serial order (degree depends on isolation level).
- **Durability** — once committed, it survives crashes/power loss (Postgres uses the **WAL** — write-ahead log — flushed to disk on commit).

"A transaction is a unit of work wrapped in `BEGIN ... COMMIT` (or `ROLLBACK`). ACID is what makes a relational DB trustworthy for money, inventory, and — in **Secret Vault** — for writing a secret *and* its audit-log entry as one atomic unit, so you can never have a secret change without an audit record."

```sql
BEGIN;
  UPDATE secrets SET value = :enc WHERE id = :id;
  INSERT INTO audit_log (secret_id, action, actor, at)
       VALUES (:id, 'ROTATE', :actor, now());
COMMIT;   -- both or neither; the audit log can't drift from the secret
```

**Q: Why is the Secret Vault audit log append-only and how do you enforce it?**

Out loud: "Append-only means rows are only ever inserted, never updated or deleted — so the audit trail is tamper-evident. Enforce it with privileges (grant only INSERT/SELECT on the table, no UPDATE/DELETE) and/or a trigger that raises on UPDATE/DELETE. Combined with the atomic write above, every secret access/change leaves an immutable record."

---

## 12. Isolation Levels & Anomalies ⭐

**⭐ Q: Name the isolation levels and the anomalies each prevents.**

Out loud: "The SQL standard defines four levels, trading consistency for concurrency. Each prevents more anomalies as you go up:

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| **READ UNCOMMITTED** | possible* | possible | possible |
| **READ COMMITTED** | no | possible | possible |
| **REPEATABLE READ** | no | no | possible (std) |
| **SERIALIZABLE** | no | no | no |

The anomalies:
- **Dirty read** — you read another transaction's *uncommitted* changes, which might roll back.
- **Non-repeatable read** — you read a row twice in one transaction and get different values because another committed transaction changed it in between.
- **Phantom read** — you run the same `WHERE` twice and get *different sets of rows* because another transaction inserted/deleted rows matching the predicate.

Postgres specifics worth saying:
- Postgres's **default is READ COMMITTED**.
- Postgres **never allows dirty reads** — `READ UNCOMMITTED` behaves like `READ COMMITTED` (the `*`).
- Postgres implements isolation with **MVCC** (Multi-Version Concurrency Control): readers see a snapshot and don't block writers, writers don't block readers.
- Postgres's **REPEATABLE READ uses a snapshot and actually also prevents phantoms** (stronger than the SQL minimum); its **SERIALIZABLE** uses SSI (Serializable Snapshot Isolation) and can abort a transaction with a serialization failure you must retry."

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
  -- ... if you get 'could not serialize access', catch it and RETRY the txn
COMMIT;
```

**Q: How do you choose a level?**
"Default READ COMMITTED is right for most OLTP. Bump to REPEATABLE READ when a transaction must see a stable snapshot across multiple reads (reports, multi-step reads). Use SERIALIZABLE when correctness under concurrency is critical and you can't reason about every race — but be ready to retry on serialization failures, and expect lower throughput."

---

## 13. Locking, Optimistic vs Pessimistic, Deadlocks

**Q: Pessimistic vs optimistic concurrency.**

Out loud:
- **Pessimistic** — assume conflicts will happen; **lock** the row up front so no one else can touch it until you commit. `SELECT ... FOR UPDATE`. Safe but reduces concurrency and risks deadlocks/lock waits. Good for high-contention hot rows (e.g. decrementing inventory).
- **Optimistic** — assume conflicts are rare; **don't lock**, but detect a conflict at write time with a **version column** (or timestamp) and retry if it changed. No lock held across user think-time. Great for web apps where you read, the user edits, then saves.

```sql
-- Pessimistic: lock the row, others wait
BEGIN;
SELECT value FROM secrets WHERE id = :id FOR UPDATE;
UPDATE secrets SET value = :new WHERE id = :id;
COMMIT;

-- Optimistic: version check; affected-rows = 0 means someone beat you → retry
UPDATE secrets
SET value = :new, version = version + 1
WHERE id = :id AND version = :expected_version;
```

**Q: What's a deadlock and how do you avoid it?**

Out loud: "A deadlock is when txn A holds lock 1 and waits for lock 2, while txn B holds lock 2 and waits for lock 1 — a cycle, neither can proceed. Postgres detects it and **kills one transaction** with a deadlock error; you retry it. Prevention: **always acquire locks in a consistent order** (e.g. always lock rows by ascending id), keep transactions short, and use the smallest lock scope you need. `SELECT ... FOR UPDATE SKIP LOCKED` is great for queue/worker patterns so workers grab different rows instead of contending."

---

## 14. Normalization & Denormalization ⭐

**⭐ Q: Walk me through the normal forms.**

Out loud: "Normalization is organizing tables to **eliminate redundancy and update anomalies**, by ensuring every fact lives in exactly one place.

- **1NF** — atomic values, no repeating groups or arrays-as-columns; each cell holds a single value, each row is unique. (e.g. no `phone1, phone2, phone3` — split into a phones table.)
- **2NF** — 1NF *and* no **partial dependency**: every non-key column depends on the *whole* composite primary key, not just part of it. (Only relevant when you have a composite PK.)
- **3NF** — 2NF *and* no **transitive dependency**: non-key columns depend *only* on the key, not on another non-key column. (e.g. don't store `zip` and `city` if `zip` determines `city` — city belongs in a zip table.)
- **BCNF** — a stricter 3NF: for every functional dependency X→Y, X must be a candidate key. Handles edge cases 3NF misses with overlapping candidate keys.

The one-liner: *'Every non-key attribute must depend on the key, the whole key, and nothing but the key.'* (Codd.) That sentence is basically 1NF→2NF→3NF."

**⭐ Q: When do you DENORMALIZE?**

Out loud: "Normalization optimizes for write integrity and storage; it costs you **joins on read**. You **denormalize** — deliberately duplicate or pre-aggregate data — when read performance matters more than write simplicity:
- **Analytics / OLAP** — star schemas are intentionally denormalized (wide dimension tables) so reports don't join a dozen tables.
- **Hot read paths** — store a cached `comment_count` on a post instead of `COUNT(*)`-ing every render.
- **Reporting tables / materialized views** — precompute the join/aggregate.

The trade-off is you now have to keep the duplicate in sync (triggers, app logic, or scheduled refresh), and you risk it drifting. Rule of thumb: **normalize until it hurts (reads too slow), then denormalize until it works** — and only where measurements justify it. OLTP → normalized; OLAP → denormalized."

---

## 15. Keys & Constraints

**Q: Primary key, foreign key, and the constraint types.**

Out loud:
- **Primary key** — uniquely identifies a row; implies UNIQUE + NOT NULL; one per table; auto-indexed.
- **Foreign key** — a column referencing another table's PK, enforcing **referential integrity** (you can't reference a row that doesn't exist), with `ON DELETE CASCADE/SET NULL/RESTRICT` behavior.
- **UNIQUE** — no duplicate values (allows one NULL in Postgres, since NULLs aren't equal).
- **NOT NULL**, **CHECK** (e.g. `CHECK (cvss BETWEEN 0 AND 10)`), **DEFAULT**.

**Q: Surrogate vs natural keys.**

Out loud: "A **natural key** is a real-world attribute that's already unique — an email, a CPE URI, a CVE id like `CVE-2024-1234`. A **surrogate key** is a synthetic, meaningless id the system generates — `BIGSERIAL`/`IDENTITY` or a UUID.

I usually use a **surrogate PK** (`id BIGSERIAL`) plus a **UNIQUE constraint on the natural key**. Why: surrogates are small, stable (natural values can change — people change emails), never composite, and make joins/FKs simple. The natural key still gets enforced via UNIQUE, and the surrogate gives a stable handle. In VMS, `cve.id` is a surrogate PK while `cve.cve_id` ('CVE-2024-1234') is the unique natural key — joins go through the cheap integer surrogate, lookups by the human-readable natural key." UUID vs BIGSERIAL: UUID is good for distributed/sharded id generation and not leaking row counts; BIGSERIAL is smaller and index-friendlier (UUIDv7/time-ordered mitigates the random-insert downside).

---

## 16. SQL vs NoSQL & CAP ⭐

**⭐ Q: SQL vs NoSQL — when do you choose each?**

Out loud: "Default to **relational/SQL (Postgres)** unless I have a specific reason not to — it gives me ACID transactions, joins, strong schema/constraints, and a mature query planner. I reach for **NoSQL** when the workload doesn't fit that mold:

- **Document stores** (MongoDB) — flexible/varying schema, denormalized aggregates you read whole; nested JSON documents. Good for content, catalogs, when the schema evolves fast.
- **Key-value** (Redis, DynamoDB) — dead-simple `get/put` by key, extreme scale and low latency; caching, sessions, feature flags.
- **Columnar / wide-column** (Cassandra, HBase; and analytics columnar like ClickHouse/BigQuery) — massive write throughput and/or analytical scans over few columns across billions of rows.
- **Graph** (Neo4j) — relationship-heavy traversals (social graphs, fraud rings, recommendations) where multi-hop joins in SQL get painful.

The honest senior take: **Postgres covers a huge amount of this** — `JSONB` for document-style flexibility, arrays, full-text search, and pgvector for vector search — so I often don't *need* a separate NoSQL store until I hit a real scale or access-pattern wall. Polyglot persistence (right tool per job) is fine, but each extra datastore is operational cost."

**Q: Where does Postgres JSONB fit as a 'middle ground'?**

Out loud: "`JSONB` lets me store schemaless/semi-structured documents inside a relational table — binary JSON, indexable with GIN, queryable with `->`, `->>`, `@>`, `jsonb_path_query`. So I get document flexibility for the parts that vary, while keeping ACID, joins, and constraints for the structured parts. Great for things like storing the raw vulnerability JSON blob from a feed alongside the normalized columns I actually query on."
```sql
SELECT data->>'title'
FROM raw_feed
WHERE data @> '{"severity": "CRITICAL"}';   -- GIN-indexable containment
```

**⭐ Q: Explain CAP and the trade-offs.**

Out loud: "CAP says in a distributed system, when a **network Partition** happens, you must choose between **Consistency** (every read sees the latest write) and **Availability** (every request gets a non-error response). You can't have both *during a partition* — that's the theorem. When there's no partition you can have both C and A.

- **CP** systems (e.g. classic single-leader RDBMS, HBase, Zookeeper) — on partition, refuse/block to stay consistent.
- **AP** systems (e.g. Cassandra, DynamoDB in eventually-consistent mode) — stay up, accept writes, reconcile later → **eventual consistency**.

The practical extension is **PACELC**: *if Partition then choose A or C, **Else** (normal operation) choose Latency or Consistency.* That captures the everyday trade-off that pure CAP ignores. A single-node Postgres isn't really 'distributed', so CAP bites you once you add replicas/sharding — and that's where you decide sync vs async replication (consistency vs latency/availability)."

---

## 17. OLTP vs OLAP ⭐ (JD)

**⭐ Q: OLTP vs OLAP — give me the one-liner.**

The candidate's one-liner to say out loud:

> **"OLTP is the operational database — lots of small, fast, concurrent transactions reading and writing individual rows (the app's day-to-day inserts/updates), optimized with row-oriented storage and indexes. OLAP is the analytical side — fewer, huge read queries that scan and aggregate millions of rows for reporting/BI, optimized with columnar storage, denormalized star schemas, and a data warehouse. You don't run heavy analytics on your OLTP database — you ETL/ELT the data into a warehouse so the dashboards don't slow down production."**

| | OLTP | OLAP |
|---|---|---|
| Purpose | Run the business (transactions) | Analyze the business (insight) |
| Queries | Many small, point reads/writes | Few, large aggregations/scans |
| Rows touched | Few per query | Millions per query |
| Storage | Row-oriented | Column-oriented |
| Schema | Normalized (3NF) | Denormalized (star/snowflake) |
| Writes | Frequent, small | Bulk loads / batch |
| Examples | Postgres, MySQL (app DB) | Snowflake, BigQuery, Synapse, Redshift, Databricks |
| Index focus | B-tree on lookup cols | Columnar + partitioning |
| Latency target | Milliseconds | Seconds–minutes acceptable |

Tie-in: "In my projects the Postgres instances (VMS, TARA, Secret Vault) are **OLTP**. The Fortune-500 'Data to Decision' work is where OLAP / warehouse thinking comes in — moving operational data into an analytics store for dashboards."

---

## 18. Data Warehousing: schemas, ETL/ELT, columnar, lake/warehouse/lakehouse

**Q: Star vs snowflake schema; fact vs dimension tables.**

Out loud: "A warehouse organizes data into **fact** and **dimension** tables.
- A **fact table** holds the measurable events/metrics — one row per event, with foreign keys to dimensions and numeric **measures** (e.g. a `sales` fact with `amount`, `quantity`). Big and narrow-ish, grows fast.
- **Dimension tables** hold the descriptive context you slice by — `dim_date`, `dim_product`, `dim_customer`, `dim_region`.

- **Star schema** — one central fact table joined directly to **denormalized** dimensions. Fewer joins, fast queries, the standard for BI.
- **Snowflake schema** — dimensions are **normalized** into sub-dimensions (e.g. `product → category → department` as separate tables). Less redundancy, but more joins and slower queries.

Star is usually preferred for query speed; snowflake when dimension storage/consistency matters. Slowly Changing Dimensions (SCD Type 2) is how you keep dimension history."

**Q: ETL vs ELT.**

Out loud: "**ETL** = Extract, **Transform**, then Load — transform the data (clean, join, aggregate) on a separate processing tier *before* loading it into the warehouse. Classic, when the target couldn't do heavy transforms or you wanted to limit what lands.

**ELT** = Extract, Load, then **Transform** — load raw data into the warehouse/lake first, then transform *in place* using the warehouse's own compute (e.g. dbt running SQL in Snowflake/BigQuery/Synapse). Modern cloud warehouses are so powerful and cheap-to-scale that ELT is now the norm — you keep raw data (replayable), and push transforms down to the engine. The shift from ETL→ELT is basically 'the warehouse got powerful enough to do the T'."

**Q: Row vs columnar storage — why columnar for analytics?**

Out loud: "**Row-oriented** stores all columns of a row together → great for OLTP where you read/write whole rows by key. **Columnar** stores each column's values together → great for OLAP because:
1. Analytical queries touch **few columns over many rows** — columnar reads *only* those columns off disk, skipping the rest.
2. Values in a column are the same type and often repetitive → **massive compression** (run-length, dictionary encoding).
3. Vectorized execution over tight column arrays.

So a `SELECT AVG(amount) FROM sales` scans just the `amount` column, compressed, instead of dragging every wide row through memory. That's the core reason warehouses (Redshift, BigQuery, Snowflake, ClickHouse, Parquet files) are columnar." Postgres itself is row-store; for columnar analytics you'd use an extension (e.g. Citus columnar) or a dedicated warehouse.

**Q: Data lake vs warehouse vs lakehouse.**

Out loud:
- **Data warehouse** — structured, schema-on-write, curated data for BI/SQL analytics (Snowflake, BigQuery, Synapse, Redshift). Governed, fast queries, costs more per TB.
- **Data lake** — raw data of any shape (structured, semi-, unstructured) in cheap object storage (S3, ADLS), **schema-on-read**. Cheap and flexible, but can become a 'data swamp' without governance. Good for ML/raw retention.
- **Lakehouse** — the convergence: lake-style cheap open storage (Parquet/Delta/Iceberg) **plus** warehouse-style ACID transactions, schema, and SQL on top (Databricks Delta Lake, Iceberg). One copy of data serving both BI and ML.

"In the Azure world: **Azure Synapse** is the integrated analytics/warehouse service; **Azure Databricks** is the Spark-based lakehouse platform (Delta Lake); raw data sits in **ADLS Gen2**. **Snowflake** is the cloud-agnostic warehouse. I'd land raw in the lake (ADLS), transform with Databricks/dbt (ELT), and serve curated marts via Synapse/Snowflake for the dashboards."

**Q: Materialized views & partitioning for analytics.**

Out loud:
- **Materialized view** — a view whose result is **physically stored** and refreshed on demand/schedule, so expensive aggregates are precomputed. Unlike a regular view (just a saved query, re-run each time), a matview trades freshness for speed. `REFRESH MATERIALIZED VIEW CONCURRENTLY` avoids locking readers.
  ```sql
  CREATE MATERIALIZED VIEW cve_by_severity AS
  SELECT severity, COUNT(*) n FROM cve GROUP BY severity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY cve_by_severity;
  ```
- **Partitioning** — split one big logical table into physical chunks by a key (range on date, list on region, hash). Queries with a predicate on the partition key only scan the relevant partition (**partition pruning**), and you can drop old partitions instantly instead of a slow bulk DELETE. Essential for big time-series/fact tables.
  ```sql
  CREATE TABLE events (id bigint, ts timestamptz, ...) PARTITION BY RANGE (ts);
  CREATE TABLE events_2026_06 PARTITION OF events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
  ```

---

## 19. Caching (Redis) & Read Replicas

**Q: How does a Redis cache layer help, and what are the pitfalls?**

Out loud: "Redis is an in-memory key-value store you put **in front of** Postgres for **hot reads** — frequently-read, rarely-changing data (config, lookups, computed results, sessions). The pattern is **cache-aside**: on read, check Redis first; on miss, read Postgres and populate Redis with a TTL. This cuts read latency to sub-millisecond and offloads the DB.

Pitfalls to mention:
- **Invalidation** — 'there are only two hard problems...'. On writes you evict/update the cache; stale cache is the classic bug.
- **TTL** — set expiries so stale data self-heals.
- **Thundering herd / cache stampede** — when a hot key expires, many requests miss at once and hammer the DB; mitigate with locks, request coalescing, or jittered TTLs.
- Don't cache data that must be perfectly consistent (e.g. a Secret Vault secret you just rotated) without careful invalidation."

**Q: Read replicas.**

Out loud: "A **read replica** is a copy of the primary that streams the WAL and serves **read-only** queries, so you scale reads horizontally and isolate heavy analytics from the write primary. The catch is **replication lag** — replicas are usually **asynchronous**, so a read right after a write might not see it (read-your-own-writes problem). You route writes + read-after-write to the primary and bulk/eventually-consistent reads to replicas. For analytics, an async replica (or a dedicated OLAP store) keeps reporting off the OLTP primary."

---

## 20. Likely follow-ups (the "what do you do" questions)

**⭐ Q: "This query is slow. What do you do?"**

A step-by-step you can recite:
1. **Reproduce & measure** — run `EXPLAIN (ANALYZE, BUFFERS)` to see the real plan, timings, and I/O. Don't guess.
2. **Find the villain** — look for a **Seq Scan on a big table**, a **Nested Loop over many rows**, a big **Sort spilling to disk**, or `actual rows` ≫ `estimated rows` (stale stats → run `ANALYZE`).
3. **Indexing** — add/adjust an index on the WHERE/JOIN/ORDER BY columns; check **column order** for composites; consider a **partial** or **covering** index. Verify the planner actually uses it.
4. **Query shape** — kill **N+1** (batch with JOIN/IN), replace correlated subqueries with joins/windows, `SELECT` only needed columns, avoid functions on indexed columns in WHERE.
5. **Pagination** — switch deep `OFFSET` to **keyset**.
6. **Data volume** — partition huge tables; precompute with a **materialized view**; archive cold rows.
7. **Caching / replicas** — Redis for hot reads; route heavy reads to a replica.
8. **Last resort / scale** — denormalize, or move analytics to a warehouse.
"In VMS this exact loop — EXPLAIN, add indexes on the join columns, kill N+1, bulk the writes — is what took the sync from 16–18h to ~4h."

**⭐ Q: "How do you paginate millions of rows efficiently?"**
"Keyset/seek pagination on an indexed sort key, not `LIMIT/OFFSET` — see §5. Constant time per page because it seeks into the index instead of scanning and discarding."

**Q: "Row vs columnar — which would you use?"**
"OLTP app traffic → row store (Postgres). Analytical scans/aggregations over huge tables → columnar (warehouse). See §18."

**⭐ Q: "How does pgvector search work?"**
"Embed text → store `vector` column → ANN index (HNSW) → `ORDER BY embedding <=> query LIMIT k` for nearest neighbors by cosine distance, tuning `ef_search` for recall vs latency. See §10."

**Q: "When would you shard?"**
Out loud: "Sharding — horizontally partitioning data across **multiple servers** by a shard key — is the **last** scaling lever, after you've exhausted: indexing, query tuning, caching, read replicas, vertical scaling, and table partitioning on a single node. I'd shard when a single primary can't hold the **write** volume or data **size** even after all that. The cost is real: cross-shard joins and transactions become hard or impossible, you must pick a good shard key (even distribution, avoids hotspots, matches access patterns), and rebalancing is painful. So: shard only when forced, choose the shard key carefully, and design queries to hit a single shard. Many teams never need it because Postgres + replicas + partitioning + Redis carries them a long way."

**Q: "How do you keep the audit log trustworthy under concurrency?" (Secret Vault)**
"Write the secret change and the audit row in **one transaction** (atomicity), make the audit table **append-only** (privileges/trigger), and rely on Postgres MVCC so concurrent reads see consistent snapshots. See §11."

---

## 21. Rapid-fire cheat sheet

- **INNER** = match both. **LEFT** = all left + NULLs. **FULL** = everything. **CROSS** = Cartesian. **SELF** = table to itself.
- **WHERE** filters rows (pre-group); **HAVING** filters groups (post-aggregate).
- Logical order: **FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT**.
- **ROW_NUMBER** unique; **RANK** gaps after ties (1,1,3); **DENSE_RANK** no gaps (1,1,2).
- **LAG/LEAD** = prev/next row. Running total = `SUM() OVER (ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`.
- **CTE** (`WITH`) for readability + recursion; recursive = anchor `UNION ALL` recursive term.
- **UNION** dedups (slow); **UNION ALL** keeps dups (fast). **EXCEPT** = minus. **INTERSECT** = both.
- **COALESCE** = first non-NULL; `IS DISTINCT FROM` = NULL-safe compare; `NOT IN` + NULL = silent bug → use `NOT EXISTS`.
- **Keyset > OFFSET** for deep pagination.
- **Index** = sorted B-tree, O(log n) reads, slows writes. Composite = **leftmost-prefix** rule; equality cols first, range last.
- **Covering** index (`INCLUDE`) → index-only scan. **Partial** index = `WHERE` subset.
- **EXPLAIN** = estimate; **EXPLAIN ANALYZE** = real run. Watch Seq Scan on big tables + estimate-vs-actual gap.
- **N+1** = 1 + N queries → fix with JOIN / `IN` / `select_related` (JOIN) / `prefetch_related` (IN) / `joinedload`/`selectinload`.
- **Bulk writes**: `COPY` > multi-row INSERT > `executemany`; one txn; upsert via `ON CONFLICT`; drop+rebuild indexes for big loads.
- **Connection pool** (SQLAlchemy / PgBouncer) — reuse warm conns, avoid `max_connections` exhaustion.
- **pgvector**: `<=>` cosine, `<->` L2, `<#>` inner product. **HNSW** (better recall, slower build, more RAM) vs **IVFFlat** (lists/probes, needs data first). `ef_search`/`probes` ↑ = recall ↑, speed ↓.
- **ACID** = Atomicity, Consistency, Isolation, Durability (WAL).
- **Isolation**: READ UNCOMMITTED → READ COMMITTED (PG default) → REPEATABLE READ → SERIALIZABLE. Anomalies: dirty / non-repeatable / phantom. Postgres = MVCC, no dirty reads, RR also blocks phantoms.
- **Optimistic** = version column + retry; **Pessimistic** = `SELECT ... FOR UPDATE`. Deadlock → consistent lock order, short txns.
- **Normal forms**: 1NF atomic, 2NF no partial dep, 3NF no transitive dep, BCNF stricter. "Key, whole key, nothing but the key." Denormalize for read-heavy/OLAP.
- **Surrogate** PK (BIGSERIAL/UUID) + **UNIQUE** on natural key.
- **CAP**: on Partition pick C or A; **PACELC** adds Else → Latency vs Consistency.
- **OLTP** = many small row writes (row store, normalized); **OLAP** = big aggregations (columnar, star schema, warehouse).
- **Star** (denormalized dims, fast) vs **Snowflake** (normalized dims, more joins). **Fact** = measures; **Dimension** = context.
- **ETL** transform-before-load; **ELT** load-then-transform-in-warehouse (modern default).
- **Lake** (raw, schema-on-read, cheap) vs **Warehouse** (curated, schema-on-write) vs **Lakehouse** (both; Delta/Iceberg).
- **Materialized view** = stored precomputed result; **partitioning** = split big table for pruning + cheap drops.
- **Redis cache-aside** for hot reads; **read replica** scales reads (mind async lag).
- **Shard last** — after indexing/cache/replicas/partitioning; pick shard key carefully.

---

## 22. Traps & gotchas

- **`NOT IN (subquery)` with a NULL** returns **zero rows** — silent, brutal. Use `NOT EXISTS` or filter NULLs.
- **`COUNT(column)` skips NULLs**; `COUNT(*)` doesn't. `SUM` over no rows is `NULL`, not 0.
- **`AVG` ignores NULLs** — `AVG([10, NULL, 20]) = 15`. If NULL should count as 0, `COALESCE` first.
- **Aggregate in WHERE is illegal** — `WHERE COUNT(*) > 5` → must be `HAVING`.
- **SELECT alias not usable in WHERE/GROUP BY/HAVING** (those run before SELECT) but **is** usable in ORDER BY.
- **Running total with default `RANGE` frame** lumps tied ORDER BY values together — use `ROWS` for strict row-by-row.
- **`LIMIT/OFFSET` deep pages get linearly slower** — the skipped rows are still scanned.
- **Function on an indexed column** (`WHERE lower(email)=...`, `WHERE date(ts)=...`) disables the index → use an expression index or rewrite to a range.
- **Leading wildcard `LIKE '%foo'`** can't use a B-tree.
- **Implicit type casts** (`WHERE id = '123'` on an int, or varchar vs text mismatches) can prevent index use.
- **`SELECT *`** drags unneeded columns, kills covering-index/index-only scans, and breaks on schema change — list columns.
- **N+1 is invisible in ORM code** — looks like a clean loop; always check the query count.
- **Forgetting the reverse-direction index on a join table** (VMS lesson): PK `(a,b)` does *not* help lookups by `b`.
- **Postgres `REPEATABLE READ`/`SERIALIZABLE` can throw serialization failures** — your app must catch and **retry**, not crash.
- **`SERIALIZABLE` ≠ free** — lower throughput, more aborts; don't reach for it reflexively.
- **Deadlocks from inconsistent lock ordering** — always lock rows in the same order.
- **Read replica lag** breaks read-your-own-writes — route post-write reads to the primary.
- **Cache stampede** when a hot key expires — coalesce/lock/jitter TTL.
- **Cache invalidation** is the real hard part — a stale Redis entry after a write is the classic prod bug.
- **Don't run analytics on the OLTP primary** — heavy scans starve transactional traffic; use a replica/warehouse.
- **Materialized views are stale until refreshed** — know your freshness requirement; use `REFRESH ... CONCURRENTLY` to avoid locking readers.
- **`DELETE` of millions of rows is slow + bloats** — partition and `DROP`/`TRUNCATE` partitions instead.
- **UUID v4 PKs** cause random index inserts (page splits, poor locality) — prefer BIGSERIAL or time-ordered UUIDv7 if you need UUIDs.
- **pgvector exact KNN scans everything** — without an ANN index, similarity search is O(n); and an ANN index makes results **approximate** (recall < 100%), which you tune, not eliminate.
- **Highly selective metadata filter + ANN index can fight** — you may over-fetch then filter, or use a partial index.

---

*End of file. Replace every `[fill in: ...]` with a real, verifiable number before the interview.*
