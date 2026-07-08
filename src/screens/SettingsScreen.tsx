import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  TextInput,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useDrive } from "../context/DriveContext";
import { resetDB } from "../services/sheetsDB";
import { COLORS, SPREADSHEET_ID_KEY } from "../utils/constants";
import { clearLocalCache } from "../services/fileService";
import { useToast } from "../components/Toast";
import * as SecureStore from "../utils/secureStorage";

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const { userEmail, userName, getSheetUrl, reloadData } = useDrive();
  const { showToast } = useToast();
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [linking, setLinking] = useState(false);

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

  const handleLinkSpreadsheet = async () => {
    const input = spreadsheetInput.trim();
    if (!input) { showToast("Paste the spreadsheet ID or URL.", "error"); return; }

    // Extract ID from URL if full URL pasted
    // e.g. https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    let id = input;
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match) id = match[1];

    if (!id || id.length < 10) {
      showToast("That doesn't look like a valid spreadsheet ID.", "error");
      return;
    }

    setLinking(true);
    try {
      await SecureStore.setItemAsync(SPREADSHEET_ID_KEY, id);
      resetDB();
      await reloadData();
      setLinkModalVisible(false);
      setSpreadsheetInput("");
      showToast("Spreadsheet linked! Your data is now synced.", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to link spreadsheet.", "error");
    } finally {
      setLinking(false);
    }
  };

  const handleClearCache = async () => {
    await clearLocalCache();
    showToast("Local media cache cleared.", "success");
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
      icon: "sync-outline",
      label: "Link Spreadsheet from Another Device",
      description: "Paste the spreadsheet ID to sync your data",
      onPress: () => setLinkModalVisible(true),
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

      {/* Link spreadsheet modal */}
      <Modal visible={linkModalVisible} transparent animationType="slide" onRequestClose={() => setLinkModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Link Spreadsheet</Text>
            <Text style={styles.modalDesc}>
              On your other device, go to{"\n"}
              <Text style={styles.modalBold}>Settings → View Google Sheet</Text>
              {"\n"}Copy the URL from the browser and paste it below.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Paste spreadsheet URL or ID"
              placeholderTextColor={COLORS.textMuted}
              value={spreadsheetInput}
              onChangeText={setSpreadsheetInput}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setLinkModalVisible(false); setSpreadsheetInput(""); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, linking && { opacity: 0.6 }]} onPress={handleLinkSpreadsheet} disabled={linking}>
                <Text style={styles.modalConfirmText}>{linking ? "Linking..." : "Link"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  modalDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  modalBold: { color: COLORS.text, fontWeight: "600" },
  modalInput: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 10, padding: 12,
    color: COLORS.text, fontSize: 13, minHeight: 60, marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.surfaceElevated, alignItems: "center" },
  modalCancelText: { color: COLORS.textSecondary, fontWeight: "600" },
  modalConfirm: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: "center" },
  modalConfirmText: { color: "#000", fontWeight: "700" },
});
