import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CustomDropdown from "./CustomDropdown";

import ExpenseForm from "./ExpenseForm";
import ExpenseAddForm from "./ExpenseAddForm";
import StaffDetail from "./StaffDetail";
import StaffDetailAdd from "./StaffDetailAdd";
import BottomNav from "./BottomNav";

export default function ExpenseScreen() {
  const navigation = useNavigation<NavigationProp<any>>();

  const [tab, setTab] = useState<"expense" | "staffdetail">("expense");
  const [expenseStep, setExpenseStep] = useState<"list" | "add">("list");
  const [staffStep, setStaffStep] = useState<"list" | "add">("list");
  const [expenseListRefresh, setExpenseListRefresh] = useState(0);
  const [monthlyListRefresh, setMonthlyListRefresh] = useState(0);

  return (
    <View className="flex-1 bg-white">

      {/* ✅ HEADER */}
      <SafeAreaView className="bg-[#f9f9f9]">
        <View className="bg-[#f7f8fb] pt-4 pb-8 px-6 flex-row justify-between items-center">
          <Text className="text-black text-3xl font-bold">Expenses</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            className="w-9 h-9 rounded-full justify-center items-center"
          >
            <Ionicons name="menu" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <Text className="text-[15px] px-6 text-gray-600 mb-4">
          Auto-populated staff salaries for the month
        </Text>
      </SafeAreaView>

      {/* ✅ WHITE BODY WITH PROPER CLIPPING */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
      <View className="flex-1 bg-[#F6F8FF] rounded-t-[40px] -mt-10 px-4 pt-6 overflow-hidden">

        {/* ✅ FIXED TAB SWITCH (NO OVERFLOW) */}
        <View className="bg-[#1E33FF] rounded-full mb-6 overflow-hidden">
          <View className="flex-row justify-between p-1">

            {/* Expenses Tab */}
            <TouchableOpacity
              onPress={() => {
                setTab("expense");
                setExpenseStep("list");
              }}
              className={`flex-1 py-2 rounded-full ${
                tab === "expense" ? "bg-white" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center text-lg font-semibold ${
                  tab === "expense" ? "text-[#1E33FF]" : "text-white"
                }`}
              >
                Expenses
              </Text>
            </TouchableOpacity>

            {/* Staff Details Tab */}
            <TouchableOpacity
              onPress={() => {
                setTab("staffdetail");
                setStaffStep("list");
              }}
              className={`flex-1 py-2 rounded-full ${
                tab === "staffdetail" ? "bg-white" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center text-lg font-semibold ${
                  tab === "staffdetail" ? "text-[#1E33FF]" : "text-white"
                }`}
              >
                Monthly Expenses
              </Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* ✅ CONTENT AREA */}
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
          
          {/* ========== EXPENSE FLOW ========== */}
          {tab === "expense" && expenseStep === "list" && (
            <ExpenseForm
              refreshTrigger={expenseListRefresh}
              onNext={() => setExpenseStep("add")}
            />
          )}

          {tab === "expense" && expenseStep === "add" && (
            <ExpenseAddForm
              onBack={() => setExpenseStep("list")}
              onSaved={() => setExpenseListRefresh((n) => n + 1)}
            />
          )}

          {/* ========== MONTHLY EXPENSES FLOW ========== */}
          {tab === "staffdetail" && staffStep === "list" && (
            <StaffDetail
              refreshTrigger={monthlyListRefresh}
              onNext={() => setStaffStep("add")}
            />
          )}

          {tab === "staffdetail" && staffStep === "add" && (
            <StaffDetailAdd
              onBack={() => setStaffStep("list")}
              onSaved={() => setMonthlyListRefresh((n) => n + 1)}
            />
          )}

        </ScrollView>
      </View>
      </KeyboardAvoidingView>

      {/* ✅ FIXED BOTTOM NAV */}
      <BottomNav />
    </View>
  );
}
