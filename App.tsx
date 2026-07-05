import React, { useEffect } from "react";
import * as Font from 'expo-font';
import { ActivityIndicator, View, Text, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { DriveProvider, useDrive } from "./src/context/DriveContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ToastProvider } from "./src/components/Toast";
import { ReminderProvider } from "./src/context/ReminderContext";
import { ensureDefaultHabits } from "./src/services/habitService";

import GoogleSetupScreen from "./src/screens/GoogleSetupScreen";
import HomeScreen from "./src/screens/HomeScreen";
import CameraScreen from "./src/screens/CameraScreen";
import ReviewScreen from "./src/screens/ReviewScreen";
import GoalScreen from "./src/screens/GoalScreen";
import FoodDetailScreen from "./src/screens/FoodDetailScreen";
import FoodLibraryScreen from "./src/screens/FoodLibraryScreen";
import MealInsightsScreen from "./src/screens/MealInsightsScreen";
import AddFoodScreen from "./src/screens/AddFoodScreen";
import TextEntryScreen from "./src/screens/TextEntryScreen";
import VoiceEntryScreen from "./src/screens/VoiceEntryScreen";
import SavedMealsScreen from "./src/screens/SavedMealsScreen";
import ExerciseLogScreen from "./src/screens/ExerciseLogScreen";
import ExerciseReviewScreen from "./src/screens/ExerciseReviewScreen";
import StepLogScreen from "./src/screens/StepLogScreen";
import BodyMetricScreen from "./src/screens/BodyMetricScreen";
import StatsScreen from "./src/screens/StatsScreen";
import HabitScreen from "./src/screens/HabitScreen";
import DescriptiveHabitLogScreen from "./src/screens/DescriptiveHabitLogScreen";
import TodoScreen from "./src/screens/TodoScreen";
import UniversalVoiceLogScreen from "./src/screens/UniversalVoiceLogScreen";
import ReminderCreateScreen from "./src/screens/ReminderCreateScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import NotesScreen from "./src/screens/NotesScreen";
import NoteEditorScreen from "./src/screens/NoteEditorScreen";
import LogsScreen from "./src/screens/LogsScreen";
import HabitsFullScreen from "./src/screens/HabitsFullScreen";
import TodoFullScreen from "./src/screens/TodoFullScreen";
import ApiKeyScreen from "./src/screens/ApiKeyScreen";
import { COLORS } from "./src/utils/constants";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function headerRightButtons(navigation: any) {
  return () => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginRight: 16 }}>
      <TouchableOpacity onPress={() => navigation.navigate("Insights")}>
        <Ionicons name="stats-chart-outline" size={21} color={COLORS.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
        <Ionicons name="settings-outline" size={21} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { color: COLORS.text },
      }}
    >
      <Tab.Screen
        name="Today"
        component={HomeScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
      <Tab.Screen
        name="Habits"
        component={HabitsFullScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "checkmark-done-circle" : "checkmark-done-circle-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
      <Tab.Screen
        name="Logs"
        component={LogsScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
      <Tab.Screen
        name="Todo"
        component={TodoFullScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "checkbox" : "checkbox-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "create" : "create-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { status, error, reloadData } = useDrive();

  // Seed default habits once DB is ready
  useEffect(() => {
    if (status === 'ready') {
      ensureDefaultHabits().catch(() => {});
    }
  }, [status]);

  // Loading states
  if (status === 'checking' || status === 'connecting' || status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, gap: 16 }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
          {status === 'loading' ? 'Loading your data from Google Sheets…' :
           status === 'connecting' ? 'Connecting to Google Drive…' :
           'Checking sign-in…'}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, padding: 24, gap: 16 }}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>Something went wrong</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 }}
          onPress={reloadData}
        >
          <Text style={{ color: '#000', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerOptions = {
    headerStyle: { backgroundColor: COLORS.surface },
    headerTintColor: COLORS.primary,
    headerTitleStyle: { color: COLORS.text },
  };

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      {status === 'ready' ? (
        <>
          <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Insights" component={StatsScreen} options={{ title: "Insights" }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
          <Stack.Screen name="Goal" component={GoalScreen} options={{ title: "Goals" }} />
          <Stack.Screen name="FoodLibrary" component={FoodLibraryScreen} options={{ title: "Food Library" }} />
          <Stack.Screen name="AddFood" component={AddFoodScreen} options={{ title: "Add Food" }} />
          <Stack.Screen name="Camera" component={CameraScreen} options={{ title: "Log Food", headerShown: false }} />
          <Stack.Screen name="TextEntry" component={TextEntryScreen} options={{ title: "Type Food" }} />
          <Stack.Screen name="VoiceEntry" component={VoiceEntryScreen} options={{ title: "Voice Log" }} />
          <Stack.Screen name="SavedMeals" component={SavedMealsScreen} options={{ title: "Saved Meals" }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ title: "Review" }} />
          <Stack.Screen name="FoodDetail" component={FoodDetailScreen} options={{ title: "Food Details" }} />
          <Stack.Screen name="MealInsights" component={MealInsightsScreen} options={{ title: "Meal Insights" }} />
          <Stack.Screen name="ExerciseLog" component={ExerciseLogScreen} options={{ title: "Log Exercise" }} />
          <Stack.Screen name="ExerciseReview" component={ExerciseReviewScreen} options={{ title: "Exercise Review" }} />
          <Stack.Screen name="StepLog" component={StepLogScreen} options={{ title: "Log Steps" }} />
          <Stack.Screen name="BodyMetric" component={BodyMetricScreen} options={{ title: "Body Metrics" }} />
          <Stack.Screen name="HabitStack" component={HabitScreen} options={{ title: "Habits" }} />
          <Stack.Screen name="DescriptiveHabitLog" component={DescriptiveHabitLogScreen} options={{ title: "Log Habit" }} />
          <Stack.Screen name="TodoList" component={TodoScreen} options={{ title: "Todo List" }} />
          <Stack.Screen name="UniversalVoiceLog" component={UniversalVoiceLogScreen} options={{ title: "Voice Log" }} />
          <Stack.Screen name="CreateReminder" component={ReminderCreateScreen} options={{ title: "Set Reminder" }} />
          <Stack.Screen name="NoteEditor" component={NoteEditorScreen} options={{ title: "Note" }} />
          <Stack.Screen name="ApiKey" component={ApiKeyScreen} options={{ title: "OpenAI API Key" }} />
        </>
      ) : (
        <Stack.Screen name="GoogleSetup" component={GoogleSetupScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}


class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: string | null}> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  componentDidCatch(e: any) {
    this.setState({ error: e?.message || String(e) });
  }
  static getDerivedStateFromError(e: any) {
    return { error: e?.message || String(e) };
  }
  render() {
    if (this.state.error) {
      return React.createElement(View, { style: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#0a0a0a" } },
        React.createElement(Text, { style: { color: "#ff4757", fontSize: 14, fontFamily: "monospace", textAlign: "center" } }, "CRASH: " + this.state.error)
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    Font.loadAsync({ Ionicons: '/fonts/Ionicons.ttf' }).catch(() => {});
  }, []);
  return (
    <ErrorBoundary>
    <DriveProvider>
      <AuthProvider>
        <ToastProvider>
          <NavigationContainer>
            <ReminderProvider>
              <AppNavigator />
            </ReminderProvider>
          </NavigationContainer>
        </ToastProvider>
      </AuthProvider>
    </DriveProvider>
    </ErrorBoundary>
  );
}
