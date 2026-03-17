export default function EnrollmentStatus() {
  const stats = [
    { label: "Pending Requests", value: 421 },
    { label: "Accepted", value: 1089 },
    { label: "Rejected", value: 124 },
    { label: "Completed", value: 178 },
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-4">Enrollment Status</h3>
      <div className="space-y-3 text-sm">
        {stats.map((s) => (
          <div key={s.label} className="flex justify-between">
            <span>{s.label}</span>
            <span className="font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
