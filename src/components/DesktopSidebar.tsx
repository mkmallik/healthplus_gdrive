import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../utils/constants";

const NAV_ITEMS = [
  { name: "Today", icon: "home", iconOutline: "home-outline" },
  { name: "Habits", icon: "checkmark-done-circle", iconOutline: "checkmark-done-circle-outline" },
  { name: "Logs", icon: "book", iconOutline: "book-outline" },
  { name: "Todo", icon: "checkbox", iconOutline: "checkbox-outline" },
  { name: "Notes", icon: "create", iconOutline: "create-outline" },
  { name: "Goals", icon: "flag", iconOutline: "flag-outline" },
];

const BOTTOM_ITEMS = [
  { name: "Dashboard", icon: "stats-chart", iconOutline: "stats-chart-outline", stackName: "Insights" },
  { name: "Settings", icon: "settings", iconOutline: "settings-outline", stackName: "Settings" },
];

interface DesktopSidebarProps {
  activeTab: string;
  onTabPress: (tabName: string) => void;
  onStackPress: (screenName: string) => void;
}

export default function DesktopSidebar({ activeTab, onTabPress, onStackPress }: DesktopSidebarProps) {
  return (
    <View style={styles.sidebar}>
      {/* App name */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Ionicons name="pulse" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>HealthPlus</Text>
      </View>

      {/* Main nav */}
      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onTabPress(item.name)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={(isActive ? item.icon : item.iconOutline) as any}
                size={20}
                color={isActive ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.name}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom items */}
      <View style={styles.bottomSection}>
        <View style={styles.divider} />
        {BOTTOM_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => onStackPress(item.stackName)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={item.iconOutline as any}
              size={20}
              color={COLORS.textSecondary}
            />
            <Text style={styles.navLabel}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    backgroundColor: "#1a1a2e",
    borderRightWidth: 1,
    borderRightColor: "#2a2a4a",
    paddingTop: 24,
    paddingBottom: 24,
    flexDirection: "column",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 10,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
    position: "relative",
  },
  navItemActive: {
    backgroundColor: COLORS.primary + "18",
  },
  navLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    flex: 1,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  bottomSection: {
    paddingHorizontal: 12,
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#2a2a4a",
    marginHorizontal: 12,
    marginBottom: 12,
  },
});
