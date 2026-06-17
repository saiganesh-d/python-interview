# 5-Day Crash Plan — Fractal (Mid-level, Python + React + AWS)

**Rules of crash mode:**
- Depth over breadth. Master the high-yield list; ignore the rest.
- Talk out loud. Interviews are spoken — practice speaking, not just reading.
- The practice project is your anchor. Reference it in every answer you can.
- Sleep before the interview > one more topic. A tired brain fails the easy questions.

Estimated load: ~5–6 focused hours/day. Adjust blocks to your schedule.

---

## Day 1 — Python defense + SQL + DSA warm-up
*Goal: lock in your strongest pillar so it's free points.*

**Morning (2h)**
- [ ] Read & drill `questions/python.md` fully. Say every answer out loud.
- [ ] Focus extra on: decorators, generators (`yield`), context managers, mutability, `*args/**kwargs`, closures, GIL, `@classmethod` vs `@staticmethod`.

**Afternoon (2h)**
- [ ] `questions/sql.md` — joins, GROUP BY/HAVING, window functions, query optimization.
- [ ] Write 3 SQL queries by hand (no autocomplete): a JOIN, an aggregation, a subquery/CTE.

**Evening (1.5h)**
- [ ] DSA warm-up in Python (2–3 problems): one array/hashmap (two-sum style), one string (anagram/palindrome), one two-pointer/sliding-window. Use any judge.
- [ ] Re-state Big-O of: list append, dict lookup, sorting, nested loop.

**End of day:** note 3 shaky topics. ✍️

---

## Day 2 — React ramp (YOUR GAP — biggest day)
*Goal: go from "basics" to "can reason about hooks & re-renders."*

**Morning (2.5h)**
- [ ] Read `questions/react.md` end to end.
- [ ] Master in order: props vs state → `useState` → `useEffect` (dependency array + cleanup!) → `useContext` → `useRef` → `useMemo`/`useCallback`.
- [ ] Be able to explain in one sentence each: Virtual DOM, reconciliation, why `key` matters, what triggers a re-render.

**Afternoon (2.5h)**
- [ ] Hands-on: build a tiny React app from scratch (counter → todo list → fetch data from a public API and show loading/error states). This cements hooks far better than reading.
- [ ] Build a **controlled form** (inputs bound to state) — they love this.

**Evening (1h)**
- [ ] Concept drill: "What's wrong with this `useEffect`?" type questions in `questions/react.md`.
- [ ] Skim Context API vs Redux (when you'd reach for each).

**End of day:** note 3 shaky topics. ✍️

---

## Day 3 — AWS architecture + System design
*Goal: at mid-level, talk architecture & trade-offs, not just "I spun up EC2."*

**Morning (2h)**
- [ ] `questions/aws.md` — the core services + IAM + the **deploy architecture** (memorize it cold).
- [ ] Be able to draw on a whiteboard: *React build → S3 + CloudFront; Django API → EC2/ECS behind ALB; data → RDS; secrets → IAM roles; logs → CloudWatch.*

**Afternoon (2.5h)**
- [ ] `questions/system-design.md` — REST API design, SQL vs NoSQL, caching, load balancing, horizontal vs vertical scaling, statelessness.
- [ ] Practice out loud: "Design a URL shortener" and "Design the backend for a notes app" (5 min each). Talk through API, DB schema, scaling.

**Evening (1h)**
- [ ] Read `project/DEPLOY-AWS.md` — connect the theory to your actual project.

**End of day:** note 3 shaky topics. ✍️

---

## Day 4 — Build the project + Django/DRF deep + talk track
*Goal: a working app you can demo and explain at every layer.*

**Morning (2.5h)**
- [ ] Get `project/` running locally (backend + frontend). Follow `project/README.md`.
- [ ] Understand every file. This IS your interview demo.

**Afternoon (2h)**
- [ ] Django/DRF deep dive (in `questions/python.md` → Django section): ORM, `select_related`/`prefetch_related` (N+1), serializers, viewsets, JWT auth, migrations, middleware.
- [ ] Extend the project slightly (add one field or endpoint) so you've genuinely touched the code.

**Evening (1.5h)**
- [ ] Write your **project talk track**: 90-second pitch of what it does + architecture diagram in words + 3 trade-offs you made + 1 thing you'd improve. Rehearse it.

**End of day:** note 3 shaky topics. ✍️

---

## Day 5 — Behavioral + mock + consolidation
*Goal: integrate everything, fix gaps, build confidence.*

**Morning (2h)**
- [ ] `questions/behavioral.md` — write out 5 STAR stories (proud project, hard bug, conflict/disagreement, tight deadline, something you learned fast). Rehearse out loud.
- [ ] Prepare 3 smart questions to ask THEM (shows seniority).

**Afternoon (2h)**
- [ ] Full mock: have a friend (or talk to yourself / record) run: 2 Python Qs, 2 React Qs, 1 AWS architecture Q, 1 system design, project walkthrough, 2 behavioral.
- [ ] Review all your "shaky topics" notes from days 1–4.

**Evening (light)**
- [ ] Light flashcard skim only. No new topics.
- [ ] Logistics: confirm time/link, test camera/mic if remote, prep IDE, water, notebook.
- [ ] **Sleep early.**

---

## High-yield priority list (if you run out of time, do THESE)
1. React hooks (`useState`/`useEffect` + dependency array + cleanup) and re-render mental model
2. The AWS deploy architecture (draw it from memory)
3. Your project talk track (90 sec + trade-offs)
4. Python: decorators, generators, mutability, OOP
5. System design: REST + DB + caching + scaling basics
6. 5 STAR behavioral stories

## What to consciously SKIP in crash mode
- Deep DSA/DP grinding (do warm-ups only)
- Advanced Redux middleware / Redux Toolkit internals
- Niche AWS services (Kinesis, Step Functions, etc.) — name-drop awareness only
- Kubernetes deep internals (know what ECS/EKS are for)
