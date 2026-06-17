# SQL Question Bank

> Shows up in coding screens & tech rounds. Write queries BY HAND on Day 1. ⭐ = very likely.

## ⭐ Joins (know cold)
- **INNER JOIN** — rows matching in both tables.
- **LEFT JOIN** — all left rows + matched right (NULLs where no match). Use to find "rows in A with no B": `LEFT JOIN ... WHERE b.id IS NULL`.
- **RIGHT JOIN** — mirror of left.
- **FULL OUTER JOIN** — all rows from both, matched where possible.
- **CROSS JOIN** — Cartesian product.
- **SELF JOIN** — join a table to itself (e.g., employee → manager).

```sql
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC;
```

## ⭐ WHERE vs HAVING
`WHERE` filters rows **before** aggregation; `HAVING` filters **after** `GROUP BY` (on aggregates). You can't use an aggregate in `WHERE`.

## ⭐ GROUP BY / aggregates
`COUNT, SUM, AVG, MIN, MAX`. Every non-aggregated selected column must be in `GROUP BY`.

## ⭐ Logical order of execution (why aliases sometimes fail)
`FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT`.
That's why you can't reference a `SELECT` alias in `WHERE` (SELECT runs later) but can in `ORDER BY`.

## ⭐ Window functions (mid-level signal)
Compute across a set of rows **without collapsing** them (unlike GROUP BY).
```sql
SELECT name, dept, salary,
  RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rank_in_dept,
  AVG(salary) OVER (PARTITION BY dept) AS dept_avg
FROM employees;
```
Know: `ROW_NUMBER` (unique seq), `RANK` (gaps on ties), `DENSE_RANK` (no gaps), `LAG`/`LEAD` (prev/next row).

## ⭐ Classic question: 2nd highest salary
```sql
-- Window-function way
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) r FROM employees
) t WHERE r = 2;

-- Subquery way
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
```

## ⭐ Find duplicates
```sql
SELECT email, COUNT(*) FROM users
GROUP BY email HAVING COUNT(*) > 1;
```

## ⭐ Indexes
A data structure (usually B-tree) that speeds up lookups/filters/sorts on indexed columns — at the cost of slower writes + storage. Index columns used in WHERE/JOIN/ORDER BY. Too many indexes hurt writes. Composite index column order matters (leftmost-prefix rule).

## ⭐ How to optimize a slow query
1. `EXPLAIN`/`EXPLAIN ANALYZE` to see the plan (look for full table scans).
2. Add/adjust indexes on filter & join columns.
3. Select only needed columns (avoid `SELECT *`).
4. Avoid functions on indexed columns in WHERE (kills index use).
5. Reduce rows early (filter before join), paginate, denormalize hot paths if needed.

## ACID
**A**tomicity (all-or-nothing), **C**onsistency (valid state), **I**solation (concurrent txns don't interfere), **D**urability (committed = persisted). Why relational DBs are safe for money/critical data.

## Normalization vs denormalization
Normalization removes redundancy (1NF/2NF/3NF) → data integrity, more joins. Denormalization adds redundancy → faster reads, harder writes/consistency. Trade read speed vs write complexity.

## Transactions
```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- or ROLLBACK on error
```

## Subquery vs CTE vs JOIN
CTEs (`WITH x AS (...)`) improve readability for complex/recursive queries. Joins usually outperform correlated subqueries. Use whichever is clearest + check the plan.
