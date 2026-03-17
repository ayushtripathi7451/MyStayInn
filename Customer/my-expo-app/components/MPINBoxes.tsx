import React, { useRef } from "react";
import { View, Text, TextInput, Pressable } from "react-native";

export default function MPINBoxes({
  value,
  onChange,
  secure = true,
}: {
  value: string;
  onChange: (t: string) => void;
  secure?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      className="mt-2"
    >
      <View className="flex-row justify-around">
        {[0, 1, 2, 3].map((i) => {
          const filled = value.length > i;
          const active = value.length === i;

          return (
            <View
              key={i}
              className={`w-14 h-12 mx-1 rounded-xl items-center justify-center border
                ${
                  filled
                    ? "border-purple-600"
                    : active
                    ? "border-purple-400"
                    : "border-gray-300"
                }
              `}
            >
              <Text
                style={{
                  fontSize: 20, // 🔥 BIGGER DOT
                  lineHeight: 32,
                }}
              >
                {filled ? (secure ? "•" : value[i]) : ""}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) =>
          onChange(t.replace(/[^0-9]/g, "").slice(0, 4))
        }
        keyboardType="number-pad"
        maxLength={4}
        style={{ position: "absolute", opacity: 0 }}
      />
    </Pressable>
  );
}
