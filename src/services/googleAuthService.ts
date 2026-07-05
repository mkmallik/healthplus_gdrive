import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import * as AuthSession from 'expo-auth-session';
import {
  SHEETS_TOKEN_KEY,
  SHEETS_REFRESH_TOKEN_KEY,
  SHEETS_TOKEN_EXPIRY_KEY,
  SHEETS_CLIENT_ID_KEY,
  USER_EMAIL_KEY,
  USER_NAME_KEY,
  GOOGLE_SCOPES,
} from '../utils/constants';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // Unix timestamp ms
  email: string;
  name: string;
}

// ── Storage helpers ─────────────────────────────────────────────────────────

export async function getClientId(): Promise<string | null> {
  return SecureStore.getItemAsync(SHEETS_CLIENT_ID_KEY);
}

export async function setClientId(id: string): Promise<void> {
  return SecureStore.setItemAsync(SHEETS_CLIENT_ID_KEY, id);
}

export async function clearClientId(): Promise<void> {
  return SecureStore.deleteItemAsync(SHEETS_CLIENT_ID_KEY);
}

async function storeTokens(tokens: GoogleTokens): Promise<void> {
  await SecureStore.setItemAsync(SHEETS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(SHEETS_TOKEN_EXPIRY_KEY, String(tokens.expiresAt));
  await SecureStore.setItemAsync(USER_EMAIL_KEY, tokens.email);
  await SecureStore.setItemAsync(USER_NAME_KEY, tokens.name);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(SHEETS_REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SHEETS_TOKEN_KEY),
    SecureStore.deleteItemAsync(SHEETS_REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(SHEETS_TOKEN_EXPIRY_KEY),
    SecureStore.deleteItemAsync(USER_EMAIL_KEY),
    SecureStore.deleteItemAsync(USER_NAME_KEY),
  ]);
}

export async function getStoredTokens(): Promise<GoogleTokens | null> {
  const accessToken = await SecureStore.getItemAsync(SHEETS_TOKEN_KEY);
  if (!accessToken) return null;
  const expiresAt = Number(await SecureStore.getItemAsync(SHEETS_TOKEN_EXPIRY_KEY) || '0');
  const refreshToken = await SecureStore.getItemAsync(SHEETS_REFRESH_TOKEN_KEY);
  const email = (await SecureStore.getItemAsync(USER_EMAIL_KEY)) || '';
  const name = (await SecureStore.getItemAsync(USER_NAME_KEY)) || '';
  return { accessToken, refreshToken, expiresAt, email, name };
}

// ── PKCE helpers ─────────────────────────────────────────────────────────────

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = await Crypto.getRandomBytesAsync(32);
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return { verifier, challenge };
}

// ── Sign-in flow ──────────────────────────────────────────────────────────────

export async function signInWithGoogle(clientId: string): Promise<GoogleTokens> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'healthplus-gdrive', path: 'oauth2redirect' });
  const { verifier, challenge } = await generatePKCE();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== 'success') {
    throw new Error('Sign-in cancelled or failed');
  }

  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('No authorization code received');

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${err.error_description || tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();

  // Fetch user info
  const userInfo = await fetchUserInfo(tokenData.access_token);

  const tokens: GoogleTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,
    expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
    email: userInfo.email || '',
    name: userInfo.name || userInfo.email || 'User',
  };

  await storeTokens(tokens);
  return tokens;
}

async function fetchUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return res.json();
  } catch {}
  return { email: '', name: '' };
}

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string, clientId: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Token refresh failed: ${err.error || response.status}`);
  }

  const data = await response.json();
  const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;

  await SecureStore.setItemAsync(SHEETS_TOKEN_KEY, data.access_token);
  await SecureStore.setItemAsync(SHEETS_TOKEN_EXPIRY_KEY, String(newExpiry));

  return data.access_token;
}

// ── Get a valid access token (auto-refresh if needed) ─────────────────────────

export async function getValidAccessToken(): Promise<string> {
  const tokens = await getStoredTokens();
  if (!tokens) throw new Error('NOT_AUTHENTICATED');

  // Refresh 5 min before expiry
  if (tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
    if (!tokens.refreshToken) throw new Error('TOKEN_EXPIRED_NO_REFRESH');
    const clientId = await getClientId();
    if (!clientId) throw new Error('NO_CLIENT_ID');
    return refreshAccessToken(tokens.refreshToken, clientId);
  }

  return tokens.accessToken;
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const tokens = await getStoredTokens();
    return !!tokens?.accessToken;
  } catch {
    return false;
  }
}
