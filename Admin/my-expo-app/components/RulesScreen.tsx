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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileHeader from "./SetupHeader";
import { propertyApi } from "../utils/api";
import { useProperty } from "../contexts/PropertyContext";

const FIXED_RULES: { key: string; text: string; useNoticeDays?: boolean; isExitFee?: boolean }[] = [
  { key: "rent_due", text: "Rent must be paid on or before the due date. Late payment penalties will be applicable." },
  { key: "non_refundable", text: "Advance or rent once paid is non-refundable and non-transferable." },
  { key: "prohibited", text: "Smoking, alcohol consumption, drugs, Gambling or illegal activities are strictly prohibited within premises." },
  { key: "guests", text: "Unauthorized guests are not allowed without prior permission from management/owner." },
  { key: "opposite_gender", text: "Entry of opposite gender without written permission is restricted." },
  { key: "belongings", text: "Management is not responsible for personal belongings (gold, cards, mobiles, laptops, cash, etc.)." },
  { key: "inspection", text: "Management reserves rights to visits room for inspection and for housekeeping/repairs." },
  { key: "privacy", text: "Respect privacy of other resident and avoid excessive noise, discriminatory behaviour." },
  { key: "cleanliness", text: "Residents must keep rooms, bathrooms, and common areas clean at all times and follow applicable rules." },
  { key: "garbage", text: "Dispose of garbage only in designated dustbins." },
  { key: "food_hygiene", text: "Residents must avoid food wastage, maintain hygiene in dining areas and follow food timings." },
  { key: "internet", text: "Internet usage should be for lawful purposes and not shared beyond tenants." },
  { key: "illegal", text: "Illegal acts or harassment can lead to eviction and legal action." },
  { key: "cancel", text: "Management reserves the right to cancel accommodation without refund in case of misconduct or for rule violations or non-payment of dues." },
  { key: "authorities", text: "Accommodations may require tenant details to be shared with local authorities." },
  { key: "exit_fee", text: "Standard exit fee will be deducted at the time of vacating.", isExitFee: true },
];

export default function RulesScreen({ navigation, route }: any) {
  const { currentProperty } = useProperty();
  const propertyId = route.params?.propertyId ?? currentProperty?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useNoticePeriod, setUseNoticePeriod] = useState(true);
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");
  const [exitFeeAmount, setExitFeeAmount] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [customRules, setCustomRules] = useState<string[]>(["", "", "", "", ""]);

  useEffect(() => {
    loadRules();
  }, [propertyId]);

  const loadRules = async () => {
    const defaultChecked: Record<string, boolean> = {};
    FIXED_RULES.forEach((r) => {
      if (r.key) defaultChecked[r.key] = !r.isExitFee;
    });
    if (!propertyId) {
      setChecked(defaultChecked);
      setLoading(false);
      return;
    }
    try {
      const res = await propertyApi.get(`/api/properties/${propertyId}`).catch(() => null);
      const rules = res?.data?.property?.rules;
      if (rules && typeof rules === "object") {
        if (typeof rules.useNoticePeriod === "boolean") setUseNoticePeriod(rules.useNoticePeriod);
        if (rules.noticePeriodDays != null) setNoticePeriodDays(String(rules.noticePeriodDays));
        if (rules.exitFeeAmount != null) setExitFeeAmount(String(rules.exitFeeAmount ?? ""));
        if (rules.checked && typeof rules.checked === "object") setChecked({ ...defaultChecked, ...rules.checked });
        else setChecked(defaultChecked);
        if (rules.checked?.exit_fee == null && typeof rules.exitFeeEnabled === "boolean") {
          setChecked((c) => ({ ...c, exit_fee: rules.exitFeeEnabled }));
        }
        if (Array.isArray(rules.customRules)) {
          const arr = rules.customRules.slice(0, 5);
          setCustomRules([...arr, "", "", "", "", ""].slice(0, 5));
        }
      } else {
        setChecked(defaultChecked);
      }
    } catch (_) {
      setChecked(defaultChecked);
    }
    setLoading(false);
  };

  const toggleRule = (key: string) => {
    setChecked((c) => ({ ...c, [key]: !c[key] }));
  };

  const buildRulesPayload = () => {
    const items: string[] = [];
    if (useNoticePeriod && noticePeriodDays.trim()) {
      const days = noticePeriodDays.trim();
      items.push(`Residents must provide prior notice of ${days} days before vacating, failing which deposit will be forfeited.`);
    } else {
      items.push("Residents must provide prior notice before vacating, failing which deposit will be forfeited.");
    }
    FIXED_RULES.filter((r) => !r.isExitFee).forEach((r) => {
      if (checked[r.key] !== false) items.push(r.text);
    });
    if (checked.exit_fee && exitFeeAmount.trim()) {
      items.push(`Standard exit fee of ₹${exitFeeAmount.trim()} will be deducted at the time of vacating.`);
    }
    customRules.filter(Boolean).forEach((t) => items.push(t));
    return {
      useNoticePeriod,
      noticePeriodDays: useNoticePeriod ? parseInt(noticePeriodDays, 10) || 30 : undefined,
      exitFeeEnabled: !!checked.exit_fee,
      exitFeeAmount: exitFeeAmount.trim() || undefined,
      checked,
      customRules,
      items,
    };
  };

  const handleSave = async () => {
    if (!propertyId) {
      Alert.alert("Error", "No property selected.");
      return;
    }
    setSaving(true);
    try {
      const payload = buildRulesPayload();
      await propertyApi.put(`/api/properties/${propertyId}`, { rules: payload });
      Alert.alert("Saved", "Rules have been saved.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || e.message || "Failed to save rules.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6D28D9" />
      </SafeAreaView>
    );
  }

  const ACTIVE_COLOR = "#4F46E5";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProfileHeader activeTab="Rules" />
      <ScrollView
        className="px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text className="text-2xl font-bold text-gray-900 mt-6 tracking-tight">Property rules & regulations</Text>
        <Text className="text-gray-500 mb-6">Select and edit rules for your property. Tenants will see these.</Text>

        {/* Standard rules (includes dynamic notice; exit fee row is last with inline amount) */}
        <View className="mt-8 p-5 bg-gray-50 rounded-3xl border border-gray-100">
          <Text className="text-lg font-bold text-gray-900 mb-3">Standard rules</Text>
          {/* Dynamic notice rule with ${days} in UI */}
          <View className="flex-row items-start py-3 border-b border-gray-100">
            <View className="w-6 h-6 rounded border-2 border-gray-300 mr-3 mt-0.5 items-center justify-center bg-white">
              <Ionicons name="checkmark" size={16} color={ACTIVE_COLOR} />
            </View>
            <Text className="flex-1 text-gray-700 text-sm">
              Residents must provide prior notice of {noticePeriodDays.trim() || "30"} days before vacating, failing which deposit will be forfeited.
            </Text>
          </View>
          {FIXED_RULES.filter((r) => !r.isExitFee).map((r) => (
            <TouchableOpacity
              key={r.key}
              onPress={() => toggleRule(r.key)}
              className="flex-row items-start py-3 border-b border-gray-100"
            >
              <View className="w-6 h-6 rounded border-2 border-gray-300 mr-3 mt-0.5 items-center justify-center bg-white">
                {checked[r.key] !== false && <Ionicons name="checkmark" size={16} color={ACTIVE_COLOR} />}
              </View>
              <Text className="flex-1 text-gray-700 text-sm">{r.text}</Text>
            </TouchableOpacity>
          ))}
          {/* Exit fee: same row style, unchecked by default, inline editable amount */}
          <TouchableOpacity
            onPress={() => toggleRule("exit_fee")}
            className="flex-row items-center py-3"
            activeOpacity={0.7}
          >
            <View className="w-6 h-6 rounded border-2 border-gray-300 mr-3 items-center justify-center bg-white">
              {checked.exit_fee && <Ionicons name="checkmark" size={16} color={ACTIVE_COLOR} />}
            </View>
            <View className="flex-1 flex-row flex-wrap items-center">
              <Text className="text-gray-700 text-sm">Standard exit fee of ₹</Text>
              <TextInput
                value={exitFeeAmount}
                onChangeText={setExitFeeAmount}
                placeholder="0"
                keyboardType="number-pad"
                onPressIn={(e) => e.stopPropagation()}
                className="min-w-[72px] max-w-[100px] border border-gray-200 rounded-lg bg-white px-2 py-1.5 text-gray-800 text-sm"
              />
              <Text className="text-gray-700 text-sm"> will be deducted at the time of vacating.</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Add your own rules */}
        <View className="mt-8 p-5 bg-gray-50 rounded-3xl border border-gray-100">
          <Text className="text-lg font-bold text-gray-900 mb-3">Add your own rules</Text>
          {[0, 1, 2, 3, 4].map((i) => (
            <TextInput
              key={i}
              value={customRules[i] ?? ""}
              onChangeText={(t) => {
                const next = [...customRules];
                next[i] = t;
                setCustomRules(next);
              }}
              placeholder={`Custom rule ${i + 1} (optional)`}
              className="border border-gray-200 rounded-2xl px-4 py-3 mt-2 bg-white text-gray-800"
            />
          ))}
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
                <Ionicons name="save-outline" size={20} color="white" />
                <Text className="text-white font-bold ml-1">Save rules</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
