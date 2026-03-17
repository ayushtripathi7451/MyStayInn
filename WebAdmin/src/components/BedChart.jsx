import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";

const data = [
  { name: "Total Beds", value: 90, color: "#A9C3EC" },
  { name: "Occupied", value: 150, color: "#6EE7D1" },
  { name: "Available", value: 165, color: "#7FB9FF" },
  { name: "Other", value: 135, color: "#7BE495" },
];

export default function BedChart() {
  return (
<div className="bg-[#FAFAFA] p-4 sm:p-6 rounded-2xl h-[260px] sm:h-[300px] w-full">
      
      <h3 className="font-semibold text-gray-900 mb-6">
        Number of Beds per Admin
      </h3>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barCategoryGap={42}
        >
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#374151", fontSize: 13 }}
          />

          <Bar
            dataKey="value"
            radius={[9,9,9,9]}
            barSize={29}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
