import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Circle, Line, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

export default function MonthlyCollection() {
  
  const points = [50, 100, 80, 150, 120, 180, 160, 140]; 
  const maxY = 200;

  const chartWidth = 260;
  const chartHeight = 140;

  const step = chartWidth / (points.length - 1);

  const buildPath = () => {
    return points
      .map((y, i) => {
        const x = i * step;
        const yPos = chartHeight - (y / maxY) * chartHeight;
        return `${i === 0 ? "M" : "L"} ${x} ${yPos}`;
      })
      .join(" ");
  };

  const markerIndex = 5;
  const markerX = markerIndex * step;
  const markerY = chartHeight - (points[markerIndex] / maxY) * chartHeight;

  return (
    <View className="bg-white rounded-3xl p-5 w-[260px] ml-4 shadow shadow-black/10">

      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[17px] font-semibold text-gray-800">
          Monthly collection
        </Text>

        <View className="flex-row items-center bg-[#F1F3FF] px-3 py-[4px] rounded-xl">
          <Text className="text-[14px] text-gray-700 mr-1">month</Text>
          <Ionicons name="chevron-down" size={16} color="#777" />
        </View>
      </View>

      {/* Chart */}
      
    </View>
  );
}
