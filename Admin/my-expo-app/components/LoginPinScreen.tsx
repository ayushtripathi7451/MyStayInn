import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Image, 
  Text, 
  View, 
  TouchableWithoutFeedback, 
  Keyboard, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Dimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TopSwitchCard from "./TopSwitchCard";
import PinLoginCard from "./PinLoginCard";
import BiometricsCard from "./BiometricsCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginPinScreen({ navigation }: any) {
  const [globalPinFocus, setGlobalPinFocus] = useState(false);
  const [mode, setMode] = useState<"pin" | "biometric">("pin");
  const [firstName, setFirstName] = useState("User");
  

  useEffect(() => {
    // Fetch user's first name from AsyncStorage
    const getUserName = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const user = JSON.parse(userData);
          const fullName = `${user.firstName ?? ''} ${(user.lastName ?? '').trim()}`.trim() || 'User';
          setFirstName(fullName);
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    getUserName();
  }, []);

  const gradientColors: [string, string] =
     ["#6D7BFF", "#0040FF"];

  return (
    <LinearGradient
      colors={gradientColors}
      style={{ flex: 1 }} // Changed from className to style for reliability
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          scrollEnabled={false} 
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={{ flex: 1 }} className="pt-4">
            <TouchableWithoutFeedback
              onPress={() => {
                Keyboard.dismiss();
                setGlobalPinFocus(false);
              }}
            >
              <View style={{ flex: 1 }}>
                
                {/* WELCOME TEXT */}
                <View className="px-6">
                  <Text className="text-white text-3xl font-semibold">
                    Welcome, {firstName} 👋
                  </Text>
                </View>

                {/* LOGIN SWITCH CARD */}
                <TopSwitchCard
                  mode={mode}
                  setMode={setMode}
                  navigation={navigation}
                  firstName={firstName}
                />

                {/* LOGIN FORM & BACKGROUND CONTAINER */}
                <View className="flex-1 items-center w-full mt-10">
                  
                  {/* ✅ FIX: Place background elements BEFORE the cards in code 
                    to act as a background without needing negative zIndex.
                  */}
                  <View 
                    style={{ 
                      position: 'absolute', 
                      top: SCREEN_HEIGHT * 0.22, // Dynamic positioning for iPhone
                      width: '100%',
                      alignItems: 'center',
                    }}
                  >
                    <View className="w-full px-8">
                      <Text 
                        className="text-white font-bold leading-tight"
                        style={{ 
                           fontSize: 40,
                           opacity: 0.9,
                           textShadowColor: 'rgba(0, 0, 0, 0.1)',
                           textShadowOffset: { width: 0, height: 2 },
                           textShadowRadius: 4 
                        }}
                      >
                        Stay Happy{"\n"}& Stay Strong
                      </Text>
                    </View>

                    <Image
                      source={require("../assets/Group 918.png")}
                      style={{ 
                        width: 320, 
                        height: 220, 
                        marginTop: 10,
                        marginLeft: 40 
                      }}
                      resizeMode="contain"
                    />
                  </View>

                  {/* CARDS (Rendered after so they sit on top) */}
                  {mode === "pin" ? (
                    <PinLoginCard
                      navigation={navigation}
                      globalPinFocus={globalPinFocus}
                      setGlobalPinFocus={setGlobalPinFocus}
                    />
                  ) : (
                    <BiometricsCard navigation={navigation} />
                  )}

                </View>
              </View>
            </TouchableWithoutFeedback>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}