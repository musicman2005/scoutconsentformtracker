import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getForms, createForm, updateForm, deleteForm } from "../api";
import axios from "axios";
import Modal from "../components/Modal";

function FormTemplateForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name ?? "",
    description: initial.description ?? "",
    opensign_template_id: initial.opensign_template_id ?? "",
    active: initial.active ?? true,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, opensign_template_id: form.opensign_template_id || null }); }} className="space-y-4">
      <div>
        <label className="label">Form Name *</label>
        <input className="input" value={form.name} onChange={set("name")} required placeholder="e.g. Annual Camp Consent" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={3} value={form.description} onChange={set("description")} placeholder="Brief description shown to guardians when they sign…" />
      </div>
      <div>
        <label className="label">OpenSign Template ID</label>
        <input className="input" value={form.opensign_template_id} onChange={set("opensign_template_id")} placeholder="Optional — leave blank for in-app signing" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="form-active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
        <label htmlFor="form-active" className="text-sm text-gray-700">Active</label>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Save</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function PdfUpload({ form, onDone }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await axios.post(`/api/forms/${form.id}/upload-pdf`, fd);
      qc.invalidateQueries({ queryKey: ["forms"] });
      onDone();
    } catch (e) {
      setError(e.response?.data?.detail ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePdf = async () => {
    if (!confirm("Remove the attached PDF?")) return;
    await axios.delete(`/api/forms/${form.id}/upload-pdf`);
    qc.invalidateQueries({ queryKey: ["forms"] });
    onDone();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">PDF Attachment for "{form.name}"</p>
      {form.pdf_filename ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded p-3">
          <span className="text-lg">📄</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">PDF attached</p>
            <a href={`/api/forms/${form.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-700 hover:underline">View PDF</a>
          </div>
          <button className="btn-danger btn-sm" onClick={removePdf}>Remove</button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No PDF attached yet.</p>
      )}
      <div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={upload} />
        <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : form.pdf_filename ? "Replace PDF" : "Upload PDF"}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button className="btn-secondary btn-sm" onClick={onDone}>Done</button>
    </div>
  );
}

export default function Forms() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);       // null | "create" | form object
  const [pdfModal, setPdfModal] = useState(null); // form object for PDF management

  const { data: forms = [], isLoading } = useQuery({ queryKey: ["forms"], queryFn: getForms });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["forms"] });
  const create = useMutation({ mutationFn: createForm, onSuccess: () => { invalidate(); setModal(null); } });
  const update = useMutation({ mutationFn: ({ id, data }) => updateForm(id, data), onSuccess: () => { invalidate(); setModal(null); } });
  const remove = useMutation({ mutationFn: deleteForm, onSuccess: invalidate });

  const handleSubmit = (form) => {
    if (modal === "create") create.mutate(form);
    else update.mutate({ id: modal.id, data: form });
  };

  if (isLoading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Form Templates</h2>
        <button className="btn-primary" onClick={() => setModal("create")}>+ Add Form</button>
      </div>

      {forms.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">No form templates yet.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Description</th>
                <th className="table-header">PDF</th>
                <th className="table-header">Status</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forms.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{f.name}</td>
                  <td className="table-cell max-w-xs truncate text-gray-500">{f.description || "—"}</td>
                  <td className="table-cell">
                    {f.pdf_filename ? (
                      <a href={`/api/forms/${f.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline text-sm">📄 View</a>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {f.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-cell text-right whitespace-nowrap">
                    <button className="btn-secondary btn-sm mr-2" onClick={() => setPdfModal(f)}>📄 PDF</button>
                    <button className="btn-secondary btn-sm mr-2" onClick={() => setModal(f)}>Edit</button>
                    <button className="btn-danger btn-sm" onClick={() => { if (confirm(`Delete "${f.name}"?`)) remove.mutate(f.id); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === "create" ? "New Form Template" : `Edit ${modal.name}`} onClose={() => setModal(null)}>
          <FormTemplateForm initial={modal === "create" ? {} : modal} onSubmit={handleSubmit} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {pdfModal && (
        <Modal title="Manage PDF" onClose={() => setPdfModal(null)}>
          <PdfUpload form={pdfModal} onDone={() => setPdfModal(null)} />
        </Modal>
      )}
    </div>
  );
}
