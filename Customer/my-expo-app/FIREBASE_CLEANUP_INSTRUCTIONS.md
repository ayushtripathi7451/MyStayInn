# Firebase Web SDK Cleanup Instructions

## ⚠️ CRITICAL: Remove Firebase Web SDK

Your project currently has BOTH Firebase Web SDK and React Native Firebase installed, which causes:
- Warnings and errors
- Auth persistence issues  
- Production crashes
- Conflicts between two Firebase implementations

## Step 1: Uninstall Firebase Web SDK

Run this command in the Customer app directory:

```bash
cd Frontend/Customer/my-expo-app
npm uninstall firebase
```

## Step 2: Delete Web SDK Config File

Delete this file (it's no longer needed):
```
Frontend/Customer/my-expo-app/firebase.js
```

## Step 3: Files Already Updated ✅

These files have been updated to use React Native Firebase:
- ✅ `components/BasicInfoScreen.tsx` - Uses `@react-native-firebase/auth`
- ✅ `components/VerifyEmailScreen.tsx` - Uses `@react-native-firebase/auth`

## Step 4: Files That Still Need Updates ❌

These files still import from the Web SDK and need to be updated or removed:

### Option A: Update to React Native Firebase

**File: `components/OTPVerifyScreen.tsx`**
**File: `screens/VerifyOTPScreen.tsx`**

Replace:
```typescript
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../firebase";
```

With:
```typescript
import auth from "@react-native-firebase/auth";
```

Then update the verification logic to use the confirmation object pattern (like VerifyEmailScreen.tsx).

### Option B: Remove Redundant Files (Recommended)

Since you already have `components/VerifyEmailScreen.tsx` working with React Native Firebase, you can:

1. Delete `components/OTPVerifyScreen.tsx` (redundant)
2. Delete `screens/VerifyOTPScreen.tsx` (redundant)
3. Use only `components/VerifyEmailScreen.tsx` for OTP verification

## Step 5: Verify Package.json

Your `package.json` should ONLY have:

```json
{
  "dependencies": {
    "@react-native-firebase/app": "^23.8.6",
    "@react-native-firebase/auth": "^23.8.6",
    "@react-native-firebase/messaging": "^23.8.6"
  }
}
```

Should NOT have:
```json
{
  "dependencies": {
    "firebase": "..." // ❌ REMOVE THIS
  }
}
```

## Step 6: Rebuild the App

After removing the Web SDK:

```bash
# Clear cache
npm start -- --reset-cache

# For iOS
cd ios && pod install && cd ..
npx react-native run-ios

# For Android
npx react-native run-android
```

## ✅ Correct React Native Firebase Usage

### Send OTP:
```typescript
import auth from '@react-native-firebase/auth';

const sendOTP = async () => {
  const confirmation = await auth().signInWithPhoneNumber('+919876543210');
  // Pass confirmation to next screen
};
```

### Verify OTP:
```typescript
const verifyOTP = async () => {
  const userCredential = await confirmation.confirm(otp);
  const idToken = await userCredential.user.getIdToken();
  // Send idToken to backend
};
```

### Get Current User:
```typescript
const user = auth().currentUser;
```

### Listen to Auth State:
```typescript
useEffect(() => {
  const subscriber = auth().onAuthStateChanged(user => {
    console.log("User:", user);
  });
  return subscriber;
}, []);
```

## ❌ DO NOT USE (Web SDK - Wrong for React Native)

```typescript
import { getAuth } from 'firebase/auth'; // ❌
import { initializeAuth } from 'firebase/auth'; // ❌
import { PhoneAuthProvider } from 'firebase/auth'; // ❌
```

## Summary

1. ✅ Uninstall `firebase` package
2. ✅ Delete `firebase.js` config file
3. ✅ Remove or update files using Web SDK imports
4. ✅ Keep only React Native Firebase packages
5. ✅ Rebuild the app

This will eliminate all warnings and ensure proper Firebase functionality in production!
