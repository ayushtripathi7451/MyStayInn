import React, { useState } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, Modal, Dimensions } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProperty } from "../contexts/PropertyContext";

const { width } = Dimensions.get("window");

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { properties, currentProperty, setCurrentProperty } = useProperty();
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handlePropertySelect = (property: any) => {
    setCurrentProperty(property);
    setShowPropertyModal(false);
  };

  const handleAddNewProperty = () => {
    setShowPropertyModal(false);
    navigation.navigate("ProfileSetup");
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => console.log("Logging out...") },
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
        {/* Property */}
        <View className="mt-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-3 px-2">Property</Text>
          <View className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <SettingItem icon="home-outline" label="My Properties" onPress={() => setShowPropertyModal(true)} showBorder />
            <SettingItem icon="people-outline" label="Tenant Management" onPress={() => navigation.navigate("SearchScreen")} />
          </View>
        </View>

        {/* Notifications */}
        <View className="mt-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-3 px-2">Notifications</Text>
          <View className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <SettingItem icon="notifications-outline" label="Send Notification" onPress={() => navigation.navigate("SendNotificationScreen")} showBorder />

            <SettingToggle
              icon="phone-portrait-outline"
              label="Receive Push Alerts (This Device)"
              value={pushNotifications}
              onValueChange={setPushNotifications}
            />
          </View>
          <Text className="text-[11px] text-slate-500 px-3 mt-2">
            Sending notifications to tenants works from server and is not blocked by this switch.
          </Text>
        </View>

        {/* Reports */}
        <View className="mt-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-3 px-2">Reports</Text>
          <View className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <SettingItem icon="document-text-outline" label="Reports & Analytics" onPress={() => navigation.navigate("ReportsHubScreen")} />
          </View>
        </View>

        {/* Security & Legal */}
        <View className="mt-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-3 px-2">Security & Legal</Text>
          <View className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <SettingItem icon="lock-closed-outline" label="Change Password" onPress={() => Alert.alert("Coming Soon", "Password change will be available soon.")} showBorder />
            <SettingItem icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => Alert.alert("Privacy Policy", "View our privacy policy at mystayinn.com")} showBorder />
            <SettingItem icon="document-outline" label="Terms & Conditions" onPress={() => Alert.alert("Terms & Conditions", "View terms at mystayinn.com")} />
          </View>
        </View>

        {/* Support & About */}
        <View className="mt-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-3 px-2">Support & About</Text>
          <View className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <SettingItem icon="help-circle-outline" label="Help & Support" onPress={() => Alert.alert("Support", "Contact support@mystayinn.com")} showBorder />
            <SettingItem icon="information-circle-outline" label="App Version" value="v1.0.0" onPress={() => Alert.alert("Version", "MyStayInn Admin v1.0.0")} />
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} className="bg-red-50 rounded-[24px] p-5 mt-6 mb-4 flex-row items-center justify-center border-2 border-red-100" activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text className="text-red-600 font-black text-lg ml-3">Logout</Text>
        </TouchableOpacity>

        <Text className="text-center text-slate-400 text-xs mt-4 mb-2">MyStayInn Admin © 2026</Text>
      </ScrollView>

      {/* Property Selection Modal */}
      <Modal visible={showPropertyModal} transparent animationType="fade" onRequestClose={() => setShowPropertyModal(false)}>
        <TouchableOpacity className="flex-1 bg-black/50" activeOpacity={1} onPress={() => setShowPropertyModal(false)}>
          <View className="flex-1 justify-center items-center px-4">
            <View className="bg-white rounded-2xl max-h-96 w-full" style={{ maxWidth: width - 32 }}>
              <View className="p-4 border-b border-gray-100">
                <Text className="text-lg font-bold text-center text-gray-800">My Properties</Text>
              </View>
              <ScrollView className="max-h-64">
                {properties.map((property) => (
                  <TouchableOpacity
                    key={property.id}
                    onPress={() => handlePropertySelect(property)}
                    className={`p-4 border-b border-gray-50 ${currentProperty?.id === property.id ? "bg-blue-50" : ""}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-800">{property.name}</Text>
                        <Text className="text-sm text-gray-500 mt-1">{property.address}</Text>
                      </View>
                      {currentProperty?.id === property.id && <Ionicons name="checkmark-circle" size={20} color="#2563EB" />}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={handleAddNewProperty} className="p-4 border-t border-gray-100">
                <View className="flex-row items-center justify-center">
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#2563EB" />
                  <Text className="text-base font-semibold text-blue-600 ml-2">Add New Property</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPropertyModal(false)} className="p-4 border-t border-gray-100">
                <Text className="text-center text-gray-500 font-medium">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
