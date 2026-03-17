import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useProperty } from '../contexts/PropertyContext';
import { useProperties } from '../src/hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface PropertyDropdownProps {
  navigation: any;
}

export default function PropertyDropdown({ navigation }: PropertyDropdownProps) {
  const { properties, currentProperty, setCurrentProperty } = useProperty();
  const { list: apiList, loading, refresh } = useProperties();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  // When dropdown opens, revalidate in background (SWR)
  const onDropdownOpen = useCallback(() => {
    setIsDropdownVisible(true);
    refresh();
  }, [refresh]);

  // Transform Redux list to context format for display/selection
  const transformedFromRedux = apiList?.length
    ? apiList.map((prop: any) => ({
        id: prop.uniqueId || String(prop.id),
        name: prop.name,
        address: `${prop.city || ''}, ${prop.state || ''}`,
        totalRooms: prop.totalRooms ?? 0,
        occupiedRooms: currentProperty.occupiedRooms,
        monthlyRevenue: currentProperty.monthlyRevenue,
        monthlyExpenses: currentProperty.monthlyExpenses,
        pendingDues: currentProperty.pendingDues,
        bookingRequests: currentProperty.bookingRequests,
        moveOutRequests: currentProperty.moveOutRequests,
        openTickets: currentProperty.openTickets,
      }))
    : [];
  const displayProperties = transformedFromRedux.length > 0 ? transformedFromRedux : properties;

  const handlePropertySelect = async (property: any) => {
    setCurrentProperty(property);
    await AsyncStorage.setItem('currentProperty', JSON.stringify(property));
    setIsDropdownVisible(false);
  };

  const handleAddNewProperty = () => {
    setIsDropdownVisible(false);
    navigation.navigate('ProfileSetup');
  };

  return (
    <>
      {/* Property Selector */}
      <TouchableOpacity
        onPress={onDropdownOpen}
        className="flex-row items-center"
        activeOpacity={0.7}
      >
        <View className="flex-col">
          <Text className="text-[18px] font-semibold text-black">
            {currentProperty.name}
          </Text>
          <Text className="text-[14px] font-medium text-gray-400">
            ID: {currentProperty.id}
          </Text>
        </View>
        <Ionicons
          name="chevron-down"
          size={18}
          color="#000"
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDropdownVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View
            className="bg-white rounded-2xl max-h-96 w-full"
            style={{ maxWidth: width - 32 }}
          >
              {/* Header */}
              <View className="p-4 border-b border-gray-100">
                <Text className="text-lg font-bold text-center text-gray-800">
                  Select Property
                </Text>
              </View>

              {/* Properties List */}
              <ScrollView className="max-h-64">
                {loading ? (
                  <View className="p-8 items-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text className="text-gray-500 mt-2">Loading properties...</Text>
                  </View>
                ) : displayProperties.length > 0 ? (
                  displayProperties.map((property) => (
                    <TouchableOpacity
                      key={property.id}
                      onPress={() => handlePropertySelect(property)}
                      className={`p-4 border-b border-gray-50 ${
                        currentProperty.id === property.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-gray-800">
                            {property.name}
                          </Text>
                          <Text className="text-sm text-gray-500 mt-1">
                            {property.address}
                          </Text>
                          <Text className="text-xs text-gray-400 mt-1">
                            {property.totalRooms} rooms
                          </Text>
                        </View>
                        {currentProperty.id === property.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="p-8 items-center">
                    <Text className="text-gray-500">No properties found</Text>
                    <Text className="text-gray-400 text-sm mt-1">Add your first property</Text>
                  </View>
                )}
              </ScrollView>

              {/* Add New Property Button */}
              <TouchableOpacity
                onPress={handleAddNewProperty}
                className="p-4 border-t border-gray-100"
              >
                <View className="flex-row items-center justify-center">
                  <MaterialCommunityIcons
                    name="plus-circle-outline"
                    size={20}
                    color="#2563EB"
                  />
                  <Text className="text-base font-semibold text-blue-600 ml-2">
                    Add New Property
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => setIsDropdownVisible(false)}
                className="p-4 border-t border-gray-100"
              >
                <Text className="text-center text-gray-500 font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
      </Modal>
    </>
  );
}