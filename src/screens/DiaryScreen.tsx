import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../utils/constants";
import * as db from "../services/sheetsDB";

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface DiaryEntry {
  id: string;
  type: "food" | "exercise" | "steps" | "habit" | "note" | "todo";
  date: string;
  summary: string;
  detail?: string;
  raw: any;
}

interface DiarySection {
  date: string;
  entries: DiaryEntry[];
}

const TYPE_CONFIG: Record<DiaryEntry["type"], { icon: string; color: string; emoji: string }> = {
  food: { icon: "restaurant-outline", color: COLORS.calories, emoji: "🍽" },
  exercise: { icon: "fitness-outline", color: COLORS.exercise, emoji: "💪" },
  steps: { icon: "footsteps-outline", color: COLORS.steps, emoji: "👣" },
  habit: { icon: "checkmark-circle-outline", color: COLORS.primary, emoji: "✅" },
  note: { icon: "document-text-outline", color: COLORS.info, emoji: "📝" },
  todo: { icon: "checkbox-outline", color: COLORS.success, emoji: "☑️" },
};

function buildEntriesForDate(dateStr: string): DiaryEntry[] {
  const entries: DiaryEntry[] = [];

  // Food (meal foods)
  const meals = db.findWhere("meals", (r: any) => r.user_id === 1 && r.date === dateStr);
  const allFoods = db.findWhere("foods", (f: any) => meals.some((m: any) => Number(m.id) === Number(f.meal_id)));
  if (allFoods.length > 0) {
    const totalCals = allFoods.reduce((s: number, f: any) => s + (Number(f.calories) || 0), 0);
    const totalProtein = allFoods.reduce((s: number, f: any) => s + (Number(f.protein) || 0), 0);
    entries.push({
      id: `food-${dateStr}`,
      type: "food",
      date: dateStr,
      summary: `${allFoods.length} food item${allFoods.length > 1 ? "s" : ""} · ${Math.round(totalCals)} kcal`,
      detail: `Protein ${Math.round(totalProtein)}g · ${allFoods.map((f: any) => f.description || "item").join(", ")}`,
      raw: { foods: allFoods, totalCals },
    });
  }

  // Exercise
  const exercises = db.findWhere("exercises", (r: any) => r.user_id === 1 && r.date === dateStr);
  for (const ex of exercises) {
    entries.push({
      id: `exercise-${(ex as any).id}`,
      type: "exercise",
      date: dateStr,
      summary: `${(ex as any).exercise_type || "Exercise"} · ${Math.round((ex as any).duration_minutes || 0)} min`,
      detail: (ex as any).description || (ex as any).analysis,
      raw: ex,
    });
  }

  // Steps
  const steps = db.findFirst("step_entries", (r: any) => r.user_id === 1 && r.date === dateStr);
  if (steps) {
    entries.push({
      id: `steps-${dateStr}`,
      type: "steps",
      date: dateStr,
      summary: `${Number((steps as any).step_count || 0).toLocaleString()} steps`,
      detail: `~${Math.round(Number((steps as any).step_count || 0) * 0.04)} kcal burned`,
      raw: steps,
    });
  }

  // Habits (logged descriptive)
  const habitLogs = db.findWhere("habit_logs", (r: any) => r.user_id === 1 && r.date === dateStr && r.content);
  const habits = db.findWhere("habits", (h: any) => Number(h.is_active) !== 0);
  for (const log of habitLogs) {
    const habit = habits.find((h: any) => Number(h.id) === Number((log as any).habit_id));
    if (!habit) continue;
    entries.push({
      id: `habit-${(log as any).id}`,
      type: "habit",
      date: dateStr,
      summary: `${(habit as any).name}: ${((log as any).content || "").slice(0, 60)}${((log as any).content || "").length > 60 ? "…" : ""}`,
      raw: { habit, log },
    });
  }

  // Notes
  const notes = db.findWhere("notes", (r: any) => r.user_id === 1 && r.date === dateStr);
  for (const note of notes) {
    entries.push({
      id: `note-${(note as any).id}`,
      type: "note",
      date: dateStr,
      summary: (note as any).title || "Untitled note",
      detail: ((note as any).content || "").slice(0, 100),
      raw: note,
    });
  }

  // Todos done on this date
  const todos = db.findWhere("todo_items", (r: any) => r.user_id === 1 && r.done_date === dateStr && Number(r.is_done) !== 0);
  for (const todo of todos) {
    entries.push({
      id: `todo-${(todo as any).id}`,
      type: "todo",
      date: dateStr,
      summary: (todo as any).text || "Todo item",
      raw: todo,
    });
  }

  return entries;
}

function buildSections(daysBack: number): DiarySection[] {
  const sections: DiarySection[] = [];
  const now = new Date();
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateISO(d);
    const entries = buildEntriesForDate(dateStr);
    if (entries.length > 0) {
      sections.push({ date: dateStr, entries });
    }
  }
  return sections;
}

export default function DiaryScreen() {
  const navigation = useNavigation<any>();
  const [sections, setSections] = useState<DiarySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [daysBack, setDaysBack] = useState(7);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const load = useCallback((days: number) => {
    setLoading(days === 7);
    const data = buildSections(days);
    setSections(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(daysBack); }, [load, daysBack]));

  const handleLoadMore = () => {
    const newDays = daysBack + 7;
    setDaysBack(newDays);
    load(newDays);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleEntryPress = (entry: DiaryEntry) => {
    switch (entry.type) {
      case "exercise":
        navigation.navigate("ExerciseLog");
        break;
      case "steps":
        navigation.navigate("StepLog");
        break;
      case "note":
        navigation.navigate("NoteEditor", { noteId: entry.raw?.id });
        break;
      case "food":
        navigation.navigate("Today");
        break;
      default:
        toggleExpand(entry.id);
    }
  };

  // Filter
  const q = search.trim().toLowerCase();
  const filtered = q
    ? sections.map((s) => ({
        ...s,
        entries: s.entries.filter(
          (e) =>
            e.summary.toLowerCase().includes(q) ||
            (e.detail || "").toLowerCase().includes(q)
        ),
      })).filter((s) => s.entries.length > 0)
    : sections;

  const flatItems: (DiarySection | DiaryEntry & { _isEntry: true })[] = [];
  for (const section of filtered) {
    flatItems.push(section);
    for (const entry of section.entries) {
      flatItems.push({ ...entry, _isEntry: true } as any);
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    if (!item._isEntry) {
      // Section header
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionDate}>{formatDisplayDate(item.date)}</Text>
        </View>
      );
    }

    const entry: DiaryEntry = item;
    const config = TYPE_CONFIG[entry.type];
    const isExpanded = expandedIds.has(entry.id);

    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() => handleEntryPress(entry)}
        activeOpacity={0.8}
      >
        <View style={[styles.entryIcon, { backgroundColor: config.color + "20" }]}>
          <Text style={styles.entryEmoji}>{config.emoji}</Text>
        </View>
        <View style={styles.entryBody}>
          <Text style={styles.entrySummary}>{entry.summary}</Text>
          {entry.detail && (isExpanded || !entry.detail) && (
            <Text style={styles.entryDetail}>{entry.detail}</Text>
          )}
        </View>
        {entry.detail && (
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={COLORS.textSecondary}
            onPress={() => toggleExpand(entry.id)}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search diary..."
          placeholderTextColor={COLORS.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={flatItems}
          keyExtractor={(item: any, idx) => item._isEntry ? item.id : `section-${item.date}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(daysBack); }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                {q ? "No matching entries." : "No activity in the last 7 days."}
              </Text>
            </View>
          }
          ListFooterComponent={
            !q ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                <Ionicons name="chevron-down-outline" size={16} color={COLORS.primary} />
                <Text style={styles.loadMoreText}>Load Earlier ({daysBack + 7} days)</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  list: { paddingBottom: 32 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionDate: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  entryIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  entryEmoji: { fontSize: 16 },
  entryBody: { flex: 1 },
  entrySummary: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  entryDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, lineHeight: 17 },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center" },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
  },
  loadMoreText: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
});
