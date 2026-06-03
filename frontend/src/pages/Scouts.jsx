import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getScouts, createScout, updateScout, deleteScout, getGroups, createGuardian, deleteGuardian } from "../api";
import Modal from "../components/Modal";

function ScoutForm({ initial = {}, groups, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    first_name: initial.first_name ?? "",
    last_name: initial.last_name ?? "",
    date_of_birth: initial.date_of_birth ?? "",
    group_id: initial.group_id ?? "",
    active: initial.active ?? true,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, group_id: form.group_id || null, date_of_birth: form.date_of_birth || null }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First Name *</label>
          <input className="input" value={form.first_name} onChange={set("first_name")} required />
        </div>
        <div>
          <label className="label">Last Name *</label>
          <input className="input" value={form.last_name} onChange={set("last_name")} required />
        </div>
      </div>
      <div>
        <label className="label">Date of Birth</label>
        <input className="input" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
      </div>
      <div>
        <label className="label">Group</label>
        <select className="input" value={form.group_id} onChange={set("group_id")}>
          <option value="">No group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.section ? ` (${g.section})` : ""}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
        <label htmlFor="active" className="text-sm text-gray-700">Active member</label>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Save</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function GuardianForm({ scoutId, onDone }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", relationship_to_scout: "", is_primary: true });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: (data) => createGuardian(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scouts"] }); onDone(); },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, scout_id: scoutId }); }} className="space-y-3 mt-4 pt-4 border-t">
      <p className="text-sm font-semibold text-gray-700">Add Guardian / Parent</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First Name *</label>
          <input className="input" value={form.first_name} onChange={set("first_name")} required />
        </div>
        <div>
          <label className="label">Last Name *</label>
          <input className="input" value={form.last_name} onChange={set("last_name")} required />
        </div>
      </div>
      <div>
        <label className="label">Email *</label>
        <input className="input" type="email" value={form.email} onChange={set("email")} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <label className="label">Relationship</label>
          <select className="input" value={form.relationship_to_scout} onChange={set("relationship_to_scout")}>
            <option value="">Select…</option>
            <option>Mother</option><option>Father</option><option>Guardian</option><option>Grandparent</option><option>Other</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary btn-sm" disabled={create.isPending}>Add Guardian</button>
        <button type="button" className="btn-secondary btn-sm" onClick={onDone}>Cancel</button>
      </div>
      {create.isError && <p className="text-red-500 text-xs">{create.error?.message}</p>}
    </form>
  );
}

export default function Scouts() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [showGuardianForm, setShowGuardianForm] = useState(false);
  const [selectedScout, setSelectedScout] = useState(null);

  const { data: scouts = [], isLoading } = useQuery({ queryKey: ["scouts"], queryFn: () => getScouts() });
  const { data: groups = [] } = useQuery({ queryKey: ["groups"], queryFn: getGroups });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["scouts"] });

  const create = useMutation({ mutationFn: createScout, onSuccess: () => { invalidate(); setModal(null); } });
  const update = useMutation({ mutationFn: ({ id, data }) => updateScout(id, data), onSuccess: () => { invalidate(); setModal(null); } });
  const remove = useMutation({ mutationFn: deleteScout, onSuccess: invalidate });
  const removeGuardian = useMutation({ mutationFn: deleteGuardian, onSuccess: invalidate });

  const handleSubmit = (form) => {
    if (modal === "create") create.mutate(form);
    else update.mutate({ id: modal.id, data: form });
  };

  const openScoutDetail = (scout) => {
    setSelectedScout(scout);
    setShowGuardianForm(false);
  };

  if (isLoading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Scouts</h2>
        <button className="btn-primary" onClick={() => setModal("create")}>+ Add Scout</button>
      </div>

      {scouts.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">No scouts yet.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Group</th>
                <th className="table-header">DOB</th>
                <th className="table-header">Status</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scouts.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">
                    <button className="text-purple-700 hover:underline" onClick={() => openScoutDetail(s)}>
                      {s.first_name} {s.last_name}
                    </button>
                  </td>
                  <td className="table-cell">{s.group?.name ?? <span className="text-gray-400">—</span>}</td>
                  <td className="table-cell">{s.date_of_birth ?? <span className="text-gray-400">—</span>}</td>
                  <td className="table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <button className="btn-secondary btn-sm mr-2" onClick={() => setModal(s)}>Edit</button>
                    <button className="btn-danger btn-sm" onClick={() => { if (confirm(`Delete ${s.first_name} ${s.last_name}?`)) remove.mutate(s.id); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scout edit/create modal */}
      {modal && (
        <Modal title={modal === "create" ? "Add Scout" : `Edit ${modal.first_name} ${modal.last_name}`} onClose={() => setModal(null)}>
          <ScoutForm initial={modal === "create" ? {} : modal} groups={groups} onSubmit={handleSubmit} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {/* Scout detail / guardians panel */}
      {selectedScout && (
        <Modal title={`${selectedScout.first_name} ${selectedScout.last_name} — Guardians`} onClose={() => setSelectedScout(null)}>
          <div className="space-y-2">
            {(selectedScout.guardians ?? []).length === 0 ? (
              <p className="text-gray-500 text-sm">No guardians added yet.</p>
            ) : (
              (selectedScout.guardians ?? []).map((g) => (
                <div key={g.id} className="flex items-center justify-between bg-gray-50 rounded p-3">
                  <div>
                    <p className="font-medium text-sm">{g.first_name} {g.last_name} {g.is_primary && <span className="text-xs text-purple-600">(Primary)</span>}</p>
                    <p className="text-xs text-gray-500">{g.email}{g.phone ? ` · ${g.phone}` : ""}{g.relationship_to_scout ? ` · ${g.relationship_to_scout}` : ""}</p>
                  </div>
                  <button className="btn-danger btn-sm" onClick={() => removeGuardian.mutate(g.id)}>Remove</button>
                </div>
              ))
            )}
            {!showGuardianForm && (
              <button className="btn-secondary btn-sm mt-2" onClick={() => setShowGuardianForm(true)}>+ Add Guardian</button>
            )}
            {showGuardianForm && (
              <GuardianForm scoutId={selectedScout.id} onDone={() => {
                setShowGuardianForm(false);
                // Refresh selected scout from updated list
                qc.invalidateQueries({ queryKey: ["scouts"] });
              }} />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
