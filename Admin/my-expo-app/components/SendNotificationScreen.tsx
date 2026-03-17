import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import NotificationService, { type Tenant } from "../services/notificationService";

interface SendNotificationScreenProps {
  navigation: any;
  route?: any;
}

// Predefined notification templates
const NOTIFICATION_TEMPLATES = [
  {
    id: "rent_reminder",
    title: "Rent Reminder",
    message: "Your monthly rent is due. Please make the payment by the due date to avoid late fees.",
    icon: "card-outline",
    color: "#f59e0b"
  },
  {
    id: "maintenance",
    title: "Maintenance Notice",
    message: "Scheduled maintenance will be conducted tomorrow from 10 AM to 2 PM. Please plan accordingly.",
    icon: "construct-outline",
    color: "#3b82f6"
  },
  {
    id: "meeting",
    title: "Tenant Meeting",
    message: "Monthly tenant meeting is scheduled for this Saturday at 6 PM in the common area.",
    icon: "people-outline",
    color: "#10b981"
  },
  {
    id: "rules",
    title: "Important Notice",
    message: "Please follow the property rules and regulations. Any violations will result in penalties.",
    icon: "warning-outline",
    color: "#ef4444"
  },
  {
    id: "custom",
    title: "Custom Message",
    message: "",
    icon: "create-outline",
    color: "#8b5cf6"
  }
];

export default function SendNotificationScreen({ navigation, route }: SendNotificationScreenProps) {
  const preSelectedTenants = route?.params?.selectedTenants || [];
  const template = route?.params?.template;

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [recipientType, setRecipientType] = useState<"all" | "selected">(
    preSelectedTenants.length > 0 ? "selected" : "all"
  );
  const [selectedTenants, setSelectedTenants] = useState<string[]>(preSelectedTenants);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customTitle, setCustomTitle] = useState(template?.title || "");
  const [customMessage, setCustomMessage] = useState(template?.message || "");
  const [priority, setPriority] = useState<"normal" | "high">(template?.priority || "normal");
  const [loading, setLoading] = useState(false);
  const [tenantSearchQuery, setTenantSearchQuery] = useState("");

  useEffect(() => {
    NotificationService.fetchActiveTenants()
      .then((list) => {
        setTenants(list);
        setTenantsLoading(false);
      })
      .catch((err: any) => {
        setTenantsLoading(false);
        setTenants([]);
        const status = err?.response?.status;
        const message = err?.response?.data?.message || err?.message;
        if (status === 401) {
          Alert.alert(
            "Session expired",
            "Please log in again. If you use a deployed backend, ensure JWT_SECRET is the same on auth and booking services.",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
        } else {
          console.error("Failed to fetch tenants:", err);
        }
      });
  }, [navigation]);

  const handleTenantToggle = (tenantId: string) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId) 
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = NOTIFICATION_TEMPLATES.find(t => t.id === templateId);
    if (template && templateId !== "custom") {
      setCustomTitle(template.title);
      setCustomMessage(template.message);
    } else if (templateId === "custom") {
      setCustomTitle("");
      setCustomMessage("");
    }
  };

  const validateForm = () => {
    if (!customTitle.trim()) {
      Alert.alert("Error", "Please enter a notification title");
      return false;
    }
    
    if (!customMessage.trim()) {
      Alert.alert("Error", "Please enter a notification message");
      return false;
    }
    
    if (recipientType === "selected" && selectedTenants.length === 0) {
      Alert.alert("Error", "Please select at least one tenant");
      return false;
    }
    
    return true;
  };

  const handleSendNotification = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await NotificationService.sendNotification(
        customTitle,
        customMessage,
        recipientType,
        selectedTenants,
        priority,
        tenants
      );

      if (result.success) {
        const recipientCount =
          recipientType === "all" ? tenants.length : selectedTenants.length;
        const tokensSent = result.tokensSent ?? 0;
        const successCount = result.successCount ?? 0;
        const fcmErrorCode = result.fcmErrorCode;

        if (tokensSent === 0) {
          Alert.alert(
            "No devices to receive",
            "No tenant has push notifications enabled. Tenants should open the Customer app, log in, and go to the Home screen at least once (push registers when Home is shown). If they have already done that, ask them to open the app again and go to Home.",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
        } else if (successCount === 0) {
          const isMismatchedCredential = fcmErrorCode?.includes("mismatched-credential");
          const deliveryMessage = isMismatchedCredential
            ? "The server's Firebase project does not match the Customer app. Use the same Firebase project: set FCM_SERVICE_ACCOUNT_JSON in the notification-service to the service account from the same project as the Customer app's google-services.json."
            : "Notification was sent to FCM but could not be delivered to any device. If the code is mismatched-credential, fix the server Firebase project (see above). Otherwise devices may be offline or tokens expired—ask tenants to open the Customer app and go to Home to refresh tokens.";
          Alert.alert(
            "Delivery failed",
            deliveryMessage + (fcmErrorCode ? `\n\nFCM code: ${fcmErrorCode}` : ""),
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert(
            "Success",
            `Notification sent to ${recipientCount} tenant${recipientCount !== 1 ? "s" : ""} (${successCount} device${successCount !== 1 ? "s" : ""} received).`,
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
        }
      } else {
        Alert.alert("Error", result.error || "Failed to send notification");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send notification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const activeTenants = tenants.filter((t) => t.status === "Active");

  // Filter tenants based on search query
  const filteredTenants = activeTenants.filter(tenant => 
    tenant.name.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
    tenant.phone.includes(tenantSearchQuery) ||
    tenant.roomNumber.toLowerCase().includes(tenantSearchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      {/* Header */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Announcement Page
        </Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5">
          
          {/* Recipient Selection */}
          <View className="bg-white rounded-2xl p-5 mt-5 shadow-sm border border-slate-100">
            <Text className="text-lg font-bold text-slate-900 mb-4">Recipients</Text>
            
            <View className="flex-row gap-3 mb-4">
              <TouchableOpacity
                onPress={() => setRecipientType("all")}
                className={`flex-1 p-4 rounded-xl border-2 ${
                  recipientType === "all" 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons 
                    name="people" 
                    size={20} 
                    color={recipientType === "all" ? "#3b82f6" : "#64748b"} 
                  />
                  <Text className={`ml-2 font-semibold ${
                    recipientType === "all" ? "text-blue-600" : "text-slate-600"
                  }`}>
                    All Tenants
                  </Text>
                </View>
                <Text className={`text-center text-sm mt-1 ${
                  recipientType === "all" ? "text-blue-500" : "text-slate-500"
                }`}>
                  {tenantsLoading ? "Loading…" : `${activeTenants.length} active tenants`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRecipientType("selected")}
                className={`flex-1 p-4 rounded-xl border-2 ${
                  recipientType === "selected" 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons 
                    name="person" 
                    size={20} 
                    color={recipientType === "selected" ? "#3b82f6" : "#64748b"} 
                  />
                  <Text className={`ml-2 font-semibold ${
                    recipientType === "selected" ? "text-blue-600" : "text-slate-600"
                  }`}>
                    Select Tenants
                  </Text>
                </View>
                <Text className={`text-center text-sm mt-1 ${
                  recipientType === "selected" ? "text-blue-500" : "text-slate-500"
                }`}>
                  {selectedTenants.length} selected
                  {tenantSearchQuery && recipientType === "selected" ? 
                    ` (${filteredTenants.length} shown)` : 
                    ""
                  }
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tenant Selection List */}
            {recipientType === "selected" && (
              <View className="mt-4">
                <Text className="text-sm font-semibold text-slate-700 mb-3">Select Tenants:</Text>
                
                {/* Search Input */}
                <View className="mb-3">
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <Ionicons name="search-outline" size={20} color="#64748B" />
                    <TextInput
                      className="flex-1 ml-3 text-slate-900"
                      placeholder="Search by name, phone, or room..."
                      value={tenantSearchQuery}
                      onChangeText={setTenantSearchQuery}
                      placeholderTextColor="#94A3B8"
                    />
                    {tenantSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setTenantSearchQuery("")}>
                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {tenantSearchQuery.length > 0 && (
                    <Text className="text-xs text-slate-500 mt-1 ml-1">
                      {filteredTenants.length} of {activeTenants.length} tenants shown
                    </Text>
                  )}
                </View>

                {/* Tenant List */}
                <View className="max-h-48 border border-slate-200 rounded-xl">
                  {filteredTenants.length > 0 ? (
                    <ScrollView
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                      contentContainerStyle={{ paddingVertical: 8 }}
                    >
                      {filteredTenants.map((tenant, index) => (
                        <TouchableOpacity
                          key={`tenant-${index}-${tenant.id}`}
                          onPress={() => handleTenantToggle(tenant.id)}
                          className={`flex-row items-center justify-between p-3 mx-2 my-1 rounded-xl ${
                            selectedTenants.includes(tenant.id) 
                              ? "bg-blue-50 border border-blue-200" 
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <View className="flex-1">
                            <Text className="font-semibold text-slate-900">{tenant.name}</Text>
                            <Text className="text-sm text-slate-500">Room {tenant.roomNumber} • {tenant.phone}</Text>
                          </View>
                          <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                            selectedTenants.includes(tenant.id)
                              ? "bg-blue-500 border-blue-500"
                              : "border-slate-300"
                          }`}>
                            {selectedTenants.includes(tenant.id) && (
                              <Ionicons name="checkmark" size={14} color="white" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View className="p-6 items-center">
                      {tenantsLoading ? (
                        <ActivityIndicator size="small" color="#3b82f6" />
                      ) : (
                        <>
                          <Ionicons name="search-outline" size={32} color="#94A3B8" />
                          <Text className="text-slate-500 font-medium mt-2">No tenants found</Text>
                          <Text className="text-slate-400 text-sm text-center mt-1">
                            {tenantSearchQuery ? "Try adjusting your search" : "No active tenants available"}
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                </View>

                {/* Quick Selection Actions */}
                {filteredTenants.length > 0 && (
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity
                      onPress={() => {
                        const filteredIds = filteredTenants.map(t => t.id);
                        const newSelected = [...new Set([...selectedTenants, ...filteredIds])];
                        setSelectedTenants(newSelected);
                      }}
                      className="flex-1 bg-blue-100 py-2 px-3 rounded-lg"
                    >
                      <Text className="text-blue-700 font-semibold text-center text-sm">
                        Select {tenantSearchQuery ? 'Filtered' : 'All'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        const filteredIds = filteredTenants.map(t => t.id);
                        const newSelected = selectedTenants.filter(id => !filteredIds.includes(id));
                        setSelectedTenants(newSelected);
                      }}
                      className="flex-1 bg-slate-100 py-2 px-3 rounded-lg"
                    >
                      <Text className="text-slate-700 font-semibold text-center text-sm">
                        Deselect {tenantSearchQuery ? 'Filtered' : 'All'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Message Templates */}
          <View className="bg-white rounded-2xl p-5 mt-5 shadow-sm border border-slate-100">
            <Text className="text-lg font-bold text-slate-900 mb-4">Quick Templates</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-3">
                {NOTIFICATION_TEMPLATES.map((template, tIndex) => (
                  <TouchableOpacity
                    key={`template-${tIndex}-${template.id}`}
                    onPress={() => handleTemplateSelect(template.id)}
                    className={`p-4 rounded-xl border-2 min-w-[140px] ${
                      selectedTemplate === template.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <View className="items-center">
                      <View className={`w-12 h-12 rounded-full items-center justify-center mb-2`}
                        style={{ backgroundColor: template.color + "20" }}
                      >
                        <Ionicons name={template.icon as any} size={24} color={template.color} />
                      </View>
                      <Text className={`font-semibold text-center text-sm ${
                        selectedTemplate === template.id ? "text-blue-600" : "text-slate-700"
                      }`}>
                        {template.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Message Content */}
          <View className="bg-white rounded-2xl p-5 mt-5 shadow-sm border border-slate-100">
            <Text className="text-lg font-bold text-slate-900 mb-4">Message Content</Text>
            
            {/* Title Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Title</Text>
              <TextInput
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="Enter notification title"
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900"
                maxLength={100}
              />
            </View>

            {/* Message Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Message</Text>
              <TextInput
                value={customMessage}
                onChangeText={setCustomMessage}
                placeholder="Enter your message here..."
                multiline
                numberOfLines={4}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 min-h-[100px]"
                textAlignVertical="top"
                maxLength={500}
              />
              <Text className="text-xs text-slate-500 mt-1 text-right">
                {customMessage.length}/500
              </Text>
            </View>

            {/* Priority Selection */}
            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-2">Priority</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setPriority("normal")}
                  className={`flex-1 p-3 rounded-xl border-2 ${
                    priority === "normal" 
                      ? "border-green-500 bg-green-50" 
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons 
                      name="information-circle" 
                      size={18} 
                      color={priority === "normal" ? "#10b981" : "#64748b"} 
                    />
                    <Text className={`ml-2 font-semibold ${
                      priority === "normal" ? "text-green-600" : "text-slate-600"
                    }`}>
                      Normal
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPriority("high")}
                  className={`flex-1 p-3 rounded-xl border-2 ${
                    priority === "high" 
                      ? "border-red-500 bg-red-50" 
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons 
                      name="warning" 
                      size={18} 
                      color={priority === "high" ? "#ef4444" : "#64748b"} 
                    />
                    <Text className={`ml-2 font-semibold ${
                      priority === "high" ? "text-red-600" : "text-slate-600"
                    }`}>
                      High
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSendNotification}
            disabled={loading}
            className={`bg-blue-600 rounded-2xl p-5 mt-5 mb-8 shadow-sm ${
              loading ? "opacity-50" : ""
            }`}
          >
            <View className="flex-row items-center justify-center">
              {loading ? (
                <>
                  <MaterialCommunityIcons name="loading" size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Sending...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Send Notification</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}