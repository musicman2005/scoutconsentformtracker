import { useState, useEffect } from "react";
import axios from "axios";
import SignForm from "./SignForm";
import StatusBadge from "../../components/StatusBadge";

const API = "/api/portal";

export default function PortalForms({ session, onLogout }) {
  const [data, setData] = useState(null);
  const [signing, setSigning] = useState(null); // the request being signed
  const [error, setError] = useState("");

  const load = () => {
    axios
      .get(`${API}/me`, { params: { token: session.access_token } })
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load your forms. Please try again."));
  };

  useEffect(load, [session]);

  if (signing) {
    return (
      <SignForm
        request={signing}
        token={session.access_token}
        onSigned={() => { setSigning(null); load(); }}
        onBack={() => setSigning(null)}
      />
    );
  }

  const pending = data?.signing_requests.filter((r) => r.status !== "signed" && r.status !== "declined") ?? [];
  const done = data?.signing_requests.filter((r) => r.status === "signed" || r.status === "declined") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Your Consent Forms</h2>
          <p className="text-sm text-gray-500 mt-0.5">Signed in as {session.guardian_name}</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={onLogout}>Sign out</button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!data ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          {/* Pending / awaiting signature */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Awaiting Signature {pending.length > 0 && <span className="ml-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs">{pending.length}</span>}
            </h3>
            {pending.length === 0 ? (
              <div className="card p-5 text-center text-gray-400 text-sm">No forms waiting for your signature. ✓</div>
            ) : (
              <ul className="space-y-3">
                {pending.map((r) => (
                  <li key={r.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{r.form_name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">For: {r.scout_name}</p>
                        {r.form_description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.form_description}</p>
                        )}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button className="btn-primary" onClick={() => setSigning(r)}>
                        Sign Now
                      </button>
                      {r.form_pdf && (
                        <a
                          href={`/api/forms/${r.form_template_id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                        >
                          📄 View PDF
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Completed */}
          {done.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Completed</h3>
              <ul className="space-y-2">
                {done.map((r) => (
                  <li key={r.id} className="card p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{r.form_name}</p>
                      <p className="text-xs text-gray-400">
                        {r.scout_name}
                        {r.signed_at && ` · Signed ${new Date(r.signed_at).toLocaleDateString()}`}
                        {r.signed_by_name && ` by ${r.signed_by_name}`}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
