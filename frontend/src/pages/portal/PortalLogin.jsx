import { useState, useEffect } from "react";
import axios from "axios";

const API = "/api/portal";

export default function PortalLogin({ onLogin }) {
  const [authEnabled, setAuthEnabled] = useState(null);
  const [guardians, setGuardians] = useState([]);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/config`).then((r) => {
      setAuthEnabled(r.data.auth_enabled);
      if (!r.data.auth_enabled) {
        axios.get(`${API}/guardians`).then((r2) => setGuardians(r2.data));
      }
    });
  }, []);

  const testLogin = async (guardianId) => {
    setLoading(true);
    setError("");
    try {
      const r = await axios.post(`${API}/test-login`, { guardian_id: guardianId });
      onLogin(r.data);
    } catch (e) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const passwordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await axios.post(`${API}/login`, { email, password });
      onLogin(r.data);
    } catch (e) {
      setError(e.response?.data?.detail ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  if (authEnabled === null) return <p className="text-gray-500 text-center mt-12">Loading…</p>;

  // ── Auth mode ─────────────────────────────────────────────────────────────
  if (authEnabled) {
    return (
      <div className="card p-8 max-w-sm mx-auto mt-12">
        <h2 className="text-xl font-bold mb-1">Guardian Sign In</h2>
        <p className="text-sm text-gray-500 mb-6">Sign in to view and sign consent forms.</p>
        <form onSubmit={passwordLogin} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  // ── Test mode ─────────────────────────────────────────────────────────────
  const filtered = guardians.filter((g) => {
    const q = search.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.scout?.toLowerCase().includes(q) || g.email.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="card p-5 mb-4 bg-amber-50 border-amber-300 border">
        <p className="text-sm font-semibold text-amber-800">🧪 Test Mode Active</p>
        <p className="text-xs text-amber-700 mt-1">Authentication is disabled. Select any guardian below to sign in as them.</p>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-bold mb-3">Select a Guardian</h2>
        <input
          className="input mb-4"
          placeholder="Search by name, scout, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {filtered.map((g) => (
            <li key={g.id}>
              <button
                className="w-full text-left px-3 py-3 hover:bg-purple-50 transition-colors rounded"
                onClick={() => testLogin(g.id)}
                disabled={loading}
              >
                <p className="font-medium text-sm">{g.name}</p>
                <p className="text-xs text-gray-500">
                  {g.scout ? `Parent of ${g.scout}` : ""}{g.email ? ` · ${g.email}` : ""}
                </p>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="py-4 text-center text-gray-400 text-sm">No results</li>}
        </ul>
      </div>
    </div>
  );
}
