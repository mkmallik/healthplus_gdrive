import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDrive } from '../context/DriveContext';
import { COLORS } from '../utils/constants';

export default function GoogleSetupScreen() {
  const { status, error, connect, clientId } = useDrive();
  const [inputClientId, setInputClientId] = useState(clientId || '');
  const [inputClientSecret, setInputClientSecret] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const isConnecting = status === 'connecting' || status === 'loading';

  const handleConnect = async () => {
    const cid = inputClientId.trim();
    const secret = inputClientSecret.trim();
    if (!cid) {
      Alert.alert('Missing Client ID', 'Please enter your Google OAuth Client ID.');
      return;
    }
    if (!secret) {
      Alert.alert('Missing Client Secret', 'Please enter your Google OAuth Client Secret.');
      return;
    }
    try {
      await connect(cid, secret);
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message || 'Could not connect to Google Drive.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Ionicons name="logo-google" size={64} color={COLORS.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
      <Text style={styles.title}>Connect Google Drive</Text>
      <Text style={styles.subtitle}>
        Your health data will be stored in a Google Sheet in your own Drive. No data leaves your account.
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Google OAuth Client ID</Text>
        <TextInput
          style={styles.input}
          value={inputClientId}
          onChangeText={setInputClientId}
          placeholder="xxxxx.apps.googleusercontent.com"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isConnecting}
        />

        <Text style={styles.label}>Google OAuth Client Secret</Text>
        <TextInput
          style={styles.input}
          value={inputClientSecret}
          onChangeText={setInputClientSecret}
          placeholder="GOCSPX-..."
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={false}
          editable={!isConnecting}
        />

        <TouchableOpacity
          style={[styles.button, isConnecting && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={isConnecting}
          activeOpacity={0.8}
        >
          {isConnecting ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.buttonText}>Connect Google Drive</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.helpToggle} onPress={() => setShowHelp(h => !h)}>
        <Ionicons name={showHelp ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.primary} />
        <Text style={styles.helpToggleText}>How to get credentials?</Text>
      </TouchableOpacity>

      {showHelp && (
        <View style={styles.helpCard}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://console.cloud.google.com/apis/credentials')}
          >
            <Ionicons name="open-outline" size={16} color={COLORS.primary} />
            <Text style={styles.linkText}>Open Google Cloud Console</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color={COLORS.info} />
            <Text style={styles.infoText}>
              Redirect URI to add:{'\n'}
              <Text style={styles.code}>https://dist-one-lemon-81.vercel.app</Text>
            </Text>
          </View>
        </View>
      )}

      <View style={styles.privacyBox}>
        <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
        <Text style={styles.privacyText}>
          Your credentials are stored only on this device. HealthPlus only requests access to files it creates.
        </Text>
      </View>
    </ScrollView>
  );
}

const STEPS = [
  { text: 'Go to Google Cloud Console → Create a new project (e.g. "HealthPlus").' },
  { text: 'Enable "Google Sheets API" and "Google Drive API" from the API Library.' },
  { text: 'Go to Credentials → Create Credentials → OAuth 2.0 Client ID.' },
  { text: 'Choose "Web application" as the type.' },
  { text: 'Add your Vercel URL to "Authorised redirect URIs" (see below).' },
  { text: 'Configure OAuth consent screen → External → add your email as test user.' },
  { text: 'After creating, click the credential to see both Client ID and Client Secret.' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  errorBox: { flexDirection: 'row', gap: 8, backgroundColor: '#2d1515', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { flex: 1, color: COLORS.error, fontSize: 13 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, height: 46,
    fontSize: 14, color: COLORS.text, marginBottom: 14,
  },
  button: {
    height: 48, backgroundColor: COLORS.primary, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  helpToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, alignSelf: 'center' },
  helpToggleText: { color: COLORS.primary, fontSize: 14 },
  helpCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  step: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  stepNumText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  stepText: { flex: 1, color: COLORS.text, fontSize: 13, lineHeight: 18 },
  linkButton: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  linkText: { color: COLORS.primary, fontSize: 13 },
  infoBox: { backgroundColor: '#0d1f2d', borderRadius: 8, padding: 12, flexDirection: 'row', gap: 8 },
  infoText: { flex: 1, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  code: { color: COLORS.primary, fontFamily: 'monospace' },
  privacyBox: {
    flexDirection: 'row', gap: 10, backgroundColor: COLORS.surface,
    borderRadius: 8, padding: 14, marginTop: 8,
  },
  privacyText: { flex: 1, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
});
