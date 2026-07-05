import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as aiService from "../services/aiService";
import { COLORS } from "../utils/constants";
import { useToast } from "../components/Toast";

export default function ApiKeyScreen() {
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const key = await aiService.getApiKey();
        if (key) {
          setApiKey(key);
          setConfigured(true);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      showToast("Please enter an API key first.", "info");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await aiService.testApiKey(apiKey.trim());
      setTestResult(ok);
      showToast(ok ? "API key is valid!" : "API key is invalid.", ok ? "success" : "error");
    } catch {
      setTestResult(false);
      showToast("Failed to test key.", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      showToast("Please enter an API key.", "info");
      return;
    }
    setSaving(true);
    try {
      await aiService.setApiKey(apiKey.trim());
      setConfigured(true);
      showToast("API key saved!", "success");
    } catch {
      showToast("Failed to save API key.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      await aiService.removeApiKey();
      setApiKey("");
      setConfigured(false);
      setTestResult(null);
      showToast("API key removed.", "info");
    } catch {
      showToast("Failed to remove API key.", "error");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>OpenAI API Key</Text>
      <Text style={styles.subtitle}>
        An OpenAI API key enables AI-powered features like food analysis, voice
        transcription, exercise analysis, and meal insights.
      </Text>

      {/* Status */}
      <View style={[styles.statusCard, configured ? styles.statusConfigured : styles.statusNotConfigured]}>
        <Ionicons
          name={configured ? "checkmark-circle" : "alert-circle"}
          size={20}
          color={configured ? COLORS.primary : COLORS.accent}
        />
        <Text style={[styles.statusText, { color: configured ? COLORS.primary : COLORS.accent }]}>
          {configured ? "API key configured" : "Not configured"}
        </Text>
      </View>

      {/* Input */}
      <Text style={styles.label}>API Key</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={(v) => {
            setApiKey(v);
            setTestResult(null);
          }}
          placeholder="sk-..."
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry={!showKey}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowKey(!showKey)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showKey ? "eye-off" : "eye"}
            size={22}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Test result */}
      {testResult !== null && (
        <View style={[styles.testResultCard, testResult ? styles.testSuccess : styles.testFailure]}>
          <Ionicons
            name={testResult ? "checkmark-circle" : "close-circle"}
            size={18}
            color={testResult ? COLORS.primary : COLORS.error}
          />
          <Text style={{ color: testResult ? COLORS.primary : COLORS.error, marginLeft: 6, fontWeight: "600" }}>
            {testResult ? "Key is valid" : "Key is invalid"}
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.testButton, testing && styles.buttonDisabled]}
          onPress={handleTest}
          disabled={testing || !apiKey.trim()}
          activeOpacity={0.8}
        >
          {testing ? (
            <ActivityIndicator size="small" color="#7E57C2" />
          ) : (
            <>
              <Ionicons name="flask-outline" size={18} color="#7E57C2" />
              <Text style={styles.testButtonText}>Test Key</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving || !apiKey.trim()}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {configured && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemove}
          activeOpacity={0.8}
        >
          <Text style={styles.removeButtonText}>Remove Key</Text>
        </TouchableOpacity>
      )}

      {/* Info section */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Features that need this key</Text>
        {[
          "Food photo analysis (calories, macros, health score)",
          "Text/voice food logging with AI estimation",
          "Exercise analysis and calorie estimation",
          "Body metric extraction from text/voice",
          "Meal insights and recommendations",
          "Voice transcription (Whisper)",
          "Universal voice log classification",
          "Reminder TTS audio generation",
        ].map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="sparkles" size={14} color={COLORS.accent} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.disclaimer}>
        Your API key is stored securely on this device only. It is never sent to
        any server other than OpenAI.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  statusConfigured: {
    backgroundColor: COLORS.primary + "15",
  },
  statusNotConfigured: {
    backgroundColor: COLORS.accent + "15",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeButton: {
    width: 44,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  testResultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  testSuccess: {
    backgroundColor: COLORS.primary + "15",
  },
  testFailure: {
    backgroundColor: COLORS.error + "15",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  testButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#7E57C2" + "15",
    borderWidth: 1.5,
    borderColor: "#7E57C2" + "40",
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7E57C2",
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  removeButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  removeButtonText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 17,
  },
});
