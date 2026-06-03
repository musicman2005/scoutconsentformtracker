const STATUS_STYLES = {
  pending: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-yellow-100 text-yellow-700",
  signed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS = {
  pending: "Pending",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed ✓",
  declined: "Declined",
  expired: "Expired",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
