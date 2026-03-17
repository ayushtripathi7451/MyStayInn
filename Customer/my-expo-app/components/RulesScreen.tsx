import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ProfileHeader from "./SetupHeader";
import BottomNav from "./BottomNav";

export default function RulesScreen({ navigation }: any) {
  const [rules, setRules] = useState([
    { text: "No loud noise after 10 PM", checked: true },
    { text: "Guests must carry valid ID", checked: true },
    { text: "Maintain cleanliness in common area", checked: true },
    { text: "Maintain cleanliness in common area", checked: true },
    { text: "Maintain cleanliness in common area", checked: true },
    { text: "Maintain cleanliness in common area", checked: true },
    { text: "Maintain cleanliness in common area", checked: true },
  ]);

  const toggleCheck = (index: number) => {
    setRules((prev) =>
      prev.map((rule, i) =>
        i === index ? { ...rule, checked: !rule.checked } : rule
      )
    );
  };

  const addRule = () => {
    setRules([...rules, { text: "", checked: false }]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProfileHeader activeTab="Rules" />

      <ScrollView
        className="px-6 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
      >
        <Text className="text-[22px] font-semibold">Step 6 - Rules and Regulations</Text>

        {/* RULE LIST */}
        <View className="mt-6 space-y-4">
          {rules.map((item, index) => (
            <View key={index} className="flex-row items-center justify-between">

              {/* TEXT FIELD */}
              <TextInput
                value={item.text}
                onChangeText={(t) => {
                  const updated = [...rules];
                  updated[index].text = t;
                  setRules(updated);
                }}
                placeholder="Enter rule"
                className="
                  bg-white 
                  border border-gray-300 
                  rounded-lg 
                  px-4 py-3 
                  mt-2
                  w-[78%]
                  text-[15px]
                "
              />

              {/* EXACT CHECKBOX LOOK */}
              <TouchableOpacity onPress={() => toggleCheck(index)}>
                <View
                  className="
                    w-7 h-7 
                    rounded-md 
                    border 
                    flex items-center justify-center
                  "
                  style={{
                    borderColor: "#555",
                    backgroundColor: item.checked ? "#fff" : "#fff",
                  }}
                >
                  {item.checked && (
                    <Ionicons name="checkmark" size={20} color="#555" />
                  )}
                </View>
              </TouchableOpacity>

            </View>
          ))}
        </View>

       {/* BUTTON ROW — EXACT SCREENSHOT STYLE */}
<View className="flex-row justify-between items-center mt-10">

  {/* ADD RULE */}
  <TouchableOpacity
    onPress={addRule}
    className="px-5 py-3 rounded-xl border"
    style={{
      borderColor: "#D9D9D9",
      backgroundColor: "#FFFFFF",
    }}
  >
    <Text className="text-gray-700 text-[15px]">Add rule</Text>
  </TouchableOpacity>

  {/* BACK BUTTON */}
  <TouchableOpacity
    onPress={() => navigation.goBack()}
    className="px-6 py-3 rounded-xl border flex-row items-center"
    style={{
      borderColor: "#D9D9D9",
      backgroundColor: "#FFFFFF",
    }}
  >
    <Text className="text-gray-700 text-[15px]">‹ Back</Text>
  </TouchableOpacity>

  {/* NEXT BUTTON */}
  <TouchableOpacity
    onPress={() => navigation.navigate("FoodScreen")}
    className="px-7 py-3 rounded-xl"
    style={{
      backgroundColor: "#5A4BFF",
    }}
  >
    <Text className="text-white font-semibold text-[15px]">
      Next ›
    </Text>
  </TouchableOpacity>

</View>

      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
