import { useEffect, useState } from "react";
import {
  login,
  fetchNotes,
  createNote,
  deleteNote,
  getToken,
  clearToken,
} from "./api";

/**
 * Single-file demo app. It intentionally shows the patterns interviewers ask about:
 *   - useState for local state (auth, form fields, data, loading, error)
 *   - useEffect to fetch data after login (with a dependency + an "ignore" guard)
 *   - controlled form inputs (value + onChange bound to state)
 *   - loading / error / data rendering states
 *   - lists with stable keys
 * In a bigger app you'd split this into components and extract a useNotes() hook.
 */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>QuickNotes</h1>
      {loggedIn ? (
        <Notes onLogout={() => { clearToken(); setLoggedIn(false); }} />
      ) : (
        <Login onLoggedIn={() => setLoggedIn(true)} />
      )}
    </div>
  );
}

function Login({ onLoggedIn }) {
  // Controlled inputs: React state is the single source of truth.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      onLoggedIn();
    } catch {
      setError("Login failed — check your username/password.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Log in</h2>
      <input
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Log in</button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </form>
  );
}

function Notes({ onLogout }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Fetch notes once on mount. The `ignore` flag prevents setting state
  // after the component unmounts (a classic useEffect pitfall).
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchNotes()
      .then((data) => { if (!ignore) setNotes(data.results ?? data); })
      .catch((e) => { if (!ignore) setError(e.message); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const created = await createNote(title, body);
    setNotes((prev) => [created, ...prev]); // functional update: new state from old
    setTitle("");
    setBody("");
  }

  async function handleDelete(id) {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div>
      <button onClick={onLogout} style={{ float: "right" }}>Log out</button>

      <form onSubmit={handleCreate}>
        <h2>New note</h2>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <h2>Your notes</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!loading && !error && notes.length === 0 && <p>No notes yet.</p>}

      <ul>
        {notes.map((note) => (
          // Stable unique key (note.id), never the array index.
          <li key={note.id}>
            <strong>{note.title}</strong> — {note.body}
            <button onClick={() => handleDelete(note.id)} style={{ marginLeft: 8 }}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
