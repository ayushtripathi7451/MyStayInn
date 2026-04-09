import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import { ticketApi, userApi } from "../utils/api";

// Build property options from one or more active stays. value = property name (what user selects).
function buildPropertyOptionsFromStays(stays: any[]): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const currentStay of stays) {
    if (!currentStay?.booking || !currentStay?.room || !currentStay?.property) continue;
    const name = currentStay.room?.propertyName || currentStay.property?.name || "Property";
    const roomNumber = currentStay.room?.roomNumber || "";
    const label = roomNumber ? `${name} - Room ${roomNumber}` : name;
    if (label.trim()) out.push({ label, value: label });
  }
  return out;
}

export default function CreateRequestScreen({ navigation }: any) {
  const { theme } = useTheme();

  const primaryBg = theme === "female" ? "#EC4899" : "#1F3FFF";
  const softBg = theme === "female" ? "#FCE7F3" : "#E8EDFF";

  /* PROPERTIES — fetched from current stay; value = property uniqueId for owner filtering */
  const [propertyOptions, setPropertyOptions] = useState<{ label: string; value: string }[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [selectedPropertyRef, setSelectedPropertyRef] = useState("");
  const [propertyOpen, setPropertyOpen] = useState(false);
  const propertyRef = useRef<View>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await userApi.get<{
          success: boolean;
          currentStay: any;
          currentStays?: any[];
        }>("/api/users/me/current-stay");
        if (cancelled) return;
        const list =
          Array.isArray(res.data?.currentStays) && res.data!.currentStays!.length > 0
            ? res.data!.currentStays!
            : res.data?.currentStay
              ? [res.data.currentStay]
              : [];
        const options = buildPropertyOptionsFromStays(list);
        setPropertyOptions(options);
        if (options.length === 1) setSelectedPropertyRef(options[0].value);
      } catch (_) {
        if (!cancelled) setPropertyOptions([]);
      } finally {
        if (!cancelled) setPropertiesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedPropertyLabel = propertyOptions.find((o) => o.value === selectedPropertyRef)?.label ?? "";

  /* CATEGORY */
  const categories = ["Plumbing", "Electrical", "Cleaning", "Other"];
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<View>(null);

  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  /* ATTACHMENTS */
  const [documents, setDocuments] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const MAX_ATTACHMENTS = 5;

  /* DESCRIPTION */
  const [description, setDescription] = useState("");

  /* UPLOAD STATE */
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  /* PICKERS */
  const pickDocument = async () => {
    if (documents.length + photos.length >= MAX_ATTACHMENTS) {
      Alert.alert("Limit reached", "Maximum 5 attachments allowed");
      return;
    }
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!res.canceled) setDocuments((p) => [...p, res.assets[0]]);
  };

  const pickPhoto = async () => {
    if (documents.length + photos.length >= MAX_ATTACHMENTS) {
      Alert.alert("Limit reached", "Maximum 5 attachments allowed");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!res.canceled) setPhotos((p) => [...p, res.assets[0]]);
  };

  /* SUBMIT */
  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert("Missing field", "Please select a category.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing field", "Please describe your issue.");
      return;
    }
    if (propertyOptions.length > 0 && !selectedPropertyRef) {
      Alert.alert("Select property", "Please select the property this ticket is for. The owner of that property will see it.");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const title = description.trim().length > 50 ? description.trim().slice(0, 47) + "..." : description.trim();
      const res = await ticketApi.post("/api/tickets", {
        propertyRef: selectedPropertyRef || undefined, // uniqueId so owner sees it under that property
        category: selectedCategory,
        title,
        description: description.trim(),
        attachmentUrls: [], // TODO: upload files and pass URLs
      });
      if (res.data.success) {
        setProgress(100);
        setUploading(false);
        setSuccess(true);
        Animated.spring(successAnim, { toValue: 1, useNativeDriver: true }).start();
        setTimeout(() => navigation.goBack(), 2000);
      } else {
        setUploading(false);
        Alert.alert("Error", res.data.message || "Failed to create ticket");
      }
    } catch (err: any) {
      setUploading(false);
      Alert.alert("Error", err?.response?.data?.message || err?.message || "Failed to create ticket");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-5 pt-2"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View className="flex-row items-center mt-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full border justify-center items-center"
          >
            <Ionicons name="chevron-back" size={22} />
          </TouchableOpacity>
          <Text className="ml-3 text-2xl font-semibold">
            Create New Ticket
          </Text>
        </View>

        {/* <Text className="mt-1 text-gray-400">
          Attachments Maximum 5
        </Text> */}

        {/* ADD BUTTONS */}
        {/* <View className="flex-row justify-around mt-5">
          <TouchableOpacity
            onPress={pickDocument}
            className="flex-row px-4 py-2 rounded-xl"
            style={{ backgroundColor: primaryBg }}
          >
            <Ionicons name="document-outline" size={20} color="#fff" />
            <Text className="ml-2 text-white">Add document</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickPhoto}
            className="flex-row px-4 py-2 rounded-xl"
            style={{ backgroundColor: primaryBg }}
          >
            <Ionicons name="image-outline" size={20} color="#fff" />
            <Text className="ml-2 text-white">Add photo</Text>
          </TouchableOpacity>
        </View> */}

        {/* FORM */}
        <View
          className="mt-6 p-5 rounded-2xl"
          style={{ backgroundColor: softBg }}
        >
          {/* SELECT PROPERTY */}
          <Text className="mb-2 text-gray-600">Select Property</Text>
          <View ref={propertyRef}>
            <TouchableOpacity
              onPress={() => {
                propertyRef.current?.measureInWindow(
                  (x, y, width, height) => {
                    setDropdownPos({
                      top: y + height + 6,
                      left: x,
                      width,
                    });
                    setPropertyOpen(true);
                  }
                );
              }}
              className="bg-white border-slate-200 h-[45px] rounded-xl border px-4 flex-row justify-between items-center mb-4"
            >
              <Text
                style={{
                  color: selectedPropertyRef ? "#111827" : "#9CA3AF",
                }}
              >
                {selectedPropertyLabel || "Select Property"}
              </Text>
              <Ionicons
                name={propertyOpen ? "chevron-up" : "chevron-down"}
                size={18}
              />
            </TouchableOpacity>
          </View>

          {/* CATEGORY */}
          <Text className="mb-2 text-gray-600">Category</Text>
          <View ref={categoryRef}>
            <TouchableOpacity
              onPress={() => {
                categoryRef.current?.measureInWindow(
                  (x, y, width, height) => {
                    setDropdownPos({
                      top: y + height + 6,
                      left: x,
                      width,
                    });
                    setCategoryOpen(true);
                  }
                );
              }}
              className="bg-white border-slate-200 h-[45px] rounded-xl border px-4 flex-row justify-between items-center"
            >
              <Text
                style={{
                  color: selectedCategory ? "#111827" : "#9CA3AF",
                }}
              >
                {selectedCategory || "Select Category"}
              </Text>
              <Ionicons
                name={categoryOpen ? "chevron-up" : "chevron-down"}
                size={18}
              />
            </TouchableOpacity>
          </View>

          {/* DESCRIPTION */}
          <Text className="mt-5 mb-2 text-gray-600">
            Create Your Request
          </Text>
          <TextInput
            placeholder="Describe your issue..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            className="bg-white h-36 border-slate-200 rounded-xl border px-4 py-3"
            style={{ color: "#111827" }}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          disabled={uploading}
          onPress={handleSubmit}
          className="h-[50px] rounded-xl mt-6 justify-center items-center"
          style={{
            backgroundColor: uploading ? "#9CA3AF" : primaryBg,
          }}
        >
          <Text className="text-white text-[17px] font-semibold">
            {uploading ? "Uploading..." : "Post"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* PROPERTY DROPDOWN */}
      {propertyOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setPropertyOpen(false)}
          className="absolute inset-0 mt-9"
          style={{ zIndex: 50 }}
        >
          <View
            style={{
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              backgroundColor: "#fff",
              borderRadius: 12,
              elevation: 8,
            }}
          >
            {propertyOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setSelectedPropertyRef(option.value);
                  setPropertyOpen(false);
                }}
                className={`px-4 py-3 ${
                  index !== propertyOptions.length - 1
                    ? "border-b border-slate-200"
                    : ""
                }`}
              >
                <Text style={{ color: "#111827" }}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}

      {/* CATEGORY DROPDOWN */}
      {categoryOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setCategoryOpen(false)}
          className="absolute inset-0 mt-[45px]"
          style={{ zIndex: 50 }}
        >
          <View
            style={{
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              backgroundColor: "#fff",
              borderRadius: 12,
              elevation: 8,
            }}
          >
            {categories.map((cat, index) => (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setSelectedCategory(cat);
                  setCategoryOpen(false);
                }}
                className={`px-4 py-3 ${
                  index !== categories.length - 1
                    ? "border-b border-slate-200"
                    : ""
                }`}
              >
                <Text style={{ color: "#111827" }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}

      {/* SUCCESS */}
      {success && (
        <Animated.View
          style={{
            transform: [{ scale: successAnim }],
            opacity: successAnim,
          }}
          className="absolute inset-0 bg-white/90 justify-center items-center"
        >
          <Ionicons
            name="checkmark-circle"
            size={90}
            color="#22c55e"
          />
          <Text className="mt-4 text-lg font-semibold">
            Enter Details
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
