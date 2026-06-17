# React Question Bank ⚠️ YOUR GAP — spend the most time here

> Mid-level interviewers won't accept "I know basics." Aim to reason about **hooks, re-renders, and data flow**.
> Drill out loud. ⭐ = very likely asked.

## Fundamentals

**⭐ What is React / why use it?**
A declarative, component-based UI library. You describe what the UI should look like for a given state; React efficiently updates the DOM when state changes. Benefits: reusable components, one-way data flow (predictable), Virtual DOM (efficient updates), huge ecosystem.

**⭐ What is JSX?**
JavaScript syntax extension that looks like HTML; compiles (via Babel) to `React.createElement()` calls. Lets you write markup in JS. Rules: one root element (or fragment `<>...</>`), `className` not `class`, `{}` for JS expressions, camelCase events (`onClick`).

**⭐ Props vs state?**
- **Props**: passed *in* from parent, read-only (immutable to the child), make components reusable.
- **State**: managed *inside* the component, mutable via setter, triggers re-render when changed.
- Rule of thumb: if data changes over time and the component owns it → state; if it comes from above → props.

**⭐ What is the Virtual DOM? / reconciliation?**
The Virtual DOM is an in-memory JS representation of the UI. On state change React builds a new VDOM tree, **diffs** it against the previous one (reconciliation), and applies only the minimal real-DOM changes. This is faster than re-rendering the whole DOM.

**⭐ Why are `key`s important in lists?**
Keys give each list item a stable identity so React can match old vs new elements during diffing — correctly reordering/reusing instead of destroying & recreating DOM. Use a stable unique id, **never the array index** if the list can reorder/insert/delete (causes bugs with state & inputs).

**Controlled vs uncontrolled components?**
Controlled: form input value is driven by React state (`value={x} onChange={...}`) — single source of truth, easy validation. Uncontrolled: DOM holds the value, read via `ref`. Prefer controlled.

**Functional vs class components?**
Modern React = function components + hooks. Classes use lifecycle methods (`componentDidMount`, etc.). Hooks replaced almost all class use cases with less boilerplate.

## Hooks (the core of mid-level React)

**⭐ `useState`?**
```jsx
const [count, setCount] = useState(0);
setCount(c => c + 1);  // functional update — use when new state depends on old
```
State updates are **asynchronous & batched**; reading `count` right after `setCount` gives the old value. Use the functional updater when the new value depends on the previous.

**⭐ `useEffect` — the big one?**
Runs side effects (data fetching, subscriptions, timers, manual DOM) *after* render.
```jsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);   // cleanup: runs before next effect & on unmount
}, [dep]);                          // dependency array
```
- `[]` → runs once after mount (like `componentDidMount`).
- `[dep]` → runs on mount + whenever `dep` changes.
- no array → runs after *every* render (usually a bug).
- **Cleanup function** prevents leaks (clear timers, unsubscribe, abort fetches).

**⭐ Common `useEffect` bugs (interviewers love these):**
1. Missing dependency → stale closure (effect uses old state/props).
2. Object/array/function in deps → new reference every render → infinite loop. Fix with `useMemo`/`useCallback` or move it.
3. Fetch without cleanup → setting state on an unmounted component (use an `AbortController` or `ignore` flag).
4. Putting a `setState` in the effect body that updates a dep → infinite loop.

**`useContext`?**
Consumes a Context value without prop-drilling. `const value = useContext(MyContext)`. Good for theme, auth user, locale. Caveat: every consumer re-renders when the context value changes.

**`useRef`?**
A mutable container (`ref.current`) that **persists across renders without causing a re-render**. Two uses: (1) access DOM nodes (`<input ref={inputRef}>`), (2) store mutable values (timer ids, previous value).

**`useMemo` vs `useCallback`?**
- `useMemo(() => expensiveCalc(a), [a])` → memoizes a **value**; recompute only when deps change.
- `useCallback(fn, [deps])` → memoizes a **function** reference; prevents passing a new function to memoized children every render.
- Don't over-use — only for genuinely expensive work or stable references passed to memoized children.

**Custom hooks?**
A function starting with `use` that composes other hooks to share stateful logic (e.g., `useFetch`, `useLocalStorage`). Reuse logic without HOCs/render props.

**⭐ Rules of Hooks?**
Only call hooks (1) at the top level (not in loops/conditions/nested functions) and (2) from React functions. This keeps hook call order stable across renders, which is how React tracks them.

## Data flow & state

**⭐ "Lifting state up"?**
When two siblings need the same state, move it to their nearest common parent and pass it down via props (+ callbacks to update). Single source of truth.

**One-way data binding?**
Data flows parent → child via props; children communicate up via callback props. Predictable, easier to debug than two-way binding.

**⭐ Context API vs Redux — when?**
- **Context**: low-frequency global values (theme, current user, locale). Simple, built-in.
- **Redux (Toolkit)**: large apps with complex, frequently-updated, shared state and the need for devtools/middleware/time-travel. More boilerplate.
- Rule: don't reach for Redux until Context + local state genuinely hurts.

**Redux core concepts?**
Single immutable **store**; you dispatch **actions** (`{type, payload}`); pure **reducers** compute the next state; components **select** slices. Redux Toolkit reduces boilerplate (`createSlice`, `configureStore`).

**⭐ How do you fetch data in React?**
In `useEffect` with `fetch`/`axios`, tracking three states: loading, data, error. Cancel on unmount. (See pattern below.) For real apps, libraries like React Query handle caching/retries.
```jsx
function useUsers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let ignore = false;
    fetch("/api/users")
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { if (!ignore) setData(d); })
      .catch(e => { if (!ignore) setError(e); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };   // avoid setState after unmount
  }, []);
  return { data, loading, error };
}
```

## Performance & misc

**⭐ What causes a re-render? How to optimize?**
A component re-renders when its **state changes**, its **parent re-renders**, or its **context value changes**. Optimize with: `React.memo` (skip re-render if props unchanged), `useMemo`/`useCallback` (stable values/functions), proper `key`s, code-splitting (`React.lazy` + `Suspense`), virtualization for long lists.

**`React.memo`?**
HOC that memoizes a component — re-renders only if its props change (shallow compare). Pair with `useCallback`/`useMemo` for the props.

**Controlled list / why not index as key — concrete bug?**
If you delete the first item of a list keyed by index, React thinks item 0 just changed text → input state/focus attaches to the wrong row.

**What is prop drilling and how to avoid?**
Passing props through many intermediate components that don't use them. Avoid with Context, component composition (`children`), or state libraries.

**Error boundaries?**
Class components with `componentDidCatch`/`getDerivedStateFromError` that catch render errors in their subtree and show a fallback UI instead of crashing the app.

**React Router basics?**
Client-side routing: `<BrowserRouter>`, `<Routes>`/`<Route path element>`, `<Link>`, `useNavigate`, `useParams`. Renders components based on URL without full page reloads (SPA).

**Keys to a strong React answer in the interview:**
1. Always mention the dependency array + cleanup when talking about `useEffect`.
2. Show you understand *why* React re-renders, not just that it does.
3. Reference your project's components when answering ("in my app I used `useEffect` to fetch notes...").
