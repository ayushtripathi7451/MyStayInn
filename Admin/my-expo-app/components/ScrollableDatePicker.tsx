import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ScrollableDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
  placeholder?: string;
  disabled?: boolean;
  containerStyle?: string;
}

const { height: screenHeight } = Dimensions.get("window");

function toDate(value: Date | string | number | undefined): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value == null) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function ScrollableDatePicker({
  selectedDate,
  onDateChange,
  minimumDate,
  maximumDate,
  mode = 'date',
  placeholder = "Select date",
  disabled = false,
  containerStyle = ""
}: ScrollableDatePickerProps) {
  const safeDate = toDate(selectedDate);
  const [isVisible, setIsVisible] = useState(false);
  const [tempDate, setTempDate] = useState(safeDate);

  // Generate arrays for scrollable pickers
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const [selectedYear, setSelectedYear] = useState(safeDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(safeDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(safeDate.getDate());
  const [selectedHour, setSelectedHour] = useState(safeDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(safeDate.getMinutes());

  const yearScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const d = toDate(selectedDate);
    setTempDate(d);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setSelectedDay(d.getDate());
    setSelectedHour(d.getHours());
    setSelectedMinute(d.getMinutes());
  }, [selectedDate]);

  const formatDisplayDate = () => {
    const d = toDate(selectedDate);
    if (mode === 'time') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (mode === 'datetime') {
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return d.toLocaleDateString();
    }
  };

  const scrollToIndex = (scrollRef: React.RefObject<ScrollView>, index: number, itemHeight: number = 50) => {
    scrollRef.current?.scrollTo({
      y: index * itemHeight,
      animated: true
    });
  };

  const openPicker = () => {
    if (disabled) return;
    setIsVisible(true);
    
    // Scroll to current values when opening
    setTimeout(() => {
      if (mode !== 'time') {
        scrollToIndex(yearScrollRef, years.indexOf(selectedYear));
        scrollToIndex(monthScrollRef, selectedMonth);
        scrollToIndex(dayScrollRef, selectedDay - 1);
      }
      if (mode !== 'date') {
        scrollToIndex(hourScrollRef, selectedHour);
        scrollToIndex(minuteScrollRef, selectedMinute);
      }
    }, 100);
  };

  const handleConfirm = () => {
    let newDate: Date;
    const base = toDate(selectedDate);
    if (mode === 'time') {
      newDate = new Date(base);
      newDate.setHours(selectedHour, selectedMinute);
    } else {
      newDate = new Date(selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute);
    }
    onDateChange(newDate);
    setIsVisible(false);
  };

  const handleCancel = () => {
    const d = toDate(selectedDate);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setSelectedDay(d.getDate());
    setSelectedHour(d.getHours());
    setSelectedMinute(d.getMinutes());
    setIsVisible(false);
  };

  const renderScrollableColumn = (
    data: (string | number)[],
    selectedValue: string | number,
    onSelect: (value: any) => void,
    scrollRef: React.RefObject<ScrollView>,
    label: string
  ) => (
    <View className="flex-1 mx-2">
      <Text className="text-center text-gray-600 font-medium mb-2">{label}</Text>
      <View className="h-40 border border-gray-200 rounded-xl bg-gray-50">
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={50}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: 95 }}
        >
          {data.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                onSelect(typeof item === 'string' ? (label === 'Month' ? index : parseInt(item)) : item);
                scrollToIndex(scrollRef, index);
              }}
              className={`h-12 justify-center items-center ${
                selectedValue === (typeof item === 'string' && label === 'Month' ? index : item)
                  ? 'bg-blue-100 border border-blue-300 rounded-lg mx-2'
                  : ''
              }`}
            >
              <Text className={`text-base ${
                selectedValue === (typeof item === 'string' && label === 'Month' ? index : item)
                  ? 'text-blue-600 font-bold'
                  : 'text-gray-700'
              }`}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const daysInSelectedMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

  // Adjust selected day if it's invalid for the new month
  useEffect(() => {
    if (selectedDay > daysInSelectedMonth) {
      setSelectedDay(daysInSelectedMonth);
    }
  }, [selectedYear, selectedMonth, daysInSelectedMonth]);

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        disabled={disabled}
        className={`flex-row items-center justify-between px-4 py-3 rounded-xl border ${
          disabled 
            ? 'bg-gray-200 border-gray-200 opacity-50' 
            : 'bg-white border-gray-300'
        } ${containerStyle}`}
        activeOpacity={0.7}
      >
        <Text className={`flex-1 ${
          disabled ? 'text-gray-400' : 'text-gray-900'
        } font-medium`}>
          {selectedDate ? formatDisplayDate() : placeholder}
        </Text>
        <Ionicons 
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'} 
          size={20} 
          color={disabled ? "#9CA3AF" : "#6B7280"} 
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[70%]">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity onPress={handleCancel}>
                <Text className="text-blue-600 font-semibold text-lg">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-900">
                {mode === 'time' ? 'Select Time' : mode === 'datetime' ? 'Select Date & Time' : 'Select Date'}
              </Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text className="text-blue-600 font-semibold text-lg">Done</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Columns */}
            <View className="flex-row">
              {mode !== 'time' && (
                <>
                  {renderScrollableColumn(years, selectedYear, setSelectedYear, yearScrollRef, 'Year')}
                  {renderScrollableColumn(months, selectedMonth, setSelectedMonth, monthScrollRef, 'Month')}
                  {renderScrollableColumn(days, selectedDay, setSelectedDay, dayScrollRef, 'Day')}
                </>
              )}
              {mode !== 'date' && (
                <>
                  {renderScrollableColumn(hours, selectedHour, setSelectedHour, hourScrollRef, 'Hour')}
                  {renderScrollableColumn(minutes, selectedMinute, setSelectedMinute, minuteScrollRef, 'Min')}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}