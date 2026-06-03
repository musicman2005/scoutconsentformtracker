import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGroups, createGroup, updateGroup, deleteGroup } from "../api";
import Modal from "../components/Modal";

const SECTIONS = ["Joey Scouts", "Cub Scouts", "Scouts", "Venturers", "Rovers", "Leaders"];

function GroupForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({ name: initial.name ?? "", section: initial.section ?? "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">Group Name *</label>
        <input className="input" value={form.name} onChange={set("name")} required placeholder="e.g. 1st Anytown Scouts" />
      </div>
      <div>
        <label className="label">Section</label>
        <select className="input" value={form.section} onChange={set("section")}>
          <option value="">Select section…</option>
          {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Save</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Groups() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | "create" | group object

  const { data: groups = [], isLoading } = useQuery({ queryKey: ["groups"], queryFn: getGroups });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["groups"] });

  const create = useMutation({ mutationFn: createGroup, onSuccess: () => { invalidate(); setModal(null); } });
  const update = useMutation({ mutationFn: ({ id, data }) => updateGroup(id, data), onSuccess: () => { invalidate(); setModal(null); } });
  const remove = useMutation({ mutationFn: deleteGroup, onSuccess: invalidate });

  const handleSubmit = (form) => {
    if (modal === "create") create.mutate(form);
    else update.mutate({ id: modal.id, data: form });
  };

  if (isLoading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Groups</h2>
        <button className="btn-primary" onClick={() => setModal("create")}>+ Add Group</button>
      </div>

      {groups.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          No groups yet. Create your first scout group to get started.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Section</th>
                <th className="table-header">Created</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{g.name}</td>
                  <td className="table-cell">{g.section || <span className="text-gray-400">—</span>}</td>
                  <td className="table-cell text-gray-400">{new Date(g.created_at).toLocaleDateString()}</td>
                  <td className="table-cell text-right">
                    <button className="btn-secondary btn-sm mr-2" onClick={() => setModal(g)}>Edit</button>
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => { if (confirm(`Delete "${g.name}"?`)) remove.mutate(g.id); }}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal === "create" ? "New Group" : `Edit ${modal.name}`}
          onClose={() => setModal(null)}
        >
          <GroupForm initial={modal === "create" ? {} : modal} onSubmit={handleSubmit} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
