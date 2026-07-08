import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../utils/constants";
import * as userGoalService from "../services/userGoalService";
import type { UserGoal } from "../services/userGoalService";

function GoalCard({
  goal,
  onMarkComplete,
  onArchive,
}: {
  goal: UserGoal;
  onMarkComplete: (id: number) => void;
  onArchive: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.goalCard}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
        style={styles.goalCardHeader}
      >
        <View style={[styles.goalTypeDot, { backgroundColor: goal.goal_type === "long_term" ? COLORS.accent : COLORS.info }]} />
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: goal.status === "completed" ? COLORS.success + "25" : COLORS.primary + "20" }]}>
          <Text style={[styles.statusText, { color: goal.status === "completed" ? COLORS.success : COLORS.primary }]}>
            {goal.status === "completed" ? "Done" : "Active"}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={COLORS.textSecondary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {/* Linked habit chips */}
      {goal.linkedHabits && goal.linkedHabits.length > 0 && (
        <View style={styles.chipsRow}>
          {goal.linkedHabits.map((h: any) => (
            <View key={h.id} style={[styles.habitChip, { borderColor: h.color + "80" }]}>
              <Ionicons name={h.icon as any} size={11} color={h.color} />
              <Text style={[styles.habitChipText, { color: h.color }]}>{h.name}</Text>
            </View>
          ))}
        </View>
      )}

      {goal.target_date && (
        <Text style={styles.targetDate}>
          Target: {goal.target_date}
        </Text>
      )}

      {expanded && (
        <View style={styles.expandedArea}>
          {goal.description ? (
            <Text style={styles.descText}>{goal.description}</Text>
          ) : null}
          <View style={styles.actionRow}>
            {goal.status !== "completed" && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onMarkComplete(goal.id)}
                activeOpacity={0.75}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
                <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Mark Complete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onArchive(goal.id)}
              activeOpacity={0.75}
            >
              <Ionicons name="archive-outline" size={16} color={COLORS.textSecondary} />
              <Text style={[styles.actionBtnText, { color: COLORS.textSecondary }]}>Archive</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function AddGoalModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; goal_type: "short_term" | "long_term"; target_date: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState<"short_term" | "long_term">("short_term");
  const [targetDate, setTargetDate] = useState("");

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), goal_type: goalType, target_date: targetDate.trim() });
    setTitle(""); setDescription(""); setGoalType("short_term"); setTargetDate("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Run a 5K"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional details..."
            placeholderTextColor={COLORS.textMuted}
            multiline
          />

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeToggle}>
            {(["short_term", "long_term"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, goalType === t && styles.typeBtnActive]}
                onPress={() => setGoalType(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeBtnText, goalType === t && styles.typeBtnTextActive]}>
                  {t === "short_term" ? "Short Term" : "Long Term"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Target Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="2026-12-31"
            placeholderTextColor={COLORS.textMuted}
          />

          <TouchableOpacity
            style={[styles.saveBtn, !title.trim() && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!title.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>Add Goal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  const loadGoals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await userGoalService.getGoals();
      setGoals(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadGoals(); }, [loadGoals]));

  const handleAutoGenerate = async () => {
    setAutoGenerating(true);
    try {
      await userGoalService.autoGenerateGoalsFromHabits();
      await loadGoals(true);
    } catch {
      // silent
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleSaveGoal = async (data: { title: string; description: string; goal_type: "short_term" | "long_term"; target_date: string }) => {
    setShowModal(false);
    try {
      await userGoalService.createGoal({
        title: data.title,
        description: data.description,
        goal_type: data.goal_type,
        target_date: data.target_date || null,
      });
      await loadGoals(true);
    } catch {
      // silent
    }
  };

  const handleMarkComplete = async (id: number) => {
    await userGoalService.updateGoal(id, { status: "completed" });
    await loadGoals(true);
  };

  const handleArchive = async (id: number) => {
    await userGoalService.deleteGoal(id);
    await loadGoals(true);
  };

  const shortTermGoals = goals.filter((g) => g.goal_type === "short_term");
  const longTermGoals = goals.filter((g) => g.goal_type === "long_term");

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGoals(); }} tintColor={COLORS.primary} />
        }
      >
        {/* Auto-generate banner */}
        {goals.length === 0 && (
          <View style={styles.autoBanner}>
            <Ionicons name="sparkles-outline" size={20} color={COLORS.primary} />
            <Text style={styles.autoBannerText}>No goals yet. Auto-generate from your habits?</Text>
            <TouchableOpacity
              style={styles.autoBtn}
              onPress={handleAutoGenerate}
              disabled={autoGenerating}
              activeOpacity={0.8}
            >
              {autoGenerating ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Text style={styles.autoBtnText}>Generate</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Short Term */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: COLORS.info }]} />
          <Text style={styles.sectionTitle}>Short Term</Text>
          <Text style={styles.sectionCount}>{shortTermGoals.length}</Text>
        </View>
        {shortTermGoals.length === 0 ? (
          <Text style={styles.emptyText}>No short-term goals. Tap + to add one.</Text>
        ) : (
          shortTermGoals.map((g) => (
            <GoalCard key={g.id} goal={g} onMarkComplete={handleMarkComplete} onArchive={handleArchive} />
          ))
        )}

        {/* Long Term */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={[styles.sectionDot, { backgroundColor: COLORS.accent }]} />
          <Text style={styles.sectionTitle}>Long Term</Text>
          <Text style={styles.sectionCount}>{longTermGoals.length}</Text>
        </View>
        {longTermGoals.length === 0 ? (
          <Text style={styles.emptyText}>No long-term goals. Tap + to add one.</Text>
        ) : (
          longTermGoals.map((g) => (
            <GoalCard key={g.id} goal={g} onMarkComplete={handleMarkComplete} onArchive={handleArchive} />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color={COLORS.background} />
      </TouchableOpacity>

      <AddGoalModal visible={showModal} onClose={() => setShowModal(false)} onSave={handleSaveGoal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
  scroll: { padding: 16 },

  autoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  autoBannerText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  autoBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 72,
    alignItems: "center",
  },
  autoBtnText: { color: COLORS.background, fontSize: 13, fontWeight: "700" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, flex: 1 },
  sectionCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emptyText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16, paddingLeft: 4 },

  goalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  goalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalTypeDot: { width: 6, height: 6, borderRadius: 3 },
  goalTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: COLORS.text },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  habitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  habitChipText: { fontSize: 11, fontWeight: "600" },
  targetDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  expandedArea: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  descText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, padding: 6 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  typeToggle: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: COLORS.primary + "20", borderColor: COLORS.primary },
  typeBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary },
  typeBtnTextActive: { color: COLORS.primary },
  saveBtn: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: COLORS.background, fontSize: 16, fontWeight: "700" },
});
