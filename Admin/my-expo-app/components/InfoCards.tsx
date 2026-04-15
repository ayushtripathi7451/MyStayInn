import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

export default function InfoCards() {
  const data = [
    { value: 40, color: "#00C0DB" }, // cyan
    { value: 47, color: "#FFA647" }, // orange
    { value: 23, color: "#818CF8" }, // indigo
    { value: 20, color: "#FF6AC4" }, // pink
  ];

  const total = data.reduce((a, b) => a + b.value, 0);
  let startAngle = -90; // start from top

  const radius = 80;
  const strokeWidth = 28;
  const cx = 100;
  const cy = 100;

  return (
<View className="bg-white rounded-3xl p-6 w-[260px] ml-4 shadow shadow-black/10">

      {/* DONUT */}
      <View className="items-center justify-center">
        <Svg width="200" height="200">
          {data.map((slice, index) => {
            const angle = (slice.value / total) * 360;
            const endAngle = startAngle + angle;

            const largeArc = angle > 180 ? 1 : 0;

            const x1 = cx + radius * Math.cos((Math.PI * startAngle) / 180);
            const y1 = cy + radius * Math.sin((Math.PI * startAngle) / 180);
            const x2 = cx + radius * Math.cos((Math.PI * endAngle) / 180);
            const y2 = cy + radius * Math.sin((Math.PI * endAngle) / 180);

            const path = `
              M ${cx} ${cy}
              L ${x1} ${y1}
              A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
              Z
            `;

            startAngle = endAngle;

            return <Path key={index} d={path} fill={slice.color} />;
          })}

          {/* INNER WHITE CIRCLE */}
          <Circle cx={cx} cy={cy} r={radius - strokeWidth} fill="white" />
        </Svg>

        {/* CENTER TEXT */}
        <View className="absolute items-center">
          <Text className="text-gray-500 text-[14px]">Total Beds</Text>
          <Text className="text-[26px] font-bold text-[#0A1A3F]">=2356</Text>
        </View>
      </View>

      {/* LEGENDS */}
      <View className="flex-row justify-between mt-6 px-2">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-[#00C0DB]" />
          <Text className="ml-2 text-gray-700">Occupied</Text>
        </View>

        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-[#FF6AC4]" />
          <Text className="ml-2 text-gray-700">Available</Text>
        </View>
      </View>

      <View className="flex-row justify-between mt-3 px-2">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-[#818CF8]" />
          <Text className="ml-2 text-gray-700">other</Text>
        </View>

        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-[#FFA647]" />
          <Text className="ml-2 text-gray-700">…..</Text>
        </View>
      </View>
    </View>
  );
}
