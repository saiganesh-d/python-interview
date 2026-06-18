# Fractal Interview — Master Q&A Bank

Deep, exhaustive question-and-answer study files for the **Engineer/Senior Engineer FullStack (React + Python/FastAPI, Cloud: Azure/AWS)** role at Fractal Analytics.

Built around the candidate's three real flagship projects — **TARA Copilot** (on-prem RAG), **VMS** (Vulnerability Management System), and **Secret Vault** (secrets management) — used as concrete examples throughout.

> These expand on the one-page strategy in [`../Fractal_Interview_Prep.md`](../Fractal_Interview_Prep.md). That file is the *map*; these are the *territory*.

---

## The pipeline (and which files cover each stage)

| Stage | What they test | Primary files |
|---|---|---|
| **HackerEarth OA** | Timed DSA, easy–medium, Python, STDIN/STDOUT | `08` |
| **Tech Round 1** | OOP/REST + live coding | `05`, `06`, `08`, `09` |
| **Tech Round 2 / LLD** | API design + React | `04`, `06`, `09` |
| **Project deep-dives** (any round) | Can you defend what you built? | `01`, `02`, `03` |
| **Managerial** | Ownership, trade-offs, communication | `12` |
| **Client round** (sometimes) | Business↔tech, professionalism, confidentiality | `12` |

---

## The files

### Project deep-dives (your differentiator — lead with these)
- **[`01-tara-copilot-rag-genai.md`](./01-tara-copilot-rag-genai.md)** — RAG, GenAI, LLMs, embeddings, vector search (pgvector), MLOps/eval, on-prem serving. *Your strongest card.*
- **[`02-vms-performance-dashboard.md`](./02-vms-performance-dashboard.md)** — Performance war story (16–18h → ~4h), React-at-scale (3,500+ row virtualization), CVE/CPE modeling, Chart.js, RBAC, Jira.
- **[`03-secret-vault-security.md`](./03-secret-vault-security.md)** — Secrets management, encryption at rest/in transit, crypto fundamentals, RBAC, audit logging, OWASP, Azure Key Vault.

### Core technical pillars
- **[`04-react-deep.md`](./04-react-deep.md)** — ⚠️ Known gap; JD wants "expert React." Hooks, useEffect deep, re-renders, virtualization, debounce, state mgmt, RTL/TDD. *Spend the most time here.*
- **[`05-python-async-threading-oop.md`](./05-python-async-threading-oop.md)** — GIL, threads/multiprocessing/asyncio, decorators, generators, context managers, OOP. *Your strongest pillar.*
- **[`06-fastapi-rest-api-design.md`](./06-fastapi-rest-api-design.md)** — REST design, status codes, Pydantic, dependency injection, async endpoints, auth/JWT, exposing ML output via REST.
- **[`07-azure-cloud.md`](./07-azure-cloud.md)** — Concept→Azure mapping (App Service, VM, Key Vault, Monitor, App Insights, Log Analytics, Logic Apps), KQL, deployment topology, honest framing.

### Foundations & breadth
- **[`08-dsa-hackerearth-python.md`](./08-dsa-hackerearth-python.md)** — The immediate gate. Patterns + full Python solutions, I/O templates, pattern-recognition cheat.
- **[`09-oop-lld-system-design.md`](./09-oop-lld-system-design.md)** — OOP pillars, SOLID, design patterns, LLD walkthroughs, system design framework + worked designs.
- **[`10-databases-sql-datawarehousing.md`](./10-databases-sql-datawarehousing.md)** — SQL (joins, windows, CTEs), indexing/N+1, transactions/isolation, pgvector, OLTP vs OLAP.
- **[`11-microservices-devops-cicd.md`](./11-microservices-devops-cicd.md)** — Monolith vs microservices, RabbitMQ, Nginx, Docker, CI/CD (GitHub Actions), observability.

### The human rounds
- **[`12-behavioral-managerial.md`](./12-behavioral-managerial.md)** — STAR stories from your projects, common behavioral Qs, managerial/client-round prep, questions to ask, gap-handling.

---

## How to use this bank

1. **Cover the answer, say it out loud, check.** Interviews are spoken — reading silently doesn't build recall.
2. **Lead with ⭐ questions** in each file — those are the very-likely ones.
3. **Replace every `[fill in: ...]`** with your real numbers/details. Those placeholders mark facts only you can verify — never recite an invented metric in an interview.
4. **Tie every answer back to a project.** "I did X in TARA/VMS/Secret Vault" beats abstract theory every time.

### Suggested order (mirrors the pipeline)
`08` (OA gate) → `04` + `05` + `06` (core coding rounds) → `01`/`02`/`03` (project defense) → `09` + `10` (LLD/design + data) → `07` + `11` (cloud/infra breadth) → `12` (behavioral/managerial).

> **The one thing that wins this interview:** be able to explain **one full-stack app you built**, at every layer, with the trade-offs. You have three. Most candidates can't speak credibly about on-prem RAG + MLOps. You can. That's the edge.
