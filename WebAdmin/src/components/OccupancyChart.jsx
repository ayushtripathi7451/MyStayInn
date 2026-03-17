import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "Malviya Nagar", value: 50, color: "#111111" },
  { name: "Jagatpura", value: 20, color: "#93BFFF" },
  { name: "Mansarovar", value: 19, color: "#7BE9A6" },
  { name: "C Scheme", value: 12, color: "#FDB515" },
];

export default function OccupancyChart() {
  return (
    <div className="bg-[#FAFAFA] p-6 rounded-2xl h-[300px]">

      <h3 className="font-semibold text-gray-900 mb-6">
        Occupancy by Area
      </h3>

      <div className="flex items-center justify-between">

        <div className="w-[200px] h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={6}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4 text-sm">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-4 w-[180px]">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1 text-gray-900">{item.name}</span>
              <span className="text-gray-700 font-medium">
                {item.value}%
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
