import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { bookingApi } from "../utils/api";

const TERMS_AND_CONDITIONS = [
  "Notice period for vacating is 30 days; failure to give notice may attract penalty of 1 month's rent.",
  "Rent is due on or before the 5th of every month.",
  "Advance/Rent is non-refundable and non-transferable.",
  "Outside visitors are not allowed without prior permission.",
  "Guest accommodation charges: Rs. 600/- per day with/without food, with permission.",
  "Maintenance charges: Rs. 1500/- while vacating.",
  "Management is not responsible for personal belongings (Gold, Credit/Debit card, Mobile & Laptops, Cash etc.).",
  "Lights & fans must be switched off before leaving the room.",
  "Food consumption restricted to dining hall only.",
  "Charges may apply for damage to PG property.",
  "Key replacement charge: Rs. 500/- for duplicate.",
  "Smoking & liquor prohibited inside the room.",
  "Cooperation in keeping rooms clean is requested.",
  "Disposal of garbage in dustbins only.",
  "Keys and belongings must be returned to PG owner upon vacating.",
];

type PrefilledData = {
  pgInfo?: { pgName?: string; address?: string | Record<string, unknown>; contactNumbers?: string[] };
  guestPersonal?: {
    name?: string;
    mobile?: string;
    dateOfBirth?: string;
    gender?: string;
    profession?: string;
    permanentAddress?: string | Record<string, unknown>;
    addressAsPerAadhaar?: string;
    currentAddress?: string;
    email?: string;
  };
  identity?: { idProofDetails?: string; aadhaarNumber?: string };
  payment?: { depositReceivedAmount?: number; monthlyRentAmount?: number };
  emergency?: { emergencyContactName?: string; emergencyContactNumber?: string };
  roomAllotment?: { date?: string; guestRoomAllotment?: string; guestPhotoUrl?: string };
  termsAndConditions?: string;
  /** Property rules (from admin) shown in TERMS & CONDITIONS section */
  propertyRules?: { items?: string[] } | null;
};

/** Safely convert API value to string for display (handles address objects like { city, line1, line2, state, pincode }). */
function toDisplayValue(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object" && !Array.isArray(val)) {
    const o = val as Record<string, unknown>;
    if (
      "city" in o ||
      "line1" in o ||
      "line2" in o ||
      "state" in o ||
      "pincode" in o ||
      "stateCode" in o
    ) {
      const parts = [
        o.line1,
        o.line2,
        o.city,
        o.state ?? o.stateCode,
        o.pincode,
      ].filter((x) => x != null && x !== "");
      return parts.join(", ") || "";
    }
  }
  return String(val);
}

/** Form-style row: label on left, value with bottom border (dotted-line look) */
function FormRow({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value?: string | number | Record<string, unknown>;
  fullWidth?: boolean;
}) {
  const v = toDisplayValue(value);
  return (
    <View className={`mb-3 ${fullWidth ? "w-full" : ""}`}>
      <View className="flex-row items-end flex-wrap">
        <Text className="text-xs text-slate-600 font-medium" style={{ minWidth: 28 }}>
          {label}
        </Text>
        <View
          className="flex-1 border-b border-slate-300 ml-1 pb-0.5 min-h-[20px]"
          style={{ borderStyle: "dotted" }}
        >
          <Text className="text-sm text-slate-900" numberOfLines={2}>
            {v || " "}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Inline pair: e.g. "Name .............. Mob .............." */
function FormRowPair({
  label1,
  value1,
  label2,
  value2,
}: {
  label1: string;
  value1?: string | number | Record<string, unknown>;
  label2: string;
  value2?: string | number | Record<string, unknown>;
}) {
  const v1 = toDisplayValue(value1);
  const v2 = toDisplayValue(value2);
  return (
    <View className="flex-row mb-3 gap-4">
      <View className="flex-1">
        <Text className="text-xs text-slate-600 font-medium">{label1}</Text>
        <View className="border-b border-slate-300 pb-0.5" style={{ borderStyle: "dotted" }}>
          <Text className="text-sm text-slate-900" numberOfLines={1}>
            {v1 || " "}
          </Text>
        </View>
      </View>
      <View className="flex-1">
        <Text className="text-xs text-slate-600 font-medium">{label2}</Text>
        <View className="border-b border-slate-300 pb-0.5" style={{ borderStyle: "dotted" }}>
          <Text className="text-sm text-slate-900" numberOfLines={1}>
            {v2 || " "}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function GuestEnrollmentFormScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [form, setForm] = useState<{
    status: string;
    prefilledData?: PrefilledData | null;
    signatureName?: string | null;
    signedAt?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchForm = useCallback(async () => {
    try {
      setError(null);
      const res = await bookingApi.get("/api/bookings/guest-enrollment-form");
      if (res.data?.success && res.data?.form) {
        const raw = res.data.form;
        const prefilledData =
          typeof raw.prefilledData === "string"
            ? (() => {
                try {
                  return JSON.parse(raw.prefilledData);
                } catch {
                  return null;
                }
              })()
            : raw.prefilledData ?? null;
        setForm({ ...raw, prefilledData });
      } else {
        setForm(null);
        setError("No enrollment form found.");
      }
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setForm(null);
        setError("No enrollment form to sign for your current booking.");
      } else {
        setError(e?.response?.data?.message || e?.message || "Failed to load form.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchForm();
    }, [fetchForm])
  );

  const handleSign = async () => {
    const name = signatureName.trim();
    if (!name || name.length < 2) {
      Alert.alert("Required", "Please enter your full name to sign.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await bookingApi.post("/api/bookings/guest-enrollment-form/sign", {
        signatureName: name,
      });
      if (res.data?.success) {
        setForm((prev) =>
          prev ? { ...prev, status: "signed", signatureName: name, signedAt: new Date().toISOString() } : null
        );
        Alert.alert("Signed", "Your enrollment form has been signed and sent to the admin.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", res.data?.message || "Failed to sign.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to sign.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#1E33FF" />
        <Text className="text-slate-500 mt-3">Loading form...</Text>
      </SafeAreaView>
    );
  }

  if (error && !form) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-2 text-lg font-bold text-slate-900">Enrollment Form</Text>
        </View>
        <View className="flex-1 justify-center px-6">
          <Text className="text-slate-600 text-center">{error}</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mt-6 bg-slate-800 py-3 rounded mx-8"
          >
            <Text className="text-white text-center font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const data = form?.prefilledData;
  const isSigned = form?.status === "signed";
  const pg = data?.pgInfo;
  const guest = data?.guestPersonal;
  const identity = data?.identity;
  const employment = data?.employment;
  const payment = data?.payment;
  const emergency = data?.emergency;
  const room = data?.roomAllotment;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-2 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-2 text-base font-semibold text-slate-800">Enrollment Form</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header: PG name, address, contact */}
        <View className="px-4 pt-6 pb-4 border-b border-slate-300">
          <Text className="text-xl font-bold text-slate-900 text-center" style={{ fontFamily: "serif" }}>
            {pg?.pgName || "PG"}
          </Text>
          {pg?.address ? (
            <Text className="text-sm text-slate-700 text-center mt-1">{toDisplayValue(pg.address)}</Text>
          ) : null}
          {Array.isArray(pg?.contactNumbers) && pg.contactNumbers.length > 0 ? (
            <Text className="text-sm text-slate-700 text-center mt-1">
              M: {pg.contactNumbers.join(" / ")}
            </Text>
          ) : null}
          <View className="mt-4 items-center">
            <View className="bg-slate-100 px-6 py-2 rounded-full">
              <Text className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Guest Enrollment Form
              </Text>
            </View>
          </View>
        </View>

        {/* Form body: label + dotted-line value rows */}
        <View className="px-4 py-5">
          {/* Date (top right) + Name & Mob */}
          <View className="flex-row justify-between mb-1">
            <View className="flex-1" />
            <View className="flex-1 items-end">
              <Text className="text-xs text-slate-600">Date:</Text>
              <View className="border-b border-slate-300 w-24 pb-0.5" style={{ borderStyle: "dotted" }}>
                <Text className="text-sm text-slate-900">{toDisplayValue(room?.date) || " "}</Text>
              </View>
            </View>
          </View>
          <FormRowPair label1="Name" value1={guest?.name} label2="Mob." value2={guest?.mobile} />
          <FormRowPair
            label1="Emergency contact name"
            value1={emergency?.emergencyContactName}
            label2="Mob."
            value2={emergency?.emergencyContactNumber}
          />
          <FormRow label="Date of Birth" value={guest?.dateOfBirth} />
          <FormRow label="Gender" value={guest?.gender} />
          <FormRow label="Profession" value={guest?.profession} />
          <View className="mb-3">
            <Text className="text-xs text-slate-600 font-medium mb-0.5">Permanent Address</Text>
            <View className="border-b border-slate-300 pb-1" style={{ borderStyle: "dotted" }}>
              <Text className="text-sm text-slate-900" numberOfLines={3}>
                {toDisplayValue(guest?.permanentAddress) || " "}
              </Text>
            </View>
          </View>
          {guest?.addressAsPerAadhaar ? (
            <View className="mb-3">
              <Text className="text-xs text-slate-600 font-medium mb-0.5">Address as per Aadhaar</Text>
              <View className="border-b border-slate-300 pb-1" style={{ borderStyle: "dotted" }}>
                <Text className="text-sm text-slate-900" numberOfLines={2}>
                  {guest.addressAsPerAadhaar}
                </Text>
              </View>
            </View>
          ) : null}
          {guest?.currentAddress && guest.currentAddress !== toDisplayValue(guest?.permanentAddress) ? (
            <View className="mb-3">
              <Text className="text-xs text-slate-600 font-medium mb-0.5">Current Address</Text>
              <View className="border-b border-slate-300 pb-1" style={{ borderStyle: "dotted" }}>
                <Text className="text-sm text-slate-900" numberOfLines={2}>
                  {guest.currentAddress}
                </Text>
              </View>
            </View>
          ) : null}
          <FormRow label="E-Mail ID" value={guest?.email} />
          <FormRow label="ID Proof Details" value={identity?.idProofDetails} />
          <FormRow label="Aadhaar No #" value={identity?.aadhaarNumber} />
          <FormRow label="Deposit Received Amt Rs." value={payment?.depositReceivedAmount} />
          <FormRow label="Monthly Rent Amt Rs." value={payment?.monthlyRentAmount} />

          {/* Room allotment + Photo box (two-column on paper; we stack on mobile) */}
          <View className="mt-4 flex-row gap-4">
            <View className="flex-1">
              <Text className="text-xs text-slate-600 font-medium mb-1">Guest Room allotment</Text>
              <View
                className="border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]"
                style={{ borderStyle: "dotted" }}
              >
                <Text className="text-sm text-slate-900">{toDisplayValue(room?.guestRoomAllotment) || " "}</Text>
              </View>
            </View>
            <View className="w-24 h-28 border border-slate-300 rounded items-center justify-center bg-slate-50">
              {room?.guestPhotoUrl ? (
                <Image source={{ uri: room.guestPhotoUrl }} className="w-full h-full rounded" resizeMode="cover" />
              ) : (
                <Text className="text-xs text-slate-400">Photo</Text>
              )}
            </View>
          </View>
        </View>

        {/* Terms & Conditions — use property rules when available (same as admin-saved rules), else fallback */}
        <View className="px-4 py-4 border-t border-slate-300 mt-2">
          <Text className="text-base font-bold text-slate-900 underline mb-3">TERMS & CONDITIONS</Text>
          {(Array.isArray(data?.propertyRules?.items) && data.propertyRules.items.length > 0
            ? data.propertyRules.items
            : TERMS_AND_CONDITIONS
          ).map((point, i) => (
            <View key={i} className="flex-row mb-2">
              <Text className="text-slate-700 font-semibold mr-2" style={{ minWidth: 20 }}>
                {i + 1}.
              </Text>
              <Text className="flex-1 text-sm text-slate-700">{point}</Text>
            </View>
          ))}
        </View>

        {/* Signature section */}
        <View className="px-4 py-6 border-t-2 border-slate-400 mt-2">
          <View>
            <Text className="text-xs font-semibold text-slate-700 mb-1">Signature of Guest</Text>
              {isSigned ? (
                <View className="border-b border-slate-400 py-2">
                  <Text className="text-sm font-semibold text-slate-900">{form?.signatureName || "—"}</Text>
                  {form?.signedAt ? (
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {new Date(form.signedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <>
                  <TextInput
                    value={signatureName}
                    onChangeText={setSignatureName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                    className="border-b border-slate-400 py-2 text-slate-900 font-medium text-sm"
                  />
                  <TouchableOpacity
                    onPress={handleSign}
                    disabled={submitting}
                    className="mt-4 bg-slate-800 py-3 rounded"
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white text-center font-semibold">Sign & Submit</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
          </View>
          {isSigned && (
            <View className="mt-4 bg-green-50 rounded-lg p-3 border border-green-200">
              <Text className="text-green-800 text-sm font-medium">
                This form has been signed and sent to the admin.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
