import React, { useState } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("USER_TOKEN");
          await AsyncStorage.removeItem("authToken");
          navigation.reset({ index: 0, routes: [{ name: "Welcome" as never }] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} className="px-5">
        {/* Account */}
        <View className="mt-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-3 px-2">Account</Text>
          <View className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <SettingItem icon="key-outline" label="Change MPIN" onPress={() => navigation.navigate("CreateNewMPIN" as never)} showBorder />
            <SettingItem icon="log-out-outline" label="Move Out Request" onPress={() => navigation.navigate("MoveOutRequestScreen" as never)} />
          </View>
        </View>

        {/* Notifications */}
        <View className="mt-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-3 px-2">Notifications</Text>
          <View className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <SettingToggle icon="notifications-outline" label="Push Notifications" value={pushNotifications} onValueChange={setPushNotifications} />
          </View>
        </View>

        {/* Security & Legal */}
        <View className="mt-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-3 px-2">Security & Legal</Text>
          <View className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <SettingItem icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => Alert.alert("Privacy Policy", "View our privacy policy at mystayinn.com")} showBorder />
            <SettingItem icon="document-outline" label="Terms & Conditions" onPress={() => Alert.alert("Terms & Conditions", "View terms at mystayinn.com")} />
          </View>
        </View>

        {/* Support & About */}
        <View className="mt-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-3 px-2">Support & About</Text>
          <View className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <SettingItem icon="help-circle-outline" label="Help & Support" onPress={() => Alert.alert("Support", "Contact support@mystayinn.com")} showBorder />
            <SettingItem icon="star-outline" label="Rate MyStayInn" onPress={() => Alert.alert("Rate Us", "Thank you for your feedback!")} showBorder />
            <SettingItem icon="share-social-outline" label="Share with Friends" onPress={() => Alert.alert("Share", "Share MyStayInn with your friends")} showBorder />
            <SettingItem icon="information-circle-outline" label="App Version" value="v1.0.0" onPress={() => Alert.alert("Version", "MyStayInn Customer v1.0.0")} />
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} className="bg-red-50 rounded-[24px] p-5 mt-6 mb-4 flex-row items-center justify-center border-2 border-red-100" activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text className="text-red-600 font-black text-lg ml-3">Logout</Text>
        </TouchableOpacity>

        <Text className="text-center text-slate-400 text-xs mt-4 mb-2">MyStayInn © 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const SettingItem = ({
  icon,
  label,
  value,
  onPress,
  showBorder = false,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  showBorder?: boolean;
}) => (
  <TouchableOpacity onPress={onPress} className={`flex-row items-center justify-between px-5 py-4 ${showBorder ? "border-b border-slate-100" : ""}`} activeOpacity={0.7}>
    <View className="flex-row items-center flex-1">
      <View className="w-10 h-10 bg-slate-50 rounded-xl items-center justify-center">
        <Ionicons name={icon as any} size={20} color="#475569" />
      </View>
      <Text className="text-slate-900 font-semibold ml-4 flex-1">{label}</Text>
    </View>
    <View className="flex-row items-center">
      {value && <Text className="text-slate-500 font-medium mr-2">{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </View>
  </TouchableOpacity>
);

const SettingToggle = ({
  icon,
  label,
  value,
  onValueChange,
  showBorder = false,
}: {
  icon: string;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showBorder?: boolean;
}) => (
  <View className={`flex-row items-center justify-between px-5 py-4 ${showBorder ? "border-b border-slate-100" : ""}`}>
    <View className="flex-row items-center flex-1">
      <View className="w-10 h-10 bg-slate-50 rounded-xl items-center justify-center">
        <Ionicons name={icon as any} size={20} color="#475569" />
      </View>
      <Text className="text-slate-900 font-semibold ml-4 flex-1">{label}</Text>
    </View>
    <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#E2E8F0", true: "#3B82F6" }} thumbColor="#FFFFFF" ios_backgroundColor="#E2E8F0" />
  </View>
);
