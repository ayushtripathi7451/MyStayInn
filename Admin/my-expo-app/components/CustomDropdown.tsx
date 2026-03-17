import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface DropdownProps {
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  containerStyle?: string;
  dropdownStyle?: string;
  minWidth?: number; // Allow manual width override
}

const { height: screenHeight } = Dimensions.get("window");

export default function CustomDropdown({
  options,
  selectedValue,
  onSelect,
  placeholder = "Select option",
  disabled = false,
  containerStyle = "",
  dropdownStyle = "",
  minWidth = 140
}: DropdownProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0, width: 0 });
  const buttonRef = useRef<TouchableOpacity>(null);

  const openDropdown = () => {
  if (disabled) return;

  buttonRef.current?.measure((fx, fy, width, height, px, py) => {
    const finalY = py + height; // below button

    setDropdownPosition({
      x: px,
      y: finalY,
      width: width,
    });

    setIsVisible(true);
  });
};


  const selectOption = (option: string) => {
    onSelect(option);
    setIsVisible(false);
  };

  const renderItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      onPress={() => selectOption(item)}
      className={`px-4 py-4 ${
        item === selectedValue ? 'bg-blue-50' : 'bg-white'
      }`}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <Text className={`text-sm font-medium flex-1 ${
          item === selectedValue ? 'text-blue-600' : 'text-gray-700'
        }`} numberOfLines={1}>
          {item}
        </Text>
        {item === selectedValue && (
          <Ionicons name="checkmark" size={16} color="#2563eb" style={{ marginLeft: 8 }} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        onPress={openDropdown}
        disabled={disabled}
        className={`flex-row items-center justify-between px-4 py-3 rounded-xl border min-w-[120px] ${
          disabled 
            ? 'bg-gray-200 border-gray-200 opacity-50' 
            : 'bg-slate-50 border-slate-200'
        } ${containerStyle}`}
        activeOpacity={0.7}
      >
        <Text className={`font-bold text-xs flex-1 ${
          disabled ? 'text-gray-400' : 'text-blue-600'
        }`} numberOfLines={1}>
          {selectedValue || placeholder}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={14} 
          color={disabled ? "#9CA3AF" : "#2563eb"}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View
            style={{
              position: 'absolute',
              left: dropdownPosition.x,
              top: dropdownPosition.y,
              width: dropdownPosition.width,
              maxHeight: 250,
              backgroundColor: 'white',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 1000,
            }}
            className={dropdownStyle}
          >
            <FlatList
              data={options}
              renderItem={renderItem}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={{ borderRadius: 12 }}
              ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}