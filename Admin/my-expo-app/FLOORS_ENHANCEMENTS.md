# Floors Section Enhancements

## Overview
Enhanced the FloorsScreen with additional property terms and dynamic pricing mode functionality that affects all pricing throughout the property setup flow.

## New Features Added

### **1. Property Terms Section**

#### **Notice Period Field**
- **Input**: Number of days for tenant notice period
- **Default**: 30 days
- **Validation**: Numeric input only
- **Usage**: Standard notice period for tenant move-out

#### **Security Deposit Field**
- **Input**: Security deposit amount in rupees
- **Default**: ₹10,000
- **Validation**: Numeric input only
- **Usage**: Standard security deposit for all rooms

### **2. Pricing Mode Toggle**

#### **Dynamic Pricing Switch**
- **Options**: Per Month / Per Day
- **Default**: Per Month
- **Functionality**: Converts all existing prices when toggled
- **Visual Feedback**: Different colors and icons for each mode

#### **Price Conversion Logic**
```typescript
// Monthly to Daily: Divide by 30
newPrice = Math.round(currentPrice / 30);

// Daily to Monthly: Multiply by 30
newPrice = currentPrice * 30;
```

#### **Real-time Updates**
- All sharing option prices update instantly
- Price labels change to show current mode
- Conversion affects all room types simultaneously

## UI/UX Improvements

### **Property Terms Card**
```typescript
<View className="bg-blue-50 p-5 rounded-3xl border border-blue-100 mb-6">
  <Text className="text-lg font-bold text-blue-900 mb-4">Property Terms</Text>
  
  {/* Notice Period and Security Deposit Fields */}
  <View className="flex-row justify-between mb-4">
    <View className="w-[48%]">
      <Text className="text-blue-700 text-xs font-bold uppercase mb-2">Notice Period (Days)</Text>
      <TextInput
        value={noticePeriod}
        onChangeText={setNoticePeriod}
        keyboardType="numeric"
        className="bg-white rounded-xl px-4 py-3 border border-blue-200"
      />
    </View>
    
    <View className="w-[48%]">
      <Text className="text-blue-700 text-xs font-bold uppercase mb-2">Security Deposit (₹)</Text>
      <TextInput
        value={securityDeposit}
        onChangeText={setSecurityDeposit}
        keyboardType="numeric"
        className="bg-white rounded-xl px-4 py-3 border border-blue-200"
      />
    </View>
  </View>
  
  {/* Pricing Mode Toggle */}
  <View className="bg-white rounded-2xl p-4 border border-blue-200">
    <Text className="text-blue-700 text-xs font-bold uppercase mb-3">Pricing Mode</Text>
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Ionicons name={pricingMode === "month" ? "calendar" : "time"} size={20} color="#1E40AF" />
        <Text className="text-blue-900 font-bold ml-2">Per {pricingMode === "month" ? "Month" : "Day"}</Text>
      </View>
      <TouchableOpacity
        onPress={togglePricingMode}
        className={`px-4 py-2 rounded-xl ${pricingMode === "month" ? "bg-blue-600" : "bg-green-600"}`}
      >
        <Text className="text-white font-bold text-sm">
          Switch to {pricingMode === "month" ? "Daily" : "Monthly"}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</View>
```

### **Dynamic Price Labels**
- **Monthly Mode**: Shows "/ MONTH" 
- **Daily Mode**: Shows "/ DAY"
- **Color Coding**: Blue for monthly, Green for daily
- **Icons**: Calendar for monthly, Clock for daily

## Data Flow Updates

### **FloorsScreen → RoomsScreen**
```typescript
navigation.navigate("Rooms", {
  propertyData,
  facilitiesData,
  floors,
  avgRooms: Number(roomsPerFloor),
  defaultPrices: activePrices,
  noticePeriod: Number(noticePeriod),      // New
  securityDeposit: Number(securityDeposit), // New
  pricingMode,                              // New
});
```

### **RoomsScreen Updates**
- **Room Generation**: Uses pricing mode for default billing period
- **Dropdown Options**: Billing dropdown shows only current pricing mode
- **Price Display**: All prices show with correct period suffix

### **PropertyPreviewScreen Display**
```typescript
{/* Property Terms Summary */}
<View className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100">
  <Text className="text-blue-900 font-bold text-sm mb-3">Property Terms</Text>
  <View className="flex-row justify-between">
    <View className="flex-1 mr-2">
      <Text className="text-blue-700 text-xs font-bold uppercase">Notice Period</Text>
      <Text className="text-blue-900 font-bold">{floorsData?.noticePeriod || 30} Days</Text>
    </View>
    <View className="flex-1 ml-2">
      <Text className="text-blue-700 text-xs font-bold uppercase">Security Deposit</Text>
      <Text className="text-blue-900 font-bold">₹{floorsData?.securityDeposit || 10000}</Text>
    </View>
  </View>
  <View className="mt-3 pt-3 border-t border-blue-200">
    <Text className="text-blue-700 text-xs font-bold uppercase">Pricing Mode</Text>
    <View className="flex-row items-center">
      <Ionicons name={floorsData?.pricingMode === "month" ? "calendar" : "time"} size={16} color="#1E40AF" />
      <Text className="text-blue-900 font-bold ml-2">
        Per {floorsData?.pricingMode === "month" ? "Month" : "Day"}
      </Text>
    </View>
  </View>
</View>
```

## Technical Implementation

### **State Management**
```typescript
// New state variables
const [noticePeriod, setNoticePeriod] = useState("30");
const [securityDeposit, setSecurityDeposit] = useState("10000");
const [pricingMode, setPricingMode] = useState<"month" | "day">("month");
```

### **Price Conversion Function**
```typescript
const togglePricingMode = () => {
  const newMode = pricingMode === "month" ? "day" : "month";
  setPricingMode(newMode);
  
  // Convert all existing prices
  setSharingConfigs((prev) => {
    const updated = { ...prev };
    Object.keys(updated).forEach((type) => {
      const currentPrice = parseInt(updated[type as keyof typeof updated].price) || 0;
      let newPrice: number;
      
      if (newMode === "day") {
        // Convert monthly to daily (divide by 30)
        newPrice = Math.round(currentPrice / 30);
      } else {
        // Convert daily to monthly (multiply by 30)
        newPrice = currentPrice * 30;
      }
      
      updated[type as keyof typeof updated].price = newPrice.toString();
    });
    return updated;
  });
};
```

### **Validation & Error Handling**
- **Numeric Input**: Only numbers allowed for notice period and security deposit
- **Price Conversion**: Rounds daily prices to nearest whole number
- **Default Values**: Fallback values provided for all new fields
- **Type Safety**: Proper TypeScript types for pricing mode

## Benefits

### **User Experience**
- **Comprehensive Setup**: All property terms in one place
- **Flexible Pricing**: Easy switching between daily/monthly rates
- **Visual Feedback**: Clear indication of current pricing mode
- **Instant Updates**: Real-time price conversion

### **Business Logic**
- **Standardized Terms**: Consistent notice period and security deposit
- **Pricing Flexibility**: Support for both daily and monthly billing
- **Data Consistency**: All prices maintain correct relationships
- **Future-Proof**: Easy to add more property terms

### **Technical Benefits**
- **Clean Data Flow**: All related data passed together
- **Maintainable Code**: Centralized pricing logic
- **Type Safety**: Full TypeScript support
- **Scalable Design**: Easy to extend with more features

## Usage Examples

### **Monthly Pricing (Default)**
- Single Sharing: ₹10,000/month
- Double Sharing: ₹12,000/month
- Notice Period: 30 days
- Security Deposit: ₹10,000

### **Daily Pricing (After Toggle)**
- Single Sharing: ₹333/day (10,000 ÷ 30)
- Double Sharing: ₹400/day (12,000 ÷ 30)
- Notice Period: 30 days
- Security Deposit: ₹10,000

The enhancements provide a much more comprehensive property setup experience with flexible pricing options and complete property terms management.