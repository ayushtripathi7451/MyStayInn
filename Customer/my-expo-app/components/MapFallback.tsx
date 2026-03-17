import React, { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
  latitude?: number;
  longitude?: number;
  onOpenMaps?: (lat: number, lng: number) => void;
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Catches "view config not found for component 'AIRMAP'" when native map
 * isn't linked. Renders a fallback with "Open in Maps" so the app doesn't crash.
 */
export default class MapFallback extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      const { latitude, longitude, onOpenMaps, label = "Open in Maps" } = this.props;
      const canOpen = typeof latitude === "number" && typeof longitude === "number" && onOpenMaps;

      return (
        <View style={styles.fallback}>
          <Ionicons name="map-outline" size={32} color="#9CA3AF" />
          <Text style={styles.text}>Map unavailable in this build</Text>
          <Text style={styles.hint}>Rebuild the app after adding react-native-maps, or use Expo Go.</Text>
          {canOpen && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => onOpenMaps(latitude!, longitude!)}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.buttonText}>{label}</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    height: 220,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E33FF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
});
