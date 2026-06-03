import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSigningRequests, createSigningRequest, deleteSigningRequest,
  sendSigningRequest, sendReminder, markSigned,
  getScouts, getGuardians, getForms
} from "../api";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";

function CreateRequestForm({ scouts, guardians, forms, onSubmit, onCancel }) {
  const [form, setForm] = useState({ scout_id: "", guardian_id: "", form_template_id: "", notes: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const filteredGuardians = form.scout_id
    ? guardians.filter((g) => String(g.scout_id) === String(form.scout_id))
    : guardians;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, scout_id: Number(form.scout_id), guardian_id: Number(form.guardian_id), form_template_id: Number(form.form_template_id) }); }} className="space-y-4">
      <div>
        <label className="label">Scout *</label>
        <select className="input" value={form.scout_id} onChange={(e) => { set("scout_id")(e); setForm((f) => ({ ...f, guardian_id: "", scout_id: e.target.value })); }} required>
          <option value="">Select scout…</option>
          {scouts.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Guardian / Parent *</label>
        <select className="input" value={form.guardian_id} onChange={set("guardian_id")} required disabled={!form.scout_id}>
          <option value="">Select guardian…</option>
          {filteredGuardians.map((g) => <option key={g.id} value={g.id}>{g.first_name} {g.last_name} ({g.email})</option>)}
        </select>
        {form.scout_id && filteredGuardians.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">No guardians for this scout — add one in the Scouts page first.</p>
        )}
      </div>
      <div>
        <label className="label">Consent Form *</label>
        <select className="input" value={form.form_template_id} onChange={set("form_template_id")} required>
          <option value="">Select form…</option>
          {forms.filter((f) => f.active).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={form.notes} onChange={set("notes")} />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Create</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

const STATUS_FILTERS = ["all", "pending", "sent", "signed", "declined"];

export default function SigningRequests() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const [actionError, setActionError] = useState("");

  const { data: requests = [], isLoading } = useQuery({ queryKey: ["signing-requests"], queryFn: getSigningRequests });
  const { data: scouts = [] } = useQuery({ queryKey: ["scouts"], queryFn: () => getScouts() });
  const { data: guardians = [] } = useQuery({ queryKey: ["guardians"], queryFn: getGuardians });
  const { data: forms = [] } = useQuery({ queryKey: ["forms"], queryFn: getForms });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["signing-requests"] });

  const create = useMutation({ mutationFn: createSigningRequest, onSuccess: () => { invalidate(); setShowCreate(false); } });
  const remove = useMutation({ mutationFn: deleteSigningRequest, onSuccess: invalidate });

  const sendMutation = useMutation({
    mutationFn: sendSigningRequest,
    onSuccess: invalidate,
    onError: (e) => setActionError(e.response?.data?.detail ?? "Send failed"),
  });
  const remindMutation = useMutation({ mutationFn: sendReminder, onSuccess: invalidate });
  const signMutation = useMutation({ mutationFn: markSigned, onSuccess: invalidate });

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  if (isLoading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Signing Requests</h2>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Request</button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === s ? "bg-purple-700 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            {s}
            <span className="ml-1.5 text-xs opacity-70">
              {s === "all" ? requests.length : requests.filter((r) => r.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm flex justify-between">
          {actionError}
          <button onClick={() => setActionError("")}>&times;</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          {filter === "all" ? "No signing requests yet." : `No ${filter} requests.`}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Scout</th>
                <th className="table-header">Guardian</th>
                <th className="table-header">Form</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">
                    {r.scout ? `${r.scout.first_name} ${r.scout.last_name}` : "—"}
                  </td>
                  <td className="table-cell">
                    {r.guardian ? (
                      <div>
                        <p>{r.guardian.first_name} {r.guardian.last_name}</p>
                        <p className="text-xs text-gray-400">{r.guardian.email}</p>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="table-cell">{r.form_template?.name ?? "—"}</td>
                  <td className="table-cell"><StatusBadge status={r.status} /></td>
                  <td className="table-cell text-gray-400 text-xs">
                    {r.signed_at
                      ? <span className="text-green-600">Signed {new Date(r.signed_at).toLocaleDateString()}</span>
                      : r.sent_at
                      ? `Sent ${new Date(r.sent_at).toLocaleDateString()}`
                      : new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {r.status === "pending" && (
                        <button className="btn-primary btn-sm" onClick={() => sendMutation.mutate(r.id)} disabled={sendMutation.isPending}>
                          Send
                        </button>
                      )}
                      {r.status === "sent" && (
                        <>
                          <button className="btn-secondary btn-sm" onClick={() => remindMutation.mutate(r.id)}>Remind</button>
                          <button className="btn-primary btn-sm" onClick={() => signMutation.mutate(r.id)}>Mark Signed</button>
                        </>
                      )}
                      {r.status === "pending" && (
                        <button className="btn-secondary btn-sm" onClick={() => signMutation.mutate(r.id)}>Mark Signed</button>
                      )}
                      {r.opensign_sign_url && (
                        <a href={r.opensign_sign_url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">View Link</a>
                      )}
                      <button className="btn-danger btn-sm" onClick={() => { if (confirm("Delete this request?")) remove.mutate(r.id); }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal title="New Signing Request" onClose={() => setShowCreate(false)}>
          <CreateRequestForm
            scouts={scouts}
            guardians={guardians}
            forms={forms}
            onSubmit={(data) => create.mutate(data)}
            onCancel={() => setShowCreate(false)}
          />
          {create.isError && <p className="text-red-500 text-sm mt-2">{create.error?.response?.data?.detail ?? "Failed to create"}</p>}
        </Modal>
      )}
    </div>
  );
}
