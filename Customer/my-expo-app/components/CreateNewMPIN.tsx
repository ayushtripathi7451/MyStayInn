import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateNewMPIN({ navigation }: any) {
  const newPinRef = useRef<TextInput>(null);
  const confirmPinRef = useRef<TextInput>(null);

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // ✅ SAVE MPIN
  const saveMPIN = async () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      Alert.alert("Invalid MPIN", "MPIN must be 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert("MPIN Mismatch", "Both MPINs must be same");
      return;
    }

    await SecureStore.setItemAsync("USER_MPIN", newPin);
    await SecureStore.setItemAsync("MPIN_ATTEMPTS", "0");

    Alert.alert("Success", "MPIN created successfully");
    navigation.replace("LoginPin");
  };

  return (
    <LinearGradient colors={["#6D7BFF", "#0040FF"]} className="flex-1">
      <SafeAreaView className="flex-1 pt-10">

        {/* TITLE CARD */}
        <View className="mx-6 rounded-[30px] p-6 mt-20 bg-white">
          <Text className="text-[26px] font-semibold mb-2">
            Create New MPIN
          </Text>
          <Text className="text-gray-500 text-[14px]">
            Set a new 4-digit MPIN
          </Text>
        </View>

        {/* MPIN CARD */}
        <View className="flex-1 justify-start items-center w-full mt-10">

          <View
            className="mx-4 mb-60 p-8 w-11/12 rounded-[32px]"
            style={{
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1.5,
              borderColor: "rgba(255,255,255,0.55)",
            }}
          >

            {/* ✅ ENTER NEW MPIN */}
            <Text className="text-white text-center mb-2">
              Enter New MPIN
            </Text>

            <TextInput
              ref={newPinRef}
              value={newPin}
              onChangeText={(t) =>
                setNewPin(t.replace(/[^0-9]/g, "").slice(0, 4))
              }
              keyboardType="number-pad"
              maxLength={4}
              style={{ position: "absolute", opacity: 0 }}
            />

            <TouchableOpacity onPress={() => newPinRef.current?.focus()}>
              <View className="flex-row justify-center gap-5 mb-6">
                {[...Array(4)].map((_, i) => (
                  <View
                    key={i}
                    className="w-12 h-12 border-2 border-white rounded-xl justify-center items-center"
                  >
                    <Text className="text-white text-2xl font-bold">
                      {newPin[i] ? "•" : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* ✅ CONFIRM MPIN */}
            <Text className="text-white text-center mb-2">
              Confirm MPIN
            </Text>

            <TextInput
              ref={confirmPinRef}
              value={confirmPin}
              onChangeText={(t) =>
                setConfirmPin(t.replace(/[^0-9]/g, "").slice(0, 4))
              }
              keyboardType="number-pad"
              maxLength={4}
              style={{ position: "absolute", opacity: 0 }}
            />

            <TouchableOpacity onPress={() => confirmPinRef.current?.focus()}>
              <View className="flex-row justify-center gap-5 mb-8">
                {[...Array(4)].map((_, i) => (
                  <View
                    key={i}
                    className="w-12 h-12 border-2 border-white rounded-xl justify-center items-center"
                  >
                    <Text className="text-white text-2xl font-bold">
                      {confirmPin[i] ? "•" : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* ✅ SAVE BUTTON */}
            <TouchableOpacity
              onPress={saveMPIN}
              disabled={newPin.length < 4 || confirmPin.length < 4}
              className={`py-3 rounded-full ${
                newPin.length === 4 && confirmPin.length === 4
                  ? "bg-white"
                  : "bg-white/60"
              }`}
            >
              <Text className="text-blue-600 text-center font-semibold text-[18px]">
                Save MPIN
              </Text>
            </TouchableOpacity>

          </View>

          {/* ✅ BACKGROUND TEXT + IMAGE */}
          <View className="absolute" style={{ zIndex: -1, top: 280 }}>
            <Text className="text-white text-[40px] mr-40 -mt-2 font-bold">
              My Stay{"\n"}My Life
            </Text>

            <Image
              source={require("../assets/Group 918.png")}
              className="w-80 h-56 ml-14"
              resizeMode="contain"
            />
          </View>

        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}
