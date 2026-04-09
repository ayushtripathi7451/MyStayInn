import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function PropertyRulesViewScreen({ navigation, route }: any) {
  const propertyName = route?.params?.propertyName || "Property";
  const rules: string[] = Array.isArray(route?.params?.rules)
    ? route.params.rules
    : [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-2 pb-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-semibold text-gray-900">Property Rules</Text>
            <Text className="text-xs text-gray-500">{propertyName}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {rules.length === 0 ? (
          <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <Text className="text-gray-500">No rules provided by owner.</Text>
          </View>
        ) : (
          <View className="bg-white border border-gray-200 rounded-xl p-4">
            {rules.map((item, index) => (
              <View key={`${index}-${item}`} className="flex-row items-start mb-3">
                <Text className="text-slate-500 mr-2" style={{ minWidth: 20 }}>
                  {index + 1}.
                </Text>
                <Text className="flex-1 text-gray-700 text-sm">{item}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
