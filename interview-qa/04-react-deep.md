# React Deep — Interview Study File (04)

> **Candidate:** Saiganesh — applying for *Engineer / Senior Engineer FullStack (expert ReactJS + Python/FastAPI, Cloud Azure/AWS)* at **Fractal Analytics**.
> **Why this file is long:** React is the explicit gap, but the JD wants *expert ReactJS*. This file takes you from solid → genuinely senior. The JD names: **dynamic infographics with intuitive user controls, Chart.js, React Testing Library, TDD**. Every section gives the **concept**, **how to say it out loud**, **follow-ups**, and a **when-NOT-to** (premature optimization).
>
> **Your three flagship React stories — weave these constantly:**
> - **VMS** — React frontend rendering **3,500+ rows** with **virtualization/windowing + inline editing**, **Chart.js** analytics, **RBAC**, **bulk actions**. *(Strongest React story — lead with virtualization.)*
> - **TARA Copilot** — React frontend for a **RAG chat assistant**: **streaming responses**, chat UI, FastAPI backend.
> - **Secret Vault** — React UI for secrets management: **forms**, **RBAC-gated views**.
>
> ⭐ = very likely to be asked. `[fill in: ...]` = plug in your real number before the interview.

---

## Table of Contents

1. [Fundamentals](#1-fundamentals)
2. [Hooks — Deep](#2-hooks--deep)
3. [Re-renders Mental Model](#3-re-renders-mental-model)
4. [Performance](#4-performance)
5. [Data Fetching](#5-data-fetching)
6. [State Management](#6-state-management)
7. [Forms](#7-forms)
8. [Streaming / Chat UI (TARA)](#8-streaming--chat-ui-tara)
9. [Testing — RTL + TDD](#9-testing--rtl--tdd)
10. [Modern React Awareness](#10-modern-react-awareness)
11. [Live-Coding Asks (Full Code)](#11-live-coding-asks-full-code)
12. [Rapid-fire Cheat Sheet](#12-rapid-fire-cheat-sheet)
13. [Traps & Gotchas (the bugs interviewers plant)](#13-traps--gotchas-the-bugs-interviewers-plant)

---

## 1. Fundamentals

### ⭐ **What is React, in one breath?**

**Out loud:** "React is a library for building UIs out of components. The core idea is declarative: I describe what the UI should look like for a given state, and React figures out the DOM mutations to get there. I don't manually touch the DOM — I change state, and React re-renders. Combined with one-way data flow and a component model, that makes complex UIs predictable. In VMS I had a grid of 3,500+ rows with inline editing, bulk actions, and RBAC — declarative rendering is what kept that manageable."

**Follow-up: Library or framework?** A library — it does the view layer. Routing, data fetching, build tooling are your choices (React Router, React Query, Vite). Next.js is the framework that wraps it.

---

### ⭐ **What is JSX and what does it compile to?**

**Out loud:** "JSX is syntactic sugar over function calls. `<Button onClick={fn}>Save</Button>` compiles to `React.createElement(Button, { onClick: fn }, 'Save')` — or with the modern JSX transform, `_jsx(Button, {...})`. The output is a plain JavaScript object — a React *element*, a lightweight description of what to render. It's not HTML and it's not a DOM node; it's a value I can pass around, return, and store."

```jsx
// JSX
const el = <h1 className="title">Hello {name}</h1>;

// Compiles roughly to:
const el = React.createElement('h1', { className: 'title' }, 'Hello ', name);

// Which evaluates to an object like:
// { type: 'h1', props: { className: 'title', children: ['Hello ', name] }, ... }
```

**Gotchas to mention:**
- `class` → `className`, `for` → `htmlFor` (reserved words in JS).
- Attributes are camelCase: `onClick`, `tabIndex`.
- `{}` embeds *expressions*, not statements — so a ternary works, an `if` doesn't.
- A component must return a single root (use a Fragment `<>...</>` to avoid a wrapper div).
- `{0 && <X/>}` renders `0` (a falsy *number* still renders!). Use `{count > 0 && <X/>}`.

---

### ⭐ **Components: function vs class — which and why?**

**Out loud:** "I write function components exclusively. Since hooks landed in React 16.8, function components can do everything classes did — state, lifecycle, context — with less boilerplate and better logic reuse via custom hooks. Classes are legacy; I only touch them in old codebases or for error boundaries, which still require a class today."

```jsx
function Greeting({ name }) {
  return <p>Hello, {name}</p>;
}
```

---

### ⭐ **Props vs state — what's the difference?**

**Out loud:** "Props are inputs passed *down* from a parent — read-only from the child's perspective, the child must never mutate them. State is data a component *owns* and can change over time; changing it triggers a re-render. Rule of thumb: if a value comes from above and the component just displays it, it's a prop. If the component is the source of truth and controls it, it's state. In VMS, the row data came down as props from the grid container, but 'which rows are selected for a bulk action' was local state in the toolbar."

| | Props | State |
|---|---|---|
| Owner | Parent | The component itself |
| Mutable by component? | No (read-only) | Yes (via setter) |
| Triggers re-render? | When parent passes new ones | Yes, when changed |
| Analogy | Function arguments | Function's local variables |

---

### ⭐ **What is one-way data flow?**

**Out loud:** "Data flows down via props; events flow up via callbacks. A parent owns state and passes both the value and an `onChange` handler down. The child calls the handler to *request* a change, but the parent decides. This makes the data flow traceable — when something's wrong on screen, I know the state lives above the component, not hidden inside it. It's the opposite of two-way binding where any component can mutate shared state."

```jsx
function Parent() {
  const [query, setQuery] = useState('');
  return <SearchBox value={query} onChange={setQuery} />; // data down, event up
}
function SearchBox({ value, onChange }) {
  return <input value={value} onChange={e => onChange(e.target.value)} />;
}
```

---

### ⭐ **Virtual DOM, reconciliation, and the diffing algorithm — explain it.**

**Out loud:** "The Virtual DOM is an in-memory tree of React elements — plain objects. When state changes, React builds a new tree and *diffs* it against the previous one (reconciliation), then applies the minimal set of real DOM mutations. Touching the real DOM is expensive; diffing JS objects is cheap. React's diff is O(n) because of two heuristics: (1) elements of different *types* are torn down and rebuilt rather than diffed deeply, and (2) for lists, it uses **keys** to match elements across renders instead of comparing by position."

**Follow-up: Is the Virtual DOM why React is fast?** "Honestly it's a *predictability* mechanism more than a raw-speed one — it lets me write declarative code and trust React to batch and minimize DOM work. A hand-tuned vanilla app can beat it. The win is developer productivity plus 'fast enough by default.'"

**Senior nuance — Fiber:** "Since React 16, the reconciler is *Fiber*, which makes rendering interruptible. That's what enables concurrent features like `useTransition` and time-slicing — React can pause low-priority work to keep the UI responsive."

---

### ⭐ **Keys — what are they, and why is index-as-key a bug? Give a concrete example.**

**Out loud:** "Keys tell React how to identify list items across renders so it can match old elements to new ones. Without a stable key, React falls back to position. The classic bug is using the array index as the key when the list can reorder, filter, or get items inserted — React thinks the item at position 2 is 'the same item' even though a different object now lives there, so it reuses the wrong DOM node and component state."

**Concrete example — the input-value bug (this is the one interviewers love):**

```jsx
// 🐛 BUG: index as key + an input with internal state
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo, index) => (
        <li key={index}>
          <input defaultValue={todo.text} />  {/* uncontrolled — keeps DOM state */}
        </li>
      ))}
    </ul>
  );
}
```

"If I delete the **first** todo, every remaining todo shifts up an index. React sees key `0` still exists, key `1` still exists, etc., so it keeps all the DOM nodes — but now the input that *was* todo[1] is rendered for todo[0]'s data slot. The visible text updates if controlled, but any uncontrolled DOM state (typed-but-not-committed text, focus, scroll, checkbox state) sticks to the wrong row. Fix: use a stable unique id."

```jsx
{todos.map(todo => (
  <li key={todo.id}>            {/* ✅ stable identity */}
    <input defaultValue={todo.text} />
  </li>
))}
```

**When is index-as-key fine?** "Only when the list is static — never reorders, never gets insertions/deletions in the middle, and items have no internal state. A render-once read-only list. Otherwise use a stable id."

**VMS tie-in:** "In the VMS grid, every row had a stable backend id, so I keyed on that. With virtualization the visible window changes constantly, so a positional key would have been catastrophic — inline-edit state would jump between rows as you scrolled."

---

### ⭐ **Controlled vs uncontrolled inputs.**

**Out loud:** "A controlled input has its value driven by React state — `value={state}` plus `onChange`. React is the single source of truth. An uncontrolled input keeps its own state in the DOM, and I read it via a ref or `defaultValue` when I need it. I default to controlled because it makes validation, conditional disabling, and formatting trivial — the value is always in state. I reach for uncontrolled for simple cases, file inputs (which *must* be uncontrolled), or when integrating non-React widgets."

```jsx
// Controlled
const [email, setEmail] = useState('');
<input value={email} onChange={e => setEmail(e.target.value)} />

// Uncontrolled
const ref = useRef(null);
<input defaultValue="" ref={ref} />;
// read later: ref.current.value
```

**Gotcha:** "`value={undefined}` then later a string flips React from uncontrolled to controlled and logs a warning. Initialize controlled inputs with `''`, never `undefined`."

**Secret Vault tie-in:** "The Secret Vault forms were controlled so I could validate secret names live, disable Save until valid, and mask values — all of which need the value in state."

---

### **Lifting state up — what and when?**

**Out loud:** "When two sibling components need to share or sync state, you move that state up to their nearest common parent and pass it down as props. The parent becomes the single source of truth. Classic example: a search input and a results list — the query lives in the parent, the input updates it, the list reads it. The alternative — each sibling holding its own copy — leads to them drifting out of sync."

---

### **Composition vs inheritance.**

**Out loud:** "React strongly favors composition. Instead of extending a base component, I compose by passing children and props. A `Card` doesn't subclass a `Panel`; it renders `{children}` and you nest whatever you want inside. For 'is this a special kind of X' I pass props or render-props; I essentially never use class inheritance for UI. Composition keeps components flexible and avoids deep fragile hierarchies."

```jsx
function Card({ title, children }) {
  return <section className="card"><h3>{title}</h3>{children}</section>;
}
<Card title="Analytics"><Chart data={data} /></Card>
```

---

### **Fragments — why?**

**Out loud:** "A component returns one root. A Fragment lets me return multiple children without adding a wrapper DOM node — important for valid HTML like `<tr>`/`<td>` or for not polluting the DOM/CSS grid. Shorthand is `<>...</>`; if I need a key in a list of fragments I use the long form `<React.Fragment key={id}>`."

---

### **Conditional rendering — the idioms and the trap.**

```jsx
{isLoading && <Spinner />}                 // && for "render or nothing"
{error ? <Error msg={error} /> : <List />} // ternary for either/or
{items.length === 0 && <EmptyState />}     // explicit length check
```

**Trap:** "`{items.length && <List/>}` renders `0` when the array is empty, because `0` is falsy but still a renderable value. Always make the left side a real boolean: `items.length > 0 && ...`."

---

## 2. Hooks — Deep

### ⭐ **What are the Rules of Hooks, and why do they exist?**

**Out loud:** "Two rules. One: only call hooks at the top level — never inside conditions, loops, or nested functions. Two: only call them from React function components or other hooks. The reason is that React tracks hook state by *call order*, not by name — it's basically an array indexed by call position. If I call a hook conditionally, the order shifts between renders and React hands back the wrong state. The ESLint plugin `eslint-plugin-react-hooks` enforces both, including the exhaustive-deps rule."

```jsx
// 🐛 illegal — conditional hook breaks call-order tracking
if (user) { const [x] = useState(0); }

// ✅ call unconditionally, branch on the value
const [x, setX] = useState(0);
if (user) { /* use x */ }
```

---

### ⭐ **useState — batching, functional updates, lazy init.**

**Out loud:** "`useState` returns the current value and a setter. Three things interviewers probe:"

**1. Batching:** "Multiple `setState` calls in the same event handler are batched into one re-render. Since React 18, batching also covers promises, timeouts, and native event handlers (automatic batching), not just React events."

**2. Functional updates:** "When the new state depends on the old, pass a function: `setCount(c => c + 1)`. If I call `setCount(count + 1)` three times in a row, all three read the *same* stale `count` and I only advance by one. The functional form queues each update off the latest value."

```jsx
// 🐛 advances by 1, not 3 — all read the same `count`
setCount(count + 1); setCount(count + 1); setCount(count + 1);

// ✅ advances by 3
setCount(c => c + 1); setCount(c => c + 1); setCount(c => c + 1);
```

**3. Lazy initialization:** "If the initial state is expensive to compute, pass a *function* so it runs only on the first render: `useState(() => expensiveParse(data))`. `useState(expensiveParse(data))` would run that computation on *every* render and throw the result away."

```jsx
const [grid, setGrid] = useState(() => buildGridFromRows(rows)); // runs once
```

**State is immutable — never mutate:**
```jsx
// 🐛 mutates — React may not re-render (same reference)
todos.push(newTodo); setTodos(todos);
// ✅ new array reference
setTodos([...todos, newTodo]);
// objects:
setUser(u => ({ ...u, name: 'New' }));
```

---

### ⭐⭐ **useEffect — explain the dependency array semantics.**

**Out loud:** "`useEffect` runs *after* render and lets me synchronize with something outside React — subscriptions, timers, fetches, manual DOM. The dependency array controls *when* it re-runs:"

- **No array** → runs after **every** render.
- **`[]` empty** → runs **once** after mount (and cleanup on unmount).
- **`[a, b]`** → runs on mount and whenever `a` or `b` change (by `Object.is` reference comparison).

```jsx
useEffect(() => { /* every render */ });
useEffect(() => { /* mount only */ }, []);
useEffect(() => { /* when userId changes */ }, [userId]);
```

**Key framing:** "I don't think of the deps as 'when to run' — I think of them as 'what this effect *reads* from render scope.' Every reactive value the effect uses should be in the array. The linter's exhaustive-deps rule encodes exactly that. If a dep causes problems, I don't delete it — I change the code so I don't need it (functional updates, refs, or moving the value out)."

---

### ⭐ **The cleanup function — when does it run, exactly?**

**Out loud:** "If the effect returns a function, React runs it as cleanup. Timing: before the effect re-runs with new deps, *and* on unmount. So the sequence on an update is: cleanup of the old effect → run the new effect. That ordering is what prevents leaks — you tear down the old subscription before setting up the new one."

```jsx
useEffect(() => {
  const sub = api.subscribe(channelId, onMsg);
  return () => sub.unsubscribe();   // runs before next effect & on unmount
}, [channelId]);
```

**Always clean up:** subscriptions, timers (`clearInterval`/`clearTimeout`), event listeners (`removeEventListener`), `AbortController.abort()`, WebSocket close.

---

### ⭐⭐ **Stale closures — show me the classic setInterval bug and fix it (two ways).**

**Out loud:** "This is *the* useEffect gotcha. An effect captures the variables from the render it ran in. If I set up an interval once with `[]`, the callback closes over the `count` from the first render forever — it always sees `0`."

```jsx
// 🐛 THE BUG — counter freezes at 1
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1);   // `count` is captured as 0 forever
    }, 1000);
    return () => clearInterval(id);
  }, []); // empty deps → effect runs once → closure never updates
  return <p>{count}</p>;
}
```

**Fix 1 — functional updater (best, keeps `[]`):**
```jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1);   // no longer reads `count` from scope
  }, 1000);
  return () => clearInterval(id);
}, []); // honest empty deps — effect no longer depends on count
```

**Fix 2 — add `count` to deps (correct but resets the interval each tick):**
```jsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, [count]); // re-creates interval every change — works but churny
```

**Fix 3 — a ref to hold the latest value (when you genuinely need the latest of several values):**
```jsx
const countRef = useRef(count);
countRef.current = count; // keep ref current every render
useEffect(() => {
  const id = setInterval(() => setCount(countRef.current + 1), 1000);
  return () => clearInterval(id);
}, []);
```

**Say this:** "I default to Fix 1 — the functional updater. It's the cleanest because the effect stops depending on `count` at all, so the empty array is *honest*, not a lie that mutes the linter."

---

### ⭐ **What causes an infinite re-render loop with useEffect?**

**Out loud:** "Three common causes:"

1. **`setState` in an effect with no/missing deps that depends on that state.** Effect sets state → re-render → effect runs again → loop.
2. **An object/array/function dependency created fresh every render.** `[]` and `{}` literals are new references each render, so `Object.is` says they changed, so the effect re-runs every render, often re-setting state → loop.
3. **A dependency you mutate inside the effect.**

```jsx
// 🐛 object literal as dep — new reference every render → runs forever
const options = { sort: 'asc' };
useEffect(() => { fetchRows(options); }, [options]); // options is "new" each render

// ✅ depend on the primitive
useEffect(() => { fetchRows({ sort }); }, [sort]);

// or memoize the object
const options = useMemo(() => ({ sort }), [sort]);
useEffect(() => { fetchRows(options); }, [options]);
```

**Why object/array deps cause loops:** "Dependency comparison is *reference* equality (`Object.is`), not deep equality. `{} !== {}`. So any inline object, array, or function in the deps array is a brand-new reference every render and the effect always thinks it changed."

---

### ⭐ **Effect vs event handler — when does logic belong in an effect?**

**Out loud:** "A super common anti-pattern is stuffing logic into effects that should be in event handlers. The rule: effects are for *synchronization with external systems*, not for reacting to user actions. If something should happen *because the user did X*, put it in the X handler. If something should happen *because the component is now showing this data / this prop changed*, that's an effect."

```jsx
// 🐛 reacting to a click via effect is indirect and bug-prone
useEffect(() => { if (submitted) sendAnalytics(); }, [submitted]);

// ✅ just do it in the handler
function handleSubmit() { sendAnalytics(); setSubmitted(true); }
```

"Buying a product, showing a toast on click, POSTing a form — those are *events*, handle them in handlers. Subscribing to a socket, fetching when an id prop changes, syncing to localStorage — those are *effects*."

---

### ⭐ **useRef — two distinct uses.**

**Out loud:** "`useRef` gives a mutable container `{ current: ... }` that persists across renders and — crucially — mutating `.current` does **not** trigger a re-render. Two uses:"

**1. DOM access:**
```jsx
const inputRef = useRef(null);
useEffect(() => { inputRef.current?.focus(); }, []);
return <input ref={inputRef} />;
```

**2. A mutable instance value that shouldn't cause renders** — interval ids, previous values, 'has mounted' flags, latest-callback holders:
```jsx
const timerId = useRef(null);
timerId.current = setTimeout(...);   // change freely, no re-render
```

**Say this distinction:** "Use state for values that affect what's rendered. Use a ref for values you need to remember but that don't belong on screen. If changing it should repaint the UI, it's state, not a ref."

---

### ⭐ **useContext — and its big re-render caveat.**

**Out loud:** "Context passes data through the tree without prop-drilling — `createContext`, a `<Provider value={...}>`, and `useContext(Ctx)` to read. I use it for low-frequency global-ish values: theme, current user, auth, locale. The caveat: **every consumer re-renders whenever the Provider's `value` changes by reference.** So if I pass a fresh object `value={{ user, setUser }}` every render, *all* consumers re-render every render. Two fixes: memoize the value, and split contexts so unrelated data doesn't share a provider."

```jsx
// 🐛 new object every render → all consumers re-render constantly
<AuthCtx.Provider value={{ user, login, logout }}>

// ✅ memoize the value
const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
<AuthCtx.Provider value={value}>
```

**When NOT to use Context:** "It's not a state manager and it's bad for high-frequency updates (like a value that changes on every keystroke or every animation frame) — every consumer re-renders. For that, lift to a real store (Zustand/Redux) with selectors, or keep it local."

**RBAC tie-in:** "In Secret Vault and VMS, the current user's roles lived in an Auth context — low frequency, read everywhere for RBAC-gating views. Perfect Context use case."

---

### ⭐ **useMemo — what, and when is it premature?**

**Out loud:** "`useMemo` caches the *result* of a computation between renders, recomputing only when its deps change. Two legit reasons: (1) the computation is genuinely expensive — filtering/sorting thousands of rows; (2) I need a *stable reference* for an object/array I'm passing to a memoized child or to a dependency array."

```jsx
const visibleRows = useMemo(
  () => rows.filter(matchesFilters).sort(bySelectedColumn),
  [rows, filters, sortColumn]
);
```

**When it's premature:** "Memoizing trivial math like `a + b`. `useMemo` isn't free — it stores the value and runs a deps comparison every render. For cheap work that overhead can cost more than just recomputing. Default to *not* memoizing; reach for it when profiling shows a real cost or when reference identity actually matters."

**VMS tie-in:** "In the VMS grid I memoized the filtered+sorted dataset because re-filtering 3,500 rows on every keystroke or re-render was measurable — that one was earned, not premature."

---

### ⭐ **useCallback — and why inline functions break memoization.**

**Out loud:** "`useCallback(fn, deps)` returns the *same function reference* across renders until deps change. It's `useMemo` for functions. Its main use is keeping a stable callback identity so that a `React.memo`-wrapped child doesn't re-render just because the parent handed it a brand-new function — or so an effect that depends on the callback doesn't re-fire."

```jsx
// Without useCallback, onSelect is a new function each render →
// every memoized <Row> re-renders even if its data didn't change.
const onSelect = useCallback((id) => setSelected(id), []);
```

**The reference-equality point:** "Functions and objects are compared by reference. `() => {}` !== `() => {}`. So an inline arrow as a prop is a new value every render, which defeats `React.memo` on the child. `useCallback` (and `useMemo` for objects) fixes the identity."

**When it's premature:** "`useCallback` only helps if the consumer is actually memoized or the function is in a dependency array. Wrapping every handler 'just in case' adds clutter and its own overhead for zero benefit when the child isn't memoized. No memo downstream → no point."

---

### ⭐ **useReducer — when over useState?**

**Out loud:** "`useReducer` centralizes state transitions in a pure reducer `(state, action) => newState` and you `dispatch` actions. I reach for it when (1) the next state depends on the previous in complex ways, (2) several related values change together, or (3) state logic is complex enough that scattered `setState` calls become hard to follow. It also makes transitions testable in isolation and easy to move into context."

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'toggle':     return { ...state, [action.id]: !state[action.id] };
    case 'selectAll':  return action.ids.reduce((a, id) => ({ ...a, [id]: true }), {});
    case 'clear':      return {};
    default:           return state;
  }
}
const [selected, dispatch] = useReducer(reducer, {});
dispatch({ type: 'selectAll', ids: visibleIds });
```

**VMS tie-in:** "The VMS bulk-selection state — toggle one, select-all-on-page, clear, invert — was a natural `useReducer`. A pile of `useState` setters would have been spaghetti; one reducer made the transitions obvious and unit-testable."

---

### ⭐ **Custom hooks — what makes something a custom hook, and build three.**

**Out loud:** "A custom hook is just a function whose name starts with `use` and that calls other hooks. It's the primary way to *reuse stateful logic* — not UI — between components. It doesn't share state between components; each call gets its own. This is what replaced HOCs and render props for logic reuse."

**`useDebounce` — delay a fast-changing value:**
```jsx
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);   // cancel if value changes before delay
  }, [value, delay]);
  return debounced;
}
// usage:
const debouncedQuery = useDebounce(query, 300);
```

**`usePrevious` — remember the last value:**
```jsx
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; }); // runs after render, so ref holds prior value during render
  return ref.current;
}
```

**`useFetch` — with AbortController + race-safety:**
```jsx
function useFetch(url) {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();   // cancel stale request on url change/unmount
  }, [url]);

  return { data, error, loading };
}
```

"The AbortController is the senior detail — it cancels the in-flight request when `url` changes or the component unmounts, which kills both the leak warning *and* the race condition where a slow earlier response overwrites a fast later one."

---

## 3. Re-renders Mental Model

### ⭐ **What triggers a re-render?**

**Out loud:** "Four things: (1) its own **state** changes; (2) its **props** change because the parent re-rendered and passed new ones; (3) its **parent** re-renders — by default React re-renders the whole subtree, *regardless of whether props changed*; (4) a **context** it consumes changes value. The one people forget is #3: a parent re-render re-renders all children even if you didn't pass them anything new. That's not a bug — re-rendering is cheap because of the Virtual DOM diff. It only matters when a child's render is expensive."

**Crucial clarification:** "'Re-render' means React calls the component function and diffs the result. It does **not** mean the DOM updated — if the diff finds no changes, zero DOM mutations happen. So most re-renders are harmless. I only optimize the expensive ones."

---

### ⭐ **How do you STOP unnecessary re-renders? React.memo, useMemo, useCallback.**

**Out loud:** "Three tools, and they work together:"

- **`React.memo(Component)`** — wraps a component so it skips re-rendering when its props are shallow-equal to last time. This is the gate.
- **`useCallback`** — keeps function props referentially stable so the memo gate doesn't break.
- **`useMemo`** — keeps object/array props (and expensive values) referentially stable for the same reason.

```jsx
const Row = React.memo(function Row({ row, onEdit }) {
  /* expensive cell rendering */
});

function Grid({ rows }) {
  const onEdit = useCallback((id, val) => dispatch({type:'edit', id, val}), []);
  return rows.map(r => <Row key={r.id} row={r} onEdit={onEdit} />);
}
```

"The trap is that `React.memo` alone does nothing if the parent passes a new `onEdit` function or a new object literal every render — the shallow prop comparison fails and it re-renders anyway. That's why memo, useCallback, and useMemo are a *set*: the memo is the gate, the other two keep the props stable so the gate actually closes."

---

### ⭐ **Why do inline objects and functions break memoization?**

**Out loud:** "Because React compares props by reference (shallow `Object.is`). `style={{ color: 'red' }}` and `onClick={() => x}` create brand-new object/function values on every render — even though they look identical, `{} !== {}` and `(()=>{}) !== (()=>{})`. So a `React.memo` child sees 'a new prop' and re-renders. The fix is to hoist constants outside the component, or wrap them in `useMemo`/`useCallback` so the reference is stable across renders."

```jsx
// 🐛 new object + new function every render → memo'd child always re-renders
<Child style={{ color: 'red' }} onClick={() => doThing(id)} />

// ✅ stable references
const STYLE = { color: 'red' };                 // hoisted constant
const onClick = useCallback(() => doThing(id), [id]);
<Child style={STYLE} onClick={onClick} />
```

---

### **When is all this memoization premature?**

**Out loud:** "When the component is cheap to render and not memoized downstream. Memoization has a cost — extra memory, deps comparisons, and a lot of cognitive clutter. The right order is: write it simple, *measure* with the React Profiler, then optimize the components that actually show up hot. Premature `useMemo`/`useCallback` everywhere makes code harder to read for no measurable gain. I earned my memoization in VMS because the profiler showed the grid re-filtering and re-rendering thousands of rows; I would not sprinkle it on a settings form."

---

## 4. Performance

### ⭐⭐ **Virtualization / windowing — the VMS story. Explain it deeply.**

**Out loud:** "Virtualization (a.k.a. windowing) is rendering only the rows currently visible in the viewport plus a small **overscan** buffer, instead of all of them. In VMS I had 3,500+ rows; mounting 3,500 row components — each with multiple cells, inline-edit inputs, and event handlers — is tens of thousands of DOM nodes. That tanks initial render, scroll, and memory. With windowing, only the ~[fill in: e.g. 20–30] rows in view plus overscan are in the DOM at any time; as you scroll, React recycles them and renders the new window."

**How it works mechanically:**
1. The scroll container has a fixed height; an inner spacer is sized to `totalRows * rowHeight` so the scrollbar reflects the *full* list.
2. On scroll, compute `startIndex = floor(scrollTop / rowHeight)` and how many rows fit, then render `rows.slice(start - overscan, end + overscan)`.
3. Each visible row is absolutely positioned (or offset by a transform) at `index * rowHeight`.

```jsx
// Concept sketch (production uses react-window / react-virtuoso / TanStack Virtual)
function VirtualList({ rows, rowHeight = 36, height = 600, overscan = 5 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const total = rows.length;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(height / rowHeight) + overscan * 2;
  const end = Math.min(total, start + visibleCount);
  const slice = rows.slice(start, end);

  return (
    <div style={{ height, overflow: 'auto' }}
         onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: total * rowHeight, position: 'relative' }}>
        {slice.map((row, i) => (
          <div key={row.id}
               style={{ position: 'absolute', top: (start + i) * rowHeight,
                        height: rowHeight, width: '100%' }}>
            <Row row={row} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Say this:** "In production I'd reach for `react-window` or TanStack Virtual rather than hand-rolling — they handle variable row heights, horizontal virtualization, and edge cases. But I understand the mechanism: a sized spacer for the scrollbar, a computed visible window, overscan to avoid blank flashes during fast scroll, and stable keys so inline-edit state stays attached to the right row."

**Follow-ups:**
- **Why overscan?** "Renders a few rows beyond the viewport so fast scrolling doesn't flash blank before React catches up."
- **What's the trade-off?** "Ctrl-F/native find won't see off-screen rows, and you must manage focus/scroll restoration yourself. Also variable-height rows need measurement."
- **Inline editing + virtualization gotcha:** "Because rows unmount when scrolled out of view, the edited value must live in a parent store keyed by row id — not in the row's local state — or it's lost on scroll. That's the subtle bug and the reason stable keys matter."

---

### ⭐ **Code splitting — lazy + Suspense.**

**Out loud:** "Code splitting breaks the bundle into chunks loaded on demand so the initial download is smaller. `React.lazy(() => import('./X'))` makes a component load lazily, and `<Suspense fallback={...}>` shows a placeholder while the chunk loads. The natural split points are routes and heavy components — like the Chart.js analytics view in VMS, which pulls in the whole charting library and most users don't open immediately."

```jsx
const Analytics = React.lazy(() => import('./Analytics'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Analytics />
    </Suspense>
  );
}
```

**When NOT to:** "Don't split tiny components — the network round-trip for a 2KB chunk costs more than just shipping it. Split at meaningful boundaries: routes, modals, charts, editors."

---

### **Debouncing vs throttling — difference and when.**

**Out loud:** "Debounce waits for a pause: it fires only after the user stops for N ms — perfect for search-as-you-type so I don't hit the API on every keystroke. Throttle fires at most once per N ms regardless — good for scroll, resize, mousemove where I want regular updates but not on every event. In VMS the grid's filter box was debounced (~300ms) so filtering 3,500 rows didn't run on each character; the scroll handler driving virtualization was effectively throttled to a frame."

---

### ⭐ **Avoiding derived state — why is it an anti-pattern?**

**Out loud:** "Derived state is copying a prop into state, or storing something you could compute from existing state/props. It's a bug magnet because the copy goes stale when the source changes. The rule: if you can *compute* it during render, don't store it — just compute it. Only store it (memoized) if the computation is genuinely expensive."

```jsx
// 🐛 derived state — fullName goes stale when first/last change
const [fullName, setFullName] = useState(first + ' ' + last);

// ✅ just compute it during render
const fullName = `${first} ${last}`;

// ✅ if expensive, memoize — still not "state"
const sorted = useMemo(() => rows.slice().sort(cmp), [rows]);
```

---

### **Key-based remounts — a deliberate technique.**

**Out loud:** "Changing a component's `key` forces React to unmount the old instance and mount a fresh one — resetting all its state. It's a clean way to reset a form or a detail panel when the selected item changes, instead of writing an effect that manually resets every field."

```jsx
// When selectedSecretId changes, the editor remounts fresh — no stale draft.
<SecretEditor key={selectedSecretId} secret={secret} />
```

"In Secret Vault, switching which secret you're editing remounted the editor via `key`, so the previous draft never leaked into the next secret's form."

---

## 5. Data Fetching

### ⭐ **The four states of any fetch — and why empty matters.**

**Out loud:** "Every data fetch has four UI states: **loading**, **error**, **empty**, and **success-with-data**. Juniors handle loading and success and forget error and empty. An empty result is *not* an error — a filtered grid with zero matches should say 'no results,' not spin forever or show a broken table. I always render all four explicitly."

```jsx
if (loading) return <Spinner />;
if (error)   return <ErrorBanner message={error.message} onRetry={refetch} />;
if (!data?.length) return <EmptyState />;
return <Grid rows={data} />;
```

---

### ⭐⭐ **Race conditions in useEffect fetches — what's the bug and how do you fix it?**

**Out loud:** "If a search param changes faster than the network responds, responses can come back out of order. The user types 'ab' then 'abc'; the 'ab' response is slow and lands *after* 'abc' — now I'm showing results for the wrong query. The fix is to ignore stale responses, ideally by aborting them."

**Fix A — AbortController (best, also cancels the network):**
```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setResults)
    .catch(e => { if (e.name !== 'AbortError') setError(e); });
  return () => controller.abort();   // cancel the previous query's request
}, [query]);
```

**Fix B — an "ignore" flag (when you can't abort):**
```jsx
useEffect(() => {
  let ignore = false;
  fetchData(query).then(d => { if (!ignore) setResults(d); });
  return () => { ignore = true; };   // stale response is dropped
}, [query]);
```

"The cleanup runs before the next effect, so the previous request is either aborted or its result ignored. AbortController is better because it also stops wasting bandwidth and server work."

---

### ⭐ **When do you reach for React Query / SWR instead of useEffect?**

**Out loud:** "Plain `useEffect` fetching is fine for one-off, page-local data. But the moment I have *server state* shared across the app — lists that need caching, refetching, and consistency — I reach for React Query (TanStack Query) or SWR. They give you, out of the box: caching keyed by query, automatic **dedupe** of identical in-flight requests, **stale-while-revalidate** (show cached data instantly, refetch in the background), retry, pagination/infinite scroll, and cache invalidation on mutation. Re-implementing all that by hand with `useEffect` is exactly where homegrown data layers rot."

**Stale-while-revalidate:** "Return the cached value immediately so the UI is instant, then revalidate in the background and swap in fresh data. Users see something now, correctness follows."

```jsx
const { data, error, isLoading } = useQuery({
  queryKey: ['secrets', folderId],
  queryFn: () => fetchSecrets(folderId),
  staleTime: 30_000,
});
```

**When NOT to:** "For purely local UI state (a modal open flag, form draft) it's the wrong tool — that's client state. React Query is for *server* state."

---

### ⭐ **Optimistic updates — what and the rollback.**

**Out loud:** "An optimistic update applies the change in the UI *immediately*, before the server confirms, then rolls back if the request fails. It makes the app feel instant. The critical part is the rollback: snapshot the previous state, apply the optimistic change, and on error restore the snapshot and surface a toast."

```jsx
async function toggleEnabled(id) {
  const prev = rows;
  setRows(rs => rs.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)); // optimistic
  try {
    await api.toggle(id);
  } catch {
    setRows(prev);                 // rollback
    toast.error('Failed to update');
  }
}
```

"In VMS, bulk actions and inline edits used optimistic updates so the grid felt instant on a slow connection, with rollback if the API rejected. React Query formalizes this with `onMutate`/`onError`/`onSettled`."

---

## 6. State Management

### ⭐⭐ **Local vs lifted vs Context vs Redux vs Zustand — how do you choose?**

**Out loud:** "I escalate only as far as I need to. My ladder:"

1. **Local `useState`/`useReducer`** — default. State used by one component. (VMS bulk-selection reducer, form drafts.)
2. **Lift it up** — two siblings need it → move to common parent, pass via props.
3. **Context** — low-frequency, broadly-read values: theme, current user, auth/RBAC. Not for high-frequency updates.
4. **A dedicated store (Zustand / Redux)** — genuinely global, complex, frequently-updated client state read in many places, where prop-drilling and context re-renders hurt.

"The headline: **start local, lift when shared, Context for app-wide low-frequency, and reach for Redux/Zustand only when global state is genuinely complex.** Most apps never need Redux. Adding Redux on day one is the classic over-engineering tell."

**Zustand vs Redux:** "Zustand is a tiny store with a hook-based API and selectors — far less boilerplate, no providers required, and components subscribe to just the slice they read (so unrelated updates don't re-render them). Redux is more structured and has the bigger ecosystem/devtools; Redux Toolkit removed most of its old boilerplate. For new projects I lean Zustand unless the team's already standardized on Redux or needs its middleware ecosystem."

---

### ⭐ **Redux core — store, actions, reducers, dispatch.**

**Out loud:** "Redux is a single global **store** holding all state. You never mutate it directly. You `dispatch` an **action** — a plain object `{ type, payload }` describing what happened. A **reducer** — a pure function `(state, action) => newState` — computes the next state. Components read via `useSelector` and dispatch via `useDispatch`. The whole point is a single source of truth with predictable, traceable, time-travel-debuggable state transitions."

```js
// Action
{ type: 'rows/edited', payload: { id, value } }

// Reducer (pure, returns new state)
function rowsReducer(state = [], action) {
  switch (action.type) {
    case 'rows/edited':
      return state.map(r => r.id === action.payload.id
        ? { ...r, value: action.payload.value } : r);
    default: return state;
  }
}
```

**Redux Toolkit (RTK) awareness:** "Nobody writes vanilla Redux anymore. RTK is the official standard — `createSlice` generates actions and reducers together, uses Immer so you can 'mutate' draft state safely, includes the store setup, thunks for async, and **RTK Query** for data fetching. It cut Redux boilerplate by ~70%. If asked to use Redux, I use RTK."

```js
const rowsSlice = createSlice({
  name: 'rows',
  initialState: [],
  reducers: {
    edited(state, action) {                 // Immer lets this "mutate" safely
      const r = state.find(r => r.id === action.payload.id);
      if (r) r.value = action.payload.value;
    },
  },
});
```

---

## 7. Forms

### ⭐ **Controlled form — the basic pattern and validation.**

**Out loud:** "I keep field values in state, validate on change or on blur, disable submit while invalid, and prevent the default form submission. For validation I show errors per-field and a summary. For Secret Vault I validated the secret name format and required fields live, and disabled Save until the form was valid and dirty."

```jsx
function SecretForm({ onSave }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    else if (!/^[A-Z0-9_]+$/.test(name)) e.name = 'Use A–Z, 0–9, underscore';
    if (!value) e.value = 'Value is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (validate()) onSave({ name, value });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label>Name
        <input value={name} onChange={e => setName(e.target.value)}
               aria-invalid={!!errors.name} />
      </label>
      {errors.name && <span role="alert">{errors.name}</span>}

      <label>Value
        <input type="password" value={value}
               onChange={e => setValue(e.target.value)} />
      </label>
      {errors.value && <span role="alert">{errors.value}</span>}

      <button type="submit">Save</button>
    </form>
  );
}
```

---

### ⭐ **Large forms — why controlled-everything can hurt, and React Hook Form.**

**Out loud:** "For a big form, making *every* field controlled means every keystroke re-renders the whole form, which gets janky at scale. That's where React Hook Form shines: it uses uncontrolled inputs with refs under the hood, so typing in one field doesn't re-render the others — it's fast by default. You register fields, it handles validation (with resolvers for Zod/Yup schemas), tracks dirty/touched, and gives you `handleSubmit`. For anything beyond a few fields I'd reach for RHF rather than hand-rolling controlled state."

```jsx
const { register, handleSubmit, formState: { errors } } = useForm();
<form onSubmit={handleSubmit(onSave)}>
  <input {...register('name', { required: 'Required', pattern: /^[A-Z0-9_]+$/ })} />
  {errors.name && <span role="alert">{errors.name.message}</span>}
</form>
```

**When controlled is still right:** "When fields are interdependent — one field's value changes another's options, live formatting, cross-field validation on every keystroke — controlled state (or RHF's `watch`) earns its cost."

---

## 8. Streaming / Chat UI (TARA)

### ⭐⭐ **How do you render streamed LLM tokens in a React chat UI? (TARA)**

**Out loud:** "TARA was a RAG chat assistant — the FastAPI backend streamed tokens as they were generated, so the user sees the answer build up like a typewriter instead of waiting for the whole response. On the client I read the streaming response body and append chunks to the in-progress message's state as they arrive."

```jsx
async function sendMessage(prompt, signal) {
  // append the user message, then a placeholder assistant message
  const assistantId = crypto.randomUUID();
  setMessages(m => [...m, { id: assistantId, role: 'assistant', text: '' }]);

  const res = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
    signal,                                  // abortable
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    setMessages(m => m.map(msg =>
      msg.id === assistantId ? { ...msg, text: msg.text + chunk } : msg
    ));   // functional update — append to latest text, no stale closure
  }
}
```

**Key points to call out:**
- **Functional state update** when appending chunks — `m => ...` — so I never append to a stale snapshot.
- **AbortController** so the user can hit "Stop generating" and cancel the stream mid-flight.
- For SSE / token framing I'd parse `data:` events; the principle is the same: read incrementally, append to state.
- I'd **throttle** state updates if tokens arrive extremely fast (batch a few tokens per render) to avoid hundreds of re-renders a second.

---

### ⭐ **Auto-scroll in a chat — the gotcha.**

**Out loud:** "On each new chunk/message I scroll the message container to the bottom — but only if the user is already near the bottom. If they've scrolled up to read history, force-scrolling them back down is infuriating. So I check the scroll position before auto-scrolling, and I use a ref to the bottom sentinel."

```jsx
const bottomRef = useRef(null);
const containerRef = useRef(null);

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);   // re-run as messages/tokens grow
```

---

## 9. Testing — RTL + TDD

### ⭐⭐ **React Testing Library philosophy — what does "test behavior not implementation" mean?**

**Out loud:** "RTL's guiding principle is: *the more your tests resemble how users use your software, the more confidence they give you.* So I test what the user sees and does — text on screen, clicking a button, a result appearing — not internal state, prop names, or which hooks fired. The payoff is tests that don't break when I refactor internals. If I rename a state variable or swap useState for useReducer, a good RTL test stays green because the behavior didn't change. Tests coupled to implementation (Enzyme-style `state()` / `instance()`) shatter on every refactor and give false confidence."

---

### ⭐ **How do you query elements? Why query by role/text?**

**Out loud:** "RTL pushes you toward *accessible* queries, in priority order: `getByRole` (button, textbox, heading — how assistive tech sees the page), then `getByLabelText` for form fields, `getByText`, and `getByPlaceholderText`. `getByTestId` is the last resort. Querying by role nudges me toward accessible markup — if I can't find a button by its role and name, neither can a screen reader. I avoid querying by class or DOM structure because those are implementation details."

**Query variants:**
- `getBy*` — throws if not found (assert it exists *now*).
- `queryBy*` — returns null if not found (assert something is *absent*).
- `findBy*` — returns a promise, retries until it appears (for *async* — data that loads).

---

### ⭐ **fireEvent vs userEvent?**

**Out loud:** "`userEvent` simulates real user interactions more faithfully — a `type` fires keydown/keypress/input/keyup, respects disabled elements, moves focus — whereas `fireEvent` dispatches a single raw DOM event. I prefer `userEvent` for anything a human does (typing, clicking, tabbing) and only drop to `fireEvent` for low-level cases. In v14 `userEvent` is async, so I `await` it."

---

### ⭐ **Write a real RTL test.**

**Out loud:** "Here's a test for a search component that fetches and renders results — covering loading, the async result, and mocking fetch."

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBox from './SearchBox';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, name: 'VMS' }]) })
  );
});
afterEach(() => jest.restoreAllMocks());

test('shows results after the user searches', async () => {
  const user = userEvent.setup();
  render(<SearchBox />);

  // query by accessible role/name — how a user finds it
  const input = screen.getByRole('textbox', { name: /search/i });
  await user.type(input, 'vms');

  // findBy* waits for the async result to appear
  expect(await screen.findByText('VMS')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('vms'));
});

test('shows an empty state when there are no matches', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
  const user = userEvent.setup();
  render(<SearchBox />);
  await user.type(screen.getByRole('textbox', { name: /search/i }), 'zzz');

  expect(await screen.findByText(/no results/i)).toBeInTheDocument();
});
```

---

### ⭐ **What should you test (and not)?**

**Out loud:** "I test behavior users depend on: does submitting a valid form call the API; does an invalid form show errors; do the four fetch states (loading/error/empty/data) each render; does clicking 'select all' check the rows. I don't test implementation: internal state values, whether a specific hook ran, or styling. And I don't re-test the library — I trust React and Chart.js work; I test *my* integration."

---

### ⭐ **TDD — explain red-green-refactor, and how you'd actually do it.**

**Out loud:** "TDD is write-the-test-first. The cycle is **red → green → refactor**: (1) **Red** — write a failing test that describes the behavior you want; (2) **Green** — write the minimum code to make it pass, even if ugly; (3) **Refactor** — clean up the code with the test as a safety net. Repeat in tiny loops. The benefits are designing the API from the consumer's side first, guaranteed coverage, and the freedom to refactor fearlessly. For a `useDebounce` hook I'd first write a test asserting the value updates only after the delay (with fake timers), watch it fail, implement the hook, watch it pass, then refactor."

```jsx
// RED — write the failing test first
test('updates only after the delay', () => {
  jest.useFakeTimers();
  const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
    initialProps: { v: 'a' },
  });
  rerender({ v: 'ab' });
  expect(result.current).toBe('a');          // not yet — still debouncing
  act(() => jest.advanceTimersByTime(300));
  expect(result.current).toBe('ab');         // now updated
});
// GREEN: implement useDebounce. REFACTOR: tidy with the test guarding you.
```

---

## 10. Modern React Awareness

### ⭐ **Server Components / Next.js at a high level.**

**Out loud:** "React Server Components (RSC) run on the server and render to a serialized format the client merges in — they ship *zero* JavaScript for that component, can fetch data directly (async components, no `useEffect`), and access server resources. Client Components (marked `'use client'`) are the interactive ones that hydrate in the browser. Next.js App Router is the main framework built on this — components are server by default, you opt into client where you need state/effects/handlers. The win is smaller bundles and data-fetching on the server; the model shift is that not everything runs in the browser anymore."

---

### ⭐ **Error boundaries — what and why still a class.**

**Out loud:** "An error boundary is a component that catches rendering errors in its subtree and shows a fallback instead of crashing the whole app to a white screen. It's still a class because it relies on `componentDidCatch`/`getDerivedStateFromError`, which have no hook equivalent yet — so in practice I use the `react-error-boundary` package's `<ErrorBoundary>` wrapper. Note: it catches *render* errors, not errors in event handlers or async code — those I handle with try/catch."

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { logToService(err, info); }
  render() {
    return this.state.hasError ? <Fallback /> : this.props.children;
  }
}
```

"In VMS I wrapped the Chart.js analytics panel in an error boundary so a bad dataset couldn't take down the whole grid."

---

### **Portals — what for?**

**Out loud:** "`createPortal(children, domNode)` renders children into a different DOM node while keeping them in the React tree (so context and events still work). It's for things that must escape parent overflow/z-index/clipping — modals, tooltips, dropdowns, toasts. The event bubbling still follows the React tree, not the DOM location, which is exactly what you want."

```jsx
return createPortal(<Modal />, document.getElementById('modal-root'));
```

---

### **useId — what problem does it solve?**

**Out loud:** "`useId` generates a stable unique id that's consistent between server and client render — so you can wire `htmlFor`/`id` for form-field-to-label associations without hydration mismatches. It's not for keys; it's for accessibility attributes."

```jsx
const id = useId();
<label htmlFor={id}>Email</label>
<input id={id} />
```

---

### ⭐ **useTransition and useDeferredValue — concurrent rendering.**

**Out loud:** "Both keep the UI responsive during expensive updates by marking work as low-priority. `useTransition` gives you `startTransition(fn)` — state updates inside it are interruptible, so urgent updates (like the input you're typing in) stay snappy while the expensive re-render (filtering a huge list) happens in the background, and `isPending` lets you show a subtle loading hint. `useDeferredValue(value)` is the value-level version — it gives you a 'lagging' copy of a value that updates at lower priority."

```jsx
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);          // lags behind for heavy work
const results = useMemo(() => filterHugeList(deferredQuery), [deferredQuery]);
// input stays responsive; the heavy filter renders at lower priority
```

"In a VMS-scale grid, deferring the filter value would keep typing in the filter box smooth even while thousands of rows re-filter."

---

## 11. Live-Coding Asks (Full Code)

> These are the most likely "build it now" prompts. Each is complete and runnable in spirit.

### ⭐⭐ **Build a debounced search with AbortController (the flagship ask).**

```jsx
import { useState, useEffect } from 'react';

// reusable debounce hook
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | empty | done
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]); setStatus('idle');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setResults(data);
        setStatus(data.length ? 'done' : 'empty');
      })
      .catch(err => {
        if (err.name !== 'AbortError') setStatus('error'); // ignore canceled requests
      });

    return () => controller.abort();   // cancel stale request → no race, no leak
  }, [debouncedQuery]);

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
      />
      {status === 'loading' && <p>Loading…</p>}
      {status === 'error'   && <p role="alert">Something went wrong.</p>}
      {status === 'empty'   && <p>No results.</p>}
      <ul>
        {results.map(r => <li key={r.id}>{r.name}</li>)}
      </ul>
    </div>
  );
}
```

**What to narrate while coding:** "Debounce so I don't fire on every keystroke; AbortController to cancel the previous request — that kills both the leak and the out-of-order race; and I render all four states explicitly. The `if (err.name !== 'AbortError')` guard stops a canceled request from flashing an error."

---

### ⭐ **Build a todo list (add, toggle, delete, filter).**

```jsx
import { useState } from 'react';

let nextId = 0;
const uid = () => `todo-${nextId++}`;   // stable ids — never use index as key

export default function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | done

  function addTodo(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos(ts => [...ts, { id: uid(), text: trimmed, done: false }]);
    setText('');
  }

  function toggle(id) {
    setTodos(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function remove(id) {
    setTodos(ts => ts.filter(t => t.id !== id));
  }

  // derived, NOT stored as state — computed during render
  const visible = todos.filter(t =>
    filter === 'all' ? true : filter === 'done' ? t.done : !t.done
  );

  return (
    <div>
      <form onSubmit={addTodo}>
        <input value={text} onChange={e => setText(e.target.value)}
               aria-label="New todo" />
        <button type="submit">Add</button>
      </form>

      <div>
        {['all', 'active', 'done'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
                  aria-pressed={filter === f}>{f}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p>Nothing here.</p>
      ) : (
        <ul>
          {visible.map(t => (
            <li key={t.id}>
              <label>
                <input type="checkbox" checked={t.done}
                       onChange={() => toggle(t.id)} />
                <span style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.text}
                </span>
              </label>
              <button onClick={() => remove(t.id)} aria-label={`Delete ${t.text}`}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Narrate:** "Stable ids not indices; immutable updates with functional setters; the filtered list is *derived* during render, not stored — avoiding stale derived state; and accessible labels so it's testable by role."

---

### ⭐ **Build a controlled form with validation.**

```jsx
import { useState } from 'react';

const initial = { name: '', email: '', role: 'viewer' };

export default function UserForm({ onSubmit }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  function setField(field, value) {
    setValues(v => ({ ...v, [field]: value }));
  }

  function validate(v) {
    const e = {};
    if (!v.name.trim()) e.name = 'Name is required';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) e.email = 'Valid email required';
    return e;
  }

  function handleBlur(field) {
    setTouched(t => ({ ...t, [field]: true }));
    setErrors(validate(values));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    setTouched({ name: true, email: true });
    if (Object.keys(errs).length === 0) onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="name">Name</label>
      <input id="name" value={values.name}
             onChange={e => setField('name', e.target.value)}
             onBlur={() => handleBlur('name')}
             aria-invalid={!!errors.name} />
      {touched.name && errors.name && <span role="alert">{errors.name}</span>}

      <label htmlFor="email">Email</label>
      <input id="email" type="email" value={values.email}
             onChange={e => setField('email', e.target.value)}
             onBlur={() => handleBlur('email')}
             aria-invalid={!!errors.email} />
      {touched.email && errors.email && <span role="alert">{errors.email}</span>}

      <label htmlFor="role">Role</label>
      <select id="role" value={values.role}
              onChange={e => setField('role', e.target.value)}>
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
        <option value="admin">Admin</option>
      </select>

      <button type="submit">Save</button>
    </form>
  );
}
```

**Narrate:** "Single state object, validate on blur and on submit, show errors only after a field is touched, `aria-invalid` and `role='alert'` for accessibility and testability, and `noValidate` so I control the messaging."

---

### ⭐ **Build a custom hook — useFetch with AbortController (asked directly).**

```jsx
import { useState, useEffect, useCallback } from 'react';

export function useFetch(url, options) {
  const [data, setData]     = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setLoading(true); setError(null);

    fetch(url, { ...options, signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, reloadKey]);   // options intentionally omitted — caller should memoize it

  return { data, error, loading, refetch };
}

// usage
function SecretsPanel({ folderId }) {
  const { data, loading, error, refetch } =
    useFetch(`/api/folders/${folderId}/secrets`);

  if (loading) return <Spinner />;
  if (error)   return <button onClick={refetch}>Retry</button>;
  if (!data?.length) return <p>No secrets in this folder.</p>;
  return <SecretsList items={data} />;
}
```

**Narrate:** "Abort on url change/unmount for race-safety and no leaks; a `refetch` via a reload key; all four states exposed. I'd note that `options` should be memoized by the caller, otherwise an inline object would re-trigger the effect every render — and in real life I'd just use React Query."

---

## 12. Rapid-fire Cheat Sheet

| Question | One-liner answer |
|---|---|
| **JSX compiles to?** | `React.createElement` / `_jsx` calls → plain element objects. |
| **Props vs state?** | Props = read-only inputs from parent; state = component-owned, triggers re-render. |
| **Why keys?** | Stable identity so React matches list items across renders. |
| **Index-as-key bug?** | Wrong DOM/state reused when list reorders/inserts/deletes. |
| **Controlled input?** | `value` from state + `onChange`; React is source of truth. |
| **useState functional update?** | `setX(x => …)` when next depends on prev; avoids stale value. |
| **useState lazy init?** | Pass a function — runs once: `useState(() => expensive())`. |
| **useEffect `[]`?** | Runs once on mount; cleanup on unmount. |
| **Cleanup runs when?** | Before next effect run + on unmount. |
| **Stale closure fix?** | Functional updater, or correct deps, or a ref. |
| **Infinite loop cause?** | setState in effect + missing deps, or object/array literal dep. |
| **useRef?** | Mutable `.current` that persists and does NOT re-render. |
| **useContext caveat?** | All consumers re-render when provider `value` changes by reference. |
| **useMemo vs useCallback?** | Memo a value vs memo a function (stable references). |
| **React.memo?** | Skips re-render if props shallow-equal; needs stable prop refs. |
| **What triggers re-render?** | Own state, new props, parent render, consumed context. |
| **Re-render = DOM update?** | No — only the diff result mutates the DOM. |
| **Virtualization?** | Render only visible rows + overscan; sized spacer for scrollbar. |
| **Race condition fix?** | AbortController in effect cleanup (or ignore flag). |
| **React Query for?** | Server state: cache, dedupe, stale-while-revalidate, invalidation. |
| **Optimistic update?** | Apply immediately, snapshot, roll back on error. |
| **State ladder?** | Local → lift → Context → Redux/Zustand (only if truly complex). |
| **Context for?** | Low-frequency app-wide values (theme, auth/RBAC). |
| **RTL philosophy?** | Test behavior via roles/text, not implementation. |
| **getBy/queryBy/findBy?** | exists-now / absent / async-appears. |
| **userEvent vs fireEvent?** | Realistic interaction (async) vs raw single event. |
| **TDD cycle?** | Red (failing test) → Green (make it pass) → Refactor. |
| **Error boundary?** | Class; catches *render* errors, not handlers/async. |
| **Portal?** | Render outside parent DOM (modals), keep React tree/events. |
| **useTransition?** | Mark updates low-priority; keep UI responsive; `isPending`. |
| **Server Components?** | Run on server, ship zero JS, fetch directly; `'use client'` to opt out. |
| **Fragment?** | Group children without an extra DOM node (`<>…</>`). |

---

## 13. Traps & Gotchas (the bugs interviewers plant)

**⭐ `{count && <X/>}` renders `0`.** A falsy number still renders. Use `count > 0 && <X/>`.

**⭐ Index as key + reorder/delete.** Reuses wrong DOM node; uncontrolled inputs/focus/checkbox state jump to the wrong row. Use stable ids.

**⭐ `setCount(count + 1)` thrice → +1.** Stale snapshot read three times. Use `setCount(c => c + 1)`.

**⭐ setInterval stale closure.** Empty-deps effect captures initial `count` forever. Fix with functional updater (best), correct deps, or a ref.

**⭐ Object/array literal in deps → infinite loop.** `{} !== {}` by reference, so the effect re-runs every render. Depend on primitives or `useMemo` the object.

**⭐ Mutating state in place.** `arr.push(x); setArr(arr)` — same reference, may not re-render. Always create a new array/object.

**Controlled→uncontrolled warning.** Initializing `value={undefined}` then a string. Initialize controlled inputs with `''`.

**Context value as a new object every render.** `value={{a, b}}` re-renders all consumers. `useMemo` the value; split contexts.

**`React.memo` that never skips.** Parent passes a fresh inline function/object prop each render → shallow compare fails. Stabilize with `useCallback`/`useMemo` or hoist constants.

**Derived state going stale.** Copying a prop into state. Compute during render (memoize if expensive) instead.

**Fetch race condition.** Fast-changing query → out-of-order responses overwrite correct data. AbortController in cleanup, or an `ignore` flag.

**Missing cleanup → leak/"can't set state on unmounted".** Effects with timers/subscriptions/fetches must return a cleanup.

**Calling hooks conditionally.** Breaks call-order tracking → wrong state. Always call at the top level.

**`async` directly on useEffect.** `useEffect(async () => …)` returns a promise, not a cleanup function. Define an inner async function and call it.

**Forgetting the empty state.** Spinning forever or rendering a broken empty table when data is `[]`. Render an explicit empty state.

**Virtualization + local row state.** Off-screen rows unmount, losing inline-edit state. Lift edit state to a parent store keyed by row id.

**Effect doing event-handler work.** Reacting to a click via an effect/flag. Put user-action logic in the handler; effects are for syncing with external systems.

**Premature memoization.** `useMemo`/`useCallback` everywhere on cheap components with no memoized children — overhead and clutter for zero gain. Measure with the Profiler first; default to simple code.

---

> **Closing posture for the interview:** lead with the VMS virtualization + inline-editing story (your strongest), reach for TARA on streaming/abortable requests, and Secret Vault on controlled forms + RBAC/Context. When unsure, say what you'd *measure* and *reach for* (Profiler, React Query, react-window) — senior is knowing the tool and the trade-off, not memorizing every API.
