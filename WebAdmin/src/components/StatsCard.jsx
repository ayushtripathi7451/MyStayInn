import { TrendingDown, TrendingUp } from "lucide-react";

export default function StatsCard({ colour, title, value, growth }) {
  const isNegative = growth.startsWith("-");

  return (
    <div
      className="rounded-2xl p-6 flex flex-col justify-between"
      style={{ backgroundColor: colour }}
    >
      <p className="text-sm text-gray-600 font-medium">{title}</p>

      <div className="flex items-end justify-between mt-4">
        <h2 className="text-3xl font-bold text-gray-900">{value}</h2>

        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            isNegative ? "text-red-500" : "text-green-600"
          }`}
        >
          {growth}
          {isNegative ?  <TrendingDown size={14} /> : <TrendingUp size={14} /> }
         
        </div>
      </div>
    </div>
  );
}
