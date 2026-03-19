import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ScrollableDatePickerProps {
  selectedDate?: Date | null;
  onDateChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: "date" | "time" | "datetime";
  placeholder?: string;
  disabled?: boolean;
  containerStyle?: string;
  textStyle?: string;
  error?: string;
  format?: string; // Custom format option
  minuteInterval?: 1 | 5 | 10 | 15 | 20 | 30; // Minute stepping
}

function toDate(value: Date | string | number | undefined): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value == null) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

const ITEM_HEIGHT = 44; // Slightly smaller for better touch targets
const VISIBLE_ITEMS = 5; // Number of items visible in the scroll view
const SCROLL_PADDING = ITEM_HEIGHT * 2; // Padding for scroll centering

export default function ScrollableDatePicker({
  selectedDate,
  onDateChange,
  minimumDate,
  maximumDate,
  mode = "date",
  placeholder = "Select date",
  disabled = false,
  containerStyle = "",
  textStyle = "",
  error,
  minuteInterval = 1,
}: ScrollableDatePickerProps) {
  const safeDate = toDate(selectedDate);
  const [isVisible, setIsVisible] = useState(false);
  const [tempDate, setTempDate] = useState(safeDate);

  // Generate years dynamically
  const currentYear = new Date().getFullYear();
  const startYear = 1900; // Extended range for birth dates
  const endYear = Math.max(currentYear + 20, 2030);
  const years = useMemo(() => 
    Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
    [startYear, endYear]
  );

  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

  const getDaysInMonth = useCallback((year: number, month: number) => 
    new Date(year, month + 1, 0).getDate(), []);

  // Generate minutes with interval
  const minutes = useMemo(() => {
    const mins = [];
    for (let i = 0; i < 60; i += minuteInterval) {
      mins.push(i.toString().padStart(2, "0"));
    }
    return mins;
  }, [minuteInterval]);

  const hours = useMemo(() => 
    Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
    []
  );

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(tempDate.getFullYear(), tempDate.getMonth());
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [tempDate.getFullYear(), tempDate.getMonth(), getDaysInMonth]);

  // Refs for scroll views
  const yearScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // Update temp date when selected date changes
  useEffect(() => {
    setTempDate(toDate(selectedDate));
  }, [selectedDate]);

  // Ensure day is valid when month/year changes
  useEffect(() => {
    const maxDay = getDaysInMonth(tempDate.getFullYear(), tempDate.getMonth());
    if (tempDate.getDate() > maxDay) {
      setTempDate(new Date(tempDate.getFullYear(), tempDate.getMonth(), maxDay));
    }
  }, [tempDate.getFullYear(), tempDate.getMonth(), getDaysInMonth]);

  const hasSelectedDate = !!selectedDate;

  const formatDisplayDate = useCallback(() => {
    if (!hasSelectedDate) return placeholder;
    const d = toDate(selectedDate);
    
    if (mode === "time") {
      return d.toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true 
      });
    }
    if (mode === "datetime") {
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true 
      })}`;
    }
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [selectedDate, mode, placeholder, hasSelectedDate]);

  const scrollToIndex = useCallback((
    scrollRef: React.RefObject<ScrollView>, 
    index: number, 
    animated = true
  ) => {
    if (scrollRef.current && index >= 0) {
      const yOffset = (index * ITEM_HEIGHT) - (ITEM_HEIGHT * 2); // Center the item
      scrollRef.current.scrollTo({ y: Math.max(0, yOffset), animated });
    }
  }, []);

  const openPicker = useCallback(() => {
    if (disabled) return;
    setIsVisible(true);
    
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (mode !== "time") {
          const yearIndex = years.indexOf(tempDate.getFullYear());
          const monthIndex = tempDate.getMonth();
          const dayIndex = tempDate.getDate() - 1;
          
          scrollToIndex(yearScrollRef, yearIndex, false);
          scrollToIndex(monthScrollRef, monthIndex, false);
          scrollToIndex(dayScrollRef, dayIndex, false);
        }
        if (mode !== "date") {
          const hourIndex = tempDate.getHours();
          const minuteIndex = Math.floor(tempDate.getMinutes() / minuteInterval);
          
          scrollToIndex(hourScrollRef, hourIndex, false);
          scrollToIndex(minuteScrollRef, minuteIndex, false);
        }
      });
    });
  }, [disabled, mode, tempDate, years, minuteInterval, scrollToIndex]);

  const handleConfirm = useCallback(() => {
    let newDate = new Date(tempDate);
    
    // Apply min/max constraints
    if (minimumDate && newDate < minimumDate) {
      newDate = new Date(minimumDate);
    }
    if (maximumDate && newDate > maximumDate) {
      newDate = new Date(maximumDate);
    }
    
    onDateChange(newDate);
    setIsVisible(false);
  }, [tempDate, minimumDate, maximumDate, onDateChange]);

  const handleCancel = useCallback(() => {
    setTempDate(toDate(selectedDate));
    setIsVisible(false);
  }, [selectedDate]);

  const handleDateChange = useCallback((
    type: 'year' | 'month' | 'day' | 'hour' | 'minute',
    value: number
  ) => {
    setTempDate(prev => {
      const newDate = new Date(prev);
      
      switch (type) {
        case 'year':
          newDate.setFullYear(value);
          break;
        case 'month':
          newDate.setMonth(value);
          break;
        case 'day':
          newDate.setDate(value);
          break;
        case 'hour':
          newDate.setHours(value);
          break;
        case 'minute':
          newDate.setMinutes(value * minuteInterval);
          break;
      }
      
      return newDate;
    });
  }, [minuteInterval]);

  const renderScrollableColumn = useCallback((
    data: (string | number)[],
    selectedValue: string | number,
    onSelect: (value: any) => void,
    scrollRef: React.RefObject<ScrollView>,
    label: string,
    valueType?: 'year' | 'month' | 'day' | 'hour' | 'minute'
  ) => {
    const getItemValue = (item: string | number, index: number) => {
      if (typeof item === "string") {
        if (label === "Month") return index;
        return parseInt(item, 10);
      }
      return item;
    };

    const isSelected = (item: string | number, index: number) => {
      const itemValue = getItemValue(item, index);
      if (label === "Month") {
        return itemValue === selectedValue;
      }
      return itemValue === selectedValue;
    };

    return (
      <View className="flex-1 mx-1">
        <Text className="text-center text-gray-600 font-medium mb-1 text-sm">
          {label}
        </Text>
        <View className="h-48 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
          <View className="absolute top-1/2 left-0 right-0 h-[44px] -mt-[22px] border-t border-b border-blue-200 bg-blue-50/30 z-10 pointer-events-none" />
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            contentContainerStyle={{ 
              paddingVertical: (VISIBLE_ITEMS * ITEM_HEIGHT) / 2 
            }}
            onMomentumScrollEnd={(event) => {
              const yOffset = event.nativeEvent.contentOffset.y;
              const index = Math.round(yOffset / ITEM_HEIGHT);
              if (index >= 0 && index < data.length) {
                const itemValue = getItemValue(data[index], index);
                onSelect(itemValue);
              }
            }}
          >
            {data.map((item, index) => {
              const selected = isSelected(item, index);
              const displayValue = typeof item === "string" ? item : item.toString();
              
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    const itemValue = getItemValue(item, index);
                    onSelect(itemValue);
                    scrollToIndex(scrollRef, index);
                  }}
                  className={`h-[44px] justify-center items-center ${
                    selected ? "bg-blue-100 mx-2 rounded-lg" : ""
                  }`}
                  activeOpacity={0.6}
                >
                  <Text 
                    className={`text-base ${
                      selected 
                        ? "text-blue-600 font-bold" 
                        : "text-gray-700"
                    }`}
                  >
                    {displayValue}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  }, [scrollToIndex]);

  // Check if date is within min/max range
  const isDateValid = useMemo(() => {
    if (minimumDate && tempDate < minimumDate) return false;
    if (maximumDate && tempDate > maximumDate) return false;
    return true;
  }, [tempDate, minimumDate, maximumDate]);

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        disabled={disabled}
        className={`flex-row items-center justify-between px-4 py-3 rounded-xl border ${
          disabled 
            ? "bg-gray-100 border-gray-200 opacity-60" 
            : error
              ? "bg-white border-red-300"
              : "bg-white border-gray-300"
        } ${containerStyle}`}
        activeOpacity={0.7}
      >
        <View className="flex-1 mr-2">
          <Text 
            className={`${
              disabled 
                ? "text-gray-400" 
                : hasSelectedDate 
                  ? "text-gray-900" 
                  : "text-gray-400"
            } font-medium ${textStyle}`}
            numberOfLines={1}
          >
            {formatDisplayDate()}
          </Text>
          {error && !disabled && (
            <Text className="text-xs text-red-500 mt-1">{error}</Text>
          )}
        </View>
        <Ionicons 
          name={mode === "time" ? "time-outline" : "calendar-outline"} 
          size={22} 
          color={disabled ? "#9CA3AF" : error ? "#EF4444" : "#6B7280"} 
        />
      </TouchableOpacity>

      <Modal 
        visible={isVisible} 
        transparent 
        animationType="slide" 
        onRequestClose={handleCancel}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/50">
          <View 
            className="bg-white rounded-t-3xl p-5"
            style={{ maxHeight: Platform.OS === 'ios' ? '80%' : '70%' }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity 
                onPress={handleCancel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-blue-600 font-semibold text-base">Cancel</Text>
              </TouchableOpacity>
              
              <Text className="text-lg font-bold text-gray-900">
                {mode === "time" 
                  ? "Select Time" 
                  : mode === "datetime" 
                    ? "Select Date & Time" 
                    : "Select Date"
                }
              </Text>
              
              <TouchableOpacity 
                onPress={handleConfirm}
                disabled={!isDateValid}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text 
                  className={`font-semibold text-base ${
                    isDateValid ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              <View className="flex-row pb-2">
                {mode !== "time" && (
                  <>
                    {renderScrollableColumn(
                      years, 
                      tempDate.getFullYear(), 
                      (value) => handleDateChange('year', value), 
                      yearScrollRef, 
                      "Year"
                    )}
                    {renderScrollableColumn(
                      months, 
                      tempDate.getMonth(), 
                      (value) => handleDateChange('month', value), 
                      monthScrollRef, 
                      "Month"
                    )}
                    {renderScrollableColumn(
                      days, 
                      tempDate.getDate(), 
                      (value) => handleDateChange('day', value), 
                      dayScrollRef, 
                      "Day"
                    )}
                  </>
                )}
                {mode !== "date" && (
                  <>
                    {renderScrollableColumn(
                      hours, 
                      tempDate.getHours(), 
                      (value) => handleDateChange('hour', value), 
                      hourScrollRef, 
                      "Hour"
                    )}
                    {renderScrollableColumn(
                      minutes, 
                      Math.floor(tempDate.getMinutes() / minuteInterval), 
                      (value) => handleDateChange('minute', value), 
                      minuteScrollRef, 
                      "Min"
                    )}
                  </>
                )}
              </View>
            </ScrollView>

            {!isDateValid && (
              <Text className="text-center text-red-500 mt-4 text-sm">
                Selected date is outside the allowed range
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}