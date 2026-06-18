# Fractal Interview Prep — Engineer/Senior Engineer FullStack (React + Python/FastAPI, Cloud)

Role applied: *Engineer/Senior Engineer FullStack, React, and Python with FastAPI (Cloud Exp – Azure/AWS)* · Reports to Lead Architect · Fortune-500 "Data to Decision" client project.

**Pipeline (from Glassdoor reviews):** HackerEarth OA → Tech Round 1 (OOP/REST + coding) → Tech Round 2 / LLD (API design + React) → Managerial → sometimes a Client round.

**Your headline:** strong match on AI/data-integration + dashboards (TARA, VMS), average match on cloud — and the cloud here leans **Azure**, not the AWS you were prepping. Don't undersell the React you've actually shipped.

---

## PART 1 — Scripted talking points (memorize these first)

These are your "tell me about a project" anchors. Adapt the wording; fill in the `[...]` with your real specifics.

### 1A. TARA Copilot — your strongest card

> **Pitch:** "I built TARA Copilot, a RAG-based AI assistant that helps our cybersecurity team do Threat Analysis and Risk Assessment under ISO 21434. It runs entirely on-premise — LLaMA 3.1 8B served via Ollama, SecureBERT embeddings, pgvector as the vector store, a FastAPI backend, and a React frontend. The point was to take unstructured threat/security knowledge and serve grounded answers through a clean API, without sending sensitive automotive security data to any external cloud LLM."

**Maps to JD:** "integrate algorithmic output from the data science team via backend REST APIs," "GenAI and MLOps concepts," FastAPI, React, performance.

**Prep these follow-ups:**
- *Why on-prem / local LLM?* → Data sensitivity. Automotive security + customer data can't leave the network; rules out hosted LLM APIs. Trade-off: you own latency, GPU/infra, and ops.
- *Walk me through the RAG flow.* → Documents chunked → embedded with SecureBERT → stored in pgvector → at query time, embed the question, retrieve top-k by cosine similarity, inject into the LLaMA prompt as context, generate. Mention you control the prompt template + retrieval count.
- *Why SecureBERT over a generic embedder?* → Domain-tuned on security text, so retrieval relevance is higher for CVE/threat language than a general-purpose model.
- *Why pgvector instead of a dedicated vector DB (Pinecone/Weaviate)?* → Postgres was already in the stack; one fewer system to run; scale was well within pgvector's range. Honest, senior-sounding answer.
- *How do you keep it from hallucinating / how do you evaluate it?* → Grounding via retrieved context, [your approach: citing sources, confidence thresholds, manual spot-checks]. Be honest about what you measured.
- *Scaling/latency with an 8B model?* → [your real numbers — tokens/sec, concurrency limits, GPU]. If you didn't load-test, say so and say how you'd approach it.

### 1B. VMS — your performance + dashboard story

> **Pitch:** "I built a Vulnerability Management System on Django/FastAPI + React. It pulls CVE data from the NVD, models the many-to-many CPE-to-CVE relationships, and gives security analysts a dashboard to triage. The frontend handles large datasets — 3,500+ rows with virtualized rendering and inline editing — plus Chart.js analytics, bulk ticket creation into Jira, and role-based access."

**Maps to JD:** "dynamic infographics with intuitive user controls," Chart.js (named in JD), REST APIs, RBAC, React at scale.

**The performance sub-story (use when they ask "hardest problem" or "optimization"):**
> "The NVD sync originally took 16–18 hours. I got it to ~4 hours by [fill in: e.g. replacing per-row saves with bulk_create/bulk_update, batching/parallelizing the NVD API calls, adding indexes, and cutting redundant CPE-CVE lookups]."

Prep the *how you diagnosed it* part — profiling, slow-query analysis, finding the N+1 / sequential-call bottleneck. That's what separates a senior answer from "I made it faster."

**Follow-ups to prep:**
- *How did you render 3,500 rows without killing the browser?* → Windowing/virtualization (only render visible rows), why naive `.map()` of 3,500 rows tanks performance, keeping inline edits in sync with the virtualized list. **This is genuine senior-level React — lead with it when React depth comes up.**
- *How did you model CPE-CVE many-to-many?* → [your schema: join table, indexing strategy].
- *Concurrency during sync?* → ties into the multithreading/async question below.

---

## PART 2 — React drills (your known gap; the JD wants "expert ReactJS")

Order of attack:

**1. useEffect (the #1 probe).** Be automatic on:
- Dependency array: runs after render; `[]` = once on mount; `[x]` = when x changes; no array = every render.
- Cleanup function: returned fn runs before next effect + on unmount (cancel subscriptions, timers, fetches).
- **Stale closures:** an effect captures the values from the render it was created in. Practice spotting a `setInterval` that always logs the initial state, and fixing it with a functional update or correct deps.
- Practice prompt: *"This useEffect causes an infinite loop — why?"* (usually: setting state that's in the deps array, or an object/array dep recreated every render).

**2. Re-renders.** "What triggers a re-render?" → state change, prop change, parent re-render, context change. "It re-renders too much, fix it?" → `React.memo` (skip re-render if props equal), `useMemo` (cache expensive computation), `useCallback` (stable function identity so memo'd children don't re-render). Be ready to say *when each is premature* — don't memoize everything.

**3. Virtualization.** Your VMS dashboard. Have the windowing explanation tight (see 1B).

**4. Build a debounced search live.** Practice until automatic:
```jsx
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id); // cleanup cancels the pending timer
  }, [value, delay]);
  return debounced;
}
```
Then: input → `useDebounce` → `useEffect` fetch on the debounced value, with an `AbortController` in cleanup to kill stale requests. The cleanup + AbortController detail is what impresses.

**5. Fundamentals to have ready:** controlled vs uncontrolled inputs, lifting state up, keys (why index-as-key is a bug), Context vs Redux ("usually start with Context/local state, reach for Redux only when global state is genuinely complex").

**6. React Testing Library (JD names it under TDD).** Know the philosophy: test behavior, not implementation — query by what the user sees (`getByRole`, `getByText`), fire events, assert on output. Even a high-level grasp covers you.

---

## PART 3 — Azure crash sheet (the cloud is Azure-leaning, not AWS)

The JD names **Azure** specifically: WebApp, VM, Monitor, App Insights, Key Vault, Log Analytics, Logic Apps. Your honest position is on-prem (TARA) + VPS (Render/Hetzner). Use this framing line:

> "My production deployment experience is on-premise and self-managed VPS, so I think in terms of the underlying concepts — managed compute, secrets management, monitoring, logging. On Azure those map cleanly, and I'd ramp fast."

Then carry the concept → Azure mapping:

| Concept | AWS (what you studied) | **Azure (what they want)** |
|---|---|---|
| Run a web app (managed) | Elastic Beanstalk | **App Service / WebApp** |
| Raw VM | EC2 | **Virtual Machine (VM)** |
| Containers | ECS/Fargate | Container Apps / AKS |
| Serverless functions | Lambda | Azure Functions |
| Secrets / keys | Secrets Manager | **Key Vault** |
| Metrics + alarms | CloudWatch | **Azure Monitor** |
| App performance/tracing | X-Ray | **Application Insights** |
| Log aggregation/query | CloudWatch Logs | **Log Analytics** (KQL queries) |
| Workflow orchestration | Step Functions | **Logic Apps** |

If pushed on something you don't know, say so and pivot to the concept. Bluffing Azure depth is the fast way to lose a senior interview.

---

## PART 4 — Gaps to patch (quick brush-ups)

- **Python multithreading / async** — almost certain given "performance optimization and multithreading." Know: the GIL (why threads don't give CPU parallelism in CPython, but help for I/O), threads vs multiprocessing vs `asyncio`, and that **FastAPI is async** — `async def` + `await` for I/O-bound concurrency. Tie to your sync optimization.
- **TDD** — PyTest + React Testing Library are named. If your testing is thin, do a quick pass on PyTest fixtures/parametrize and RTL basics.
- **Data warehousing** — OLAP vs OLTP one-liner (OLTP = transactional, row-oriented, many small writes; OLAP = analytical, aggregations over large reads).
- **Microservices extras (good-to-have)** — RabbitMQ (message broker, decoupling/async work queues), Nginx (reverse proxy/load balancing), CI/CD (GitHub Actions/Jenkins). Your Docker/Coolify/Hetzner work touches these — frame it.
- **REST/API design** — "design a REST API for X": resources, verbs, status codes, versioning, pagination, auth. Swagger/Postman you already use.

---

## Suggested order this week

1. Lock the **two pitches** (TARA, VMS) — say them out loud until smooth.
2. **DSA easy-medium in Python** for the HackerEarth OA (this is the immediate gate — arrays, strings, hashmaps, two-pointer, recursion; clean STDIN/STDOUT).
3. **React drills** (useEffect → re-renders → debounced search → virtualization story).
4. **Azure mapping** + multithreading/async.
5. Skim the **gap-patch** list.

Your real edge: most candidates can't speak credibly about on-prem RAG + MLOps. You can. That's the differentiator on this JD.
