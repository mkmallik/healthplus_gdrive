import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useDrive } from "../context/DriveContext";
import { COLORS } from "../utils/constants";
import { clearLocalCache } from "../services/fileService";

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const { userEmail, userName, getSheetUrl } = useDrive();

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect Google Drive",
      "Your data stays in Google Sheets. You will be signed out on this device.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive", onPress: logout },
      ]
    );
  };

  const handleOpenSheet = () => {
    const url = getSheetUrl();
    if (url) Linking.openURL(url);
    else Alert.alert("No spreadsheet found");
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Media Cache",
      "Removes locally cached copies of photos and audio. Files remain safely in Google Drive and will re-download when needed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Cache",
          onPress: async () => {
            await clearLocalCache();
            Alert.alert("Done", "Local media cache cleared.");
          },
        },
      ]
    );
  };

  const items = [
    {
      icon: "key-outline",
      label: "OpenAI API Key",
      description: "Required for AI food & exercise analysis",
      onPress: () => navigation.navigate("ApiKey"),
    },
    {
      icon: "table-outline",
      label: "View Google Sheet",
      description: "Open your HealthPlus data spreadsheet",
      onPress: handleOpenSheet,
    },
    {
      icon: "flag-outline",
      label: "Goals",
      description: "Set daily nutrition & fitness targets",
      onPress: () => navigation.navigate("Goal"),
    },
    {
      icon: "cloud-upload-outline",
      label: "Clear Local Media Cache",
      description: "Free device storage — files stay in Drive",
      onPress: handleClearCache,
    },
    {
      icon: "log-out-outline",
      label: "Disconnect Google Drive",
      description: "Sign out from this device",
      onPress: handleDisconnect,
      danger: true,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{userName || "User"}</Text>
          <Text style={styles.profileEmail}>{userEmail}</Text>
          <View style={styles.driveBadge}>
            <Ionicons name="logo-google" size={12} color={COLORS.success} />
            <Text style={styles.driveBadgeText}>Google Drive connected</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        {items.map((item, i) => (
          <TouchableOpacity key={i} style={styles.item} onPress={item.onPress} activeOpacity={0.7}>
            <View style={[styles.iconWrap, item.danger && styles.iconDanger]}>
              <Ionicons
                name={item.icon as any}
                size={20}
                color={item.danger ? COLORS.error : COLORS.primary}
              />
            </View>
            <View style={styles.itemText}>
              <Text style={[styles.itemLabel, item.danger && { color: COLORS.error }]}>{item.label}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.footer}>Data stored in your Google Drive · AI runs on OpenAI via your API key</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: COLORS.surface, margin: 16, borderRadius: 12, padding: 16,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.surfaceElevated, justifyContent: "center", alignItems: "center",
  },
  profileName: { fontSize: 17, fontWeight: "600", color: COLORS.text },
  profileEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  driveBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  driveBadgeText: { fontSize: 11, color: COLORS.success },
  section: { marginHorizontal: 16 },
  item: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 8,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated, justifyContent: "center", alignItems: "center",
  },
  iconDanger: { backgroundColor: "#2d1515" },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 15, color: COLORS.text, fontWeight: "500" },
  itemDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  footer: { fontSize: 11, color: COLORS.textMuted, textAlign: "center", margin: 24, lineHeight: 18 },
});
