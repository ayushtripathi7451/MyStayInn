import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";

const data = [
  { month: "Jan", thisYear: 12000, lastYear: 5000 },
  { month: "Feb", thisYear: 6000, lastYear: 13000 },
  { month: "Mar", thisYear: 14000, lastYear: 21000 },
  { month: "Apr", thisYear: 25000, lastYear: 7000 },
  { month: "May", thisYear: 30000, lastYear: 15000 },
  { month: "Jun", thisYear: 22000, lastYear: 25000 },
  { month: "Jul", thisYear: 27000, lastYear: 32000 },
  { month: "Aug", thisYear: 12000, lastYear: 20000 },
  { month: "Sep", thisYear: 12700, lastYear: 10000 },
  { month: "Oct", thisYear: 19000, lastYear: 32000 },
];

export default function RevenueChart() {
  return (
<div className="bg-slate-100 p-4 sm:p-6 rounded-2xl h-[300px] sm:h-[350px]">
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">
          Revenue Growth Chart
        </h3>

        <div className="flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-black" />
            This year
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-300" />
            Last year
          </div>
          
        </div>
        <div></div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          
          <defs>
            <linearGradient id="fadeGray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#000" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="month"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              background: "#fff",
              borderRadius: "10px",
              border: "1px solid #E5E7EB",
              fontSize: "12px",
            }}
          />

          <Area
            type="monotone"
            dataKey="thisYear"
            stroke="none"
            fill="url(#fadeGray)"
          />

          <Line
            type="monotone"
            dataKey="thisYear"
            stroke="#111827"
            strokeWidth={2}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="lastYear"
            stroke="#93C5FD"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />

        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
