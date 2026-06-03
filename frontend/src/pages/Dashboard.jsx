import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../api";

function StatCard({ label, value, color = "purple" }) {
  const colors = {
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    green: "bg-green-50 border-green-200 text-green-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    red: "bg-red-50 border-red-200 text-red-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
  };
  return (
    <div className={`card p-5 border ${colors[color]}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? "—"}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  if (isLoading) return <p className="text-gray-500">Loading stats…</p>;
  if (error) return <p className="text-red-500">Failed to load stats.</p>;

  const signedPct = stats.total_signing_requests > 0
    ? Math.round((stats.signed / stats.total_signing_requests) * 100)
    : 0;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Dashboard</h2>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Members</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Scouts" value={stats.total_scouts} color="purple" />
          <StatCard label="Active Scouts" value={stats.active_scouts} color="purple" />
          <StatCard label="Form Templates" value={stats.total_forms} color="gray" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Consent Forms</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Requests" value={stats.total_signing_requests} color="gray" />
          <StatCard label="Pending" value={stats.pending} color="yellow" />
          <StatCard label="Sent / Awaiting" value={stats.sent} color="blue" />
          <StatCard label="Signed" value={stats.signed} color="green" />
        </div>
        {stats.declined > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Declined" value={stats.declined} color="red" />
          </div>
        )}
      </section>

      {stats.total_signing_requests > 0 && (
        <section className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Overall completion</span>
            <span className="text-sm font-bold text-gray-800">{signedPct}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${signedPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.signed} of {stats.total_signing_requests} consent forms signed
          </p>
        </section>
      )}
    </div>
  );
}
