import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  isAuthenticated,
  signInWithGoogle,
  clearTokens,
  getClientId,
  setClientId,
  getStoredTokens,
} from '../services/googleAuthService';
import { getOrCreateSpreadsheet, clearSpreadsheetId, getSpreadsheetUrl } from '../services/spreadsheetSetup';
import { initDB, resetDB } from '../services/sheetsDB';
import { SPREADSHEET_ID_KEY } from '../utils/constants';

type DriveStatus = 'checking' | 'unauthenticated' | 'connecting' | 'loading' | 'ready' | 'error';

interface DriveContextType {
  status: DriveStatus;
  error: string | null;
  userEmail: string;
  userName: string;
  spreadsheetId: string | null;
  clientId: string | null;

  connect: (clientId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  setGoogleClientId: (id: string) => Promise<void>;
  reloadData: () => Promise<void>;
  getSheetUrl: () => string | null;
}

const DriveContext = createContext<DriveContextType>({
  status: 'checking',
  error: null,
  userEmail: '',
  userName: '',
  spreadsheetId: null,
  clientId: null,
  connect: async () => {},
  disconnect: async () => {},
  setGoogleClientId: async () => {},
  reloadData: async () => {},
  getSheetUrl: () => null,
});

export const useDrive = () => useContext(DriveContext);

export function DriveProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DriveStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [clientId, setClientIdState] = useState<string | null>(null);

  // On mount: check if already authenticated
  useEffect(() => { bootstrap(); }, []);

  async function bootstrap() {
    try {
      const storedClientId = await getClientId();
      if (storedClientId) setClientIdState(storedClientId);

      const authed = await isAuthenticated();
      if (!authed) {
        setStatus('unauthenticated');
        return;
      }

      const tokens = await getStoredTokens();
      if (tokens) {
        setUserEmail(tokens.email);
        setUserName(tokens.name);
      }

      await loadSpreadsheetAndInit();
    } catch (e: any) {
      setError(e.message || 'Initialization failed');
      setStatus('error');
    }
  }

  async function loadSpreadsheetAndInit() {
    setStatus('loading');
    try {
      const sid = await getOrCreateSpreadsheet();
      setSpreadsheetId(sid);
      resetDB();
      await initDB();
      setStatus('ready');
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
      setStatus('error');
    }
  }

  const connect = useCallback(async (cid: string) => {
    setStatus('connecting');
    setError(null);
    try {
      await setClientId(cid);
      setClientIdState(cid);
      const tokens = await signInWithGoogle(cid);
      setUserEmail(tokens.email);
      setUserName(tokens.name);
      await loadSpreadsheetAndInit();
    } catch (e: any) {
      setError(e.message || 'Sign-in failed');
      setStatus('unauthenticated');
      throw e;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await clearTokens();
    await clearSpreadsheetId();
    // Clear Drive folder ID so it's re-discovered on next login
    await SecureStore.deleteItemAsync('healthplus_drive_folder_id').catch(() => {});
    resetDB();
    setSpreadsheetId(null);
    setUserEmail('');
    setUserName('');
    setStatus('unauthenticated');
  }, []);

  const setGoogleClientId = useCallback(async (id: string) => {
    await setClientId(id);
    setClientIdState(id);
  }, []);

  const reloadData = useCallback(async () => {
    await loadSpreadsheetAndInit();
  }, []);

  const getSheetUrl = useCallback(() => {
    return spreadsheetId ? getSpreadsheetUrl(spreadsheetId) : null;
  }, [spreadsheetId]);

  return (
    <DriveContext.Provider value={{
      status, error, userEmail, userName,
      spreadsheetId, clientId,
      connect, disconnect, setGoogleClientId, reloadData, getSheetUrl,
    }}>
      {children}
    </DriveContext.Provider>
  );
}
