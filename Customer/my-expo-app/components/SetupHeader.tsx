import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function SetupHeader({ activeTab }: any) {
  const navigation = useNavigation();
  const scrollRef = useRef<any>(null);

  const tabs = [
    { label: "Property", screen: "ProfileSetup" },
    { label: "Facilities", screen: "Facilities" },
    { label: "Floors", screen: "Floors" },
    { label: "Rooms", screen: "Rooms" },
    { label: "Verify", screen: "Verify" },
    { label: "Rules", screen: "RulesScreen" },
    { label: "Food", screen: "FoodScreen" },
  ];

  // Auto-scroll to active tab
  useEffect(() => {
    const index = tabs.findIndex((t) => t.label === activeTab);
    if (index !== -1 && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: index * 90,
        animated: true,
      });
    }
  }, [activeTab]);

  return (
    <>
      {/* TOP HEADER BOX */}
      <View className="bg-[#F7F3FF] px-5 py-6 rounded-[24px] mt-2">
        <Text className="text-[22px] font-bold">Profile setup</Text>
        <Text className="text-gray-600 mt-1">
          Complete steps to generate your property ID and go live.
        </Text>
      </View>

      {/* ⭐ SCROLLABLE TABS (no stretching) ⭐ */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-5 px-4 max-h-9 min-h-9"
        contentContainerStyle={{ paddingRight: 20 }}
      >
        <View className="flex-row space-x-6">
          {tabs.map((tab) => {
            const isActive = tab.label === activeTab;

            return (
              <TouchableOpacity
                key={tab.label}
                // onPress={() => navigation.navigate(tab.screen as never)}
                className={`px-4 py-1.5 rounded-full border ${
                  isActive
                    ? "border-indigo-600 bg-white"
                    : "border-gray-200 bg-gray-100"
                }`}
              >
                <Text
                  className={
                    isActive
                      ? "text-indigo-600 font-semibold"
                      : "text-gray-500"
                  }
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}
