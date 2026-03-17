export default function NotificationPanel() {
  const notifications = [
    "New user registered.",
    "New user registered.",
    "New user registered.",
    "New user registered.",
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-4">Notifications</h3>
      <div className="space-y-3">
        {notifications.map((n, i) => (
          <div key={i} className="text-sm text-gray-600 border-b pb-2">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
