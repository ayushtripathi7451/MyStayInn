import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function AdmissionDetails() {
  return (
    <LinearGradient
      colors={["#A9B8FF", "#6D7BFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 28,
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
      }} className="w-11/12 self-center"
    >
      <Text className="text-white text-3xl font-semibold  mb-3">
        Admission Details
      </Text>

      <Text className="text-white text-xl mb-1">Room Type - Deluxe</Text>
      <Text className="text-white text-xl mb-1">Floor - 2nd Floor</Text>
      <Text className="text-white text-xl mb-1">Duration - 6 Months</Text>
      <Text className="text-white text-xl">Admin Name - Rahul Mehta</Text>
    </LinearGradient>
  );
}
