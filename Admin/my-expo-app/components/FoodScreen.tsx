import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import SetupHeader from "./SetupHeader";
import ScrollableDatePicker from "./ScrollableDatePicker";
import { propertyApi } from "../utils/api";
import { useProperty } from "../contexts/PropertyContext";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SECTIONS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snack", label: "Snack" },
  { key: "dinner", label: "Dinner" },
];

type TimeStr = string; // "HH:mm"
interface SectionState {
  enabled: boolean;
  startTime: Date;
  endTime: Date;
  menu: string;
  notifyAtStart: boolean;
}

const defaultSection = (): SectionState => ({
  enabled: false,
  startTime: new Date(2000, 0, 1, 8, 0),
  endTime: new Date(2000, 0, 1, 10, 0),
  menu: "",
  notifyAtStart: true,
});

type DayState = Record<string, SectionState>;
type FoodMenuState = Record<number, DayState>;

function getDefaultFoodMenu(): FoodMenuState {
  const out: FoodMenuState = {};
  for (let d = 0; d < 7; d++) {
    out[d] = {
      breakfast: defaultSection(),
      lunch: defaultSection(),
      snack: defaultSection(),
      dinner: defaultSection(),
    };
  }
  return out;
}

export default function FoodScreen({ navigation, route }: any) {
  const { currentProperty } = useProperty();
  const propertyId = route.params?.propertyId ?? currentProperty?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [foodMenu, setFoodMenu] = useState<FoodMenuState>(getDefaultFoodMenu);

  useEffect(() => {
    loadFoodMenu();
  }, [propertyId]);

  const loadFoodMenu = async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    try {
      const res = await propertyApi.get(`/api/properties/${propertyId}`).catch(() => null);
      const rules = res?.data?.property?.rules;
      const fm = rules?.foodMenu;
      if (fm?.days && typeof fm.days === "object") {
        const next = getDefaultFoodMenu();
        for (let d = 0; d < 7; d++) {
          const dayData = fm.days[String(d)];
          if (dayData) {
            SECTIONS.forEach(({ key }) => {
              const s = dayData[key];
              if (s && typeof s === "object") {
                next[d][key] = {
                  enabled: !!s.enabled,
                  startTime: s.startTime ? new Date(s.startTime) : next[d][key].startTime,
                  endTime: s.endTime ? new Date(s.endTime) : next[d][key].endTime,
                  menu: String(s.menu ?? ""),
                  notifyAtStart: s.notifyAtStart !== false,
                };
              }
            });
          }
        }
        setFoodMenu(next);
      }
    } catch (_) {}
    setLoading(false);
  };

  const updateSection = (dayIndex: number, sectionKey: string, field: keyof SectionState, value: any) => {
    setFoodMenu((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[dayIndex]) next[dayIndex] = { breakfast: defaultSection(), lunch: defaultSection(), snack: defaultSection(), dinner: defaultSection() };
      next[dayIndex][sectionKey] = { ...next[dayIndex][sectionKey], [field]: value };
      return next;
    });
  };

  const buildFoodMenuPayload = () => {
    const days: Record<string, Record<string, any>> = {};
    for (let d = 0; d < 7; d++) {
      days[String(d)] = {};
      SECTIONS.forEach(({ key }) => {
        const s = foodMenu[d]?.[key] ?? defaultSection();
        const start = s.startTime instanceof Date ? s.startTime : new Date(s.startTime || 0);
        const end = s.endTime instanceof Date ? s.endTime : new Date(s.endTime || 0);
        days[String(d)][key] = {
          enabled: s.enabled,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          menu: s.menu,
          notifyAtStart: s.notifyAtStart,
        };
      });
    }
    return { days };
  };

  const handleSave = async () => {
    if (!propertyId) {
      Alert.alert("Error", "No property selected.");
      return;
    }
    setSaving(true);
    try {
      const foodPayload = buildFoodMenuPayload();
      const res = await propertyApi.get(`/api/properties/${propertyId}`).catch(() => null);
      const existingRules = res?.data?.property?.rules ?? {};
      const rulesPayload = typeof existingRules === "object" && existingRules !== null
        ? { ...existingRules, foodMenu: foodPayload }
        : { foodMenu: foodPayload };
      await propertyApi.put(`/api/properties/${propertyId}`, { rules: rulesPayload });
      Alert.alert("Saved", "Food menu has been saved.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || e.message || "Failed to save food menu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  const dayState = foodMenu[activeDay] || {
    breakfast: defaultSection(),
    lunch: defaultSection(),
    snack: defaultSection(),
    dinner: defaultSection(),
  };

  const ACTIVE_COLOR = "#4F46E5";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <SetupHeader activeTab="Food" />
      <ScrollView
        className="px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text className="text-2xl font-bold text-gray-900 mt-6 tracking-tight">Food menu & timings</Text>
        <Text className="text-gray-500 mb-6">Set menu for each day. You can notify tenants when food is ready.</Text>

        {/* Day tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4 -mx-6 px-6"
          contentContainerStyle={{ gap: 8 }}
        >
          {DAY_NAMES.map((name, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setActiveDay(idx)}
              className={`px-4 py-3 rounded-2xl ${activeDay === idx ? "bg-[#2F3CFF]" : "bg-gray-100 border border-gray-200"}`}
            >
              <Text className={activeDay === idx ? "text-white font-semibold" : "text-gray-600"}>{name.slice(0, 3)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sections for active day */}
        <View className="mt-8 p-5 bg-gray-50 rounded-3xl border border-gray-100">
          <Text className="text-lg font-bold text-gray-900 mb-4">{DAY_NAMES[activeDay]}</Text>
          {SECTIONS.map(({ key, label }) => {
            const s = dayState[key] ?? defaultSection();
            const startTime = s.startTime instanceof Date ? s.startTime : new Date(s.startTime || 0);
            const endTime = s.endTime instanceof Date ? s.endTime : new Date(s.endTime || 0);
            return (
              <View key={key} className="mb-6 p-4 bg-white rounded-2xl border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-bold text-gray-800">{label}</Text>
                  <Switch
                    value={s.enabled}
                    onValueChange={(v) => updateSection(activeDay, key, "enabled", v)}
                    trackColor={{ false: "#D1D5DB", true: "#A5B4FC" }}
                    thumbColor={s.enabled ? ACTIVE_COLOR : "#F3F4F6"}
                  />
                </View>
                {s.enabled && (
                  <>
                    <View className="flex-row flex-wrap gap-4 mb-3">
                      <View className="flex-1 min-w-[120]">
                        <Text className="text-gray-500 text-xs mb-1 font-medium">Start time</Text>
                        <ScrollableDatePicker
                          selectedDate={startTime}
                          onDateChange={(d) => updateSection(activeDay, key, "startTime", d)}
                          mode="time"
                          placeholder="Start"
                          containerStyle="border border-gray-200 bg-white rounded-2xl px-3 py-2"
                        />
                      </View>
                      <View className="flex-1 min-w-[120]">
                        <Text className="text-gray-500 text-xs mb-1 font-medium">End time</Text>
                        <ScrollableDatePicker
                          selectedDate={endTime}
                          onDateChange={(d) => updateSection(activeDay, key, "endTime", d)}
                          mode="time"
                          placeholder="End"
                          containerStyle="border border-gray-200 bg-white rounded-2xl px-3 py-2"
                        />
                      </View>
                    </View>
                    <View className="mb-3">
                      <Text className="text-gray-500 text-xs mb-1 font-medium">Menu</Text>
                      <TextInput
                        value={s.menu}
                        onChangeText={(t) => updateSection(activeDay, key, "menu", t)}
                        placeholder="e.g. Poha, Idli, Coffee"
                        className="border border-gray-200 bg-white rounded-2xl px-4 py-3 text-gray-800"
                      />
                    </View>
                    {/* <View className="flex-row items-center justify-between">
                      <Text className="text-gray-600 text-sm">Notify tenants at start time (food ready)</Text>
                      <Switch
                        value={s.notifyAtStart}
                        onValueChange={(v) => updateSection(activeDay, key, "notifyAtStart", v)}
                        trackColor={{ false: "#D1D5DB", true: "#A5B4FC" }}
                        thumbColor={s.notifyAtStart ? ACTIVE_COLOR : "#F3F4F6"}
                      />
                    </View> */}
                  </>
                )}
              </View>
            );
          })}
        </View>

        <View className="flex-row items-center justify-between mt-12 mb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="flex-row items-center justify-center px-8 py-4 rounded-2xl bg-gray-100 border border-gray-200"
          >
            <Ionicons name="chevron-back" size={20} color="#4B5563" />
            <Text className="text-gray-600 font-bold ml-1">Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
            className="flex-row items-center justify-center px-8 py-4 rounded-2xl bg-[#2F3CFF]"
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="food-apple-outline" size={20} color="white" />
                <Text className="text-white font-bold ml-1">Save food menu</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
