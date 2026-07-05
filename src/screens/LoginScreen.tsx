import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../utils/constants";

export default function LoginScreen() {
  const { updateName } = useAuth();
  const [name, setName] = useState("");

  const handleGetStarted = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await updateName(trimmed);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={90}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>HealthPlus</Text>
        <Text style={styles.subtitle}>Track your nutrition with ease</Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={COLORS.textSecondary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, !name.trim() && styles.buttonDisabled]}
          onPress={handleGetStarted}
          disabled={!name.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 40,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "600",
  },
});
