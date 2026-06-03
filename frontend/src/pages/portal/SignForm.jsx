import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import axios from "axios";

const API = "/api/portal";

export default function SignForm({ request, token, onSigned, onBack }) {
  const canvasRef = useRef(null);
  const padRef = useRef(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      padRef.current?.clear();
      setIsEmpty(true);
    };

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "#1e1b4b",
    });
    padRef.current = pad;
    pad.addEventListener("endStroke", () => setIsEmpty(pad.isEmpty()));

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const clear = () => {
    padRef.current?.clear();
    setIsEmpty(true);
  };

  const submit = async () => {
    if (padRef.current?.isEmpty()) {
      setError("Please draw your signature above.");
      return;
    }
    if (!confirmed) {
      setError("Please tick the confirmation box.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const sigData = padRef.current.toDataURL("image/png");
      await axios.post(
        `${API}/sign/${request.id}`,
        { signature_data: sigData, confirmed: true },
        { params: { token } }
      );
      onSigned();
    } catch (e) {
      setError(e.response?.data?.detail ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-purple-700 hover:underline">← Back to my forms</button>

      <div className="card p-5">
        <h2 className="text-lg font-bold">{request.form_name}</h2>
        <p className="text-sm text-gray-500 mt-1">For: <strong>{request.scout_name}</strong></p>
        {request.form_description && (
          <p className="text-sm text-gray-700 mt-3 leading-relaxed">{request.form_description}</p>
        )}
        {request.form_pdf && (
          <a
            href={`/api/forms/${request.form_template_id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-purple-700 hover:underline"
          >
            📄 View full consent form (PDF)
          </a>
        )}
      </div>

      {/* Signature area */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Draw your signature</label>
          <button onClick={clear} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden" style={{ height: 160 }}>
          <canvas ref={canvasRef} className="w-full h-full touch-none" style={{ display: "block" }} />
        </div>
        {isEmpty && (
          <p className="text-xs text-gray-400 mt-1 text-center">Sign in the box above using your mouse or finger</p>
        )}
      </div>

      {/* Confirmation */}
      <div className="card p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 shrink-0"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span className="text-sm text-gray-700">
            I confirm that I have read and understood the consent form, and I give my consent on behalf of{" "}
            <strong>{request.scout_name}</strong> to participate in the described activities.
          </span>
        </label>
      </div>

      {error && <p className="text-red-500 text-sm px-1">{error}</p>}

      <button
        className="btn-primary w-full py-3 text-base"
        onClick={submit}
        disabled={submitting || isEmpty || !confirmed}
      >
        {submitting ? "Submitting…" : "Submit Signature"}
      </button>
    </div>
  );
}
