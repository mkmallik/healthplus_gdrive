/**
 * Google Sheets as a database.
 *
 * Architecture:
 *   - One Google Spreadsheet per user ("HealthPlus Data")
 *   - Each table = one sheet tab; row 1 = headers, rows 2+ = data
 *   - On init: all sheets are loaded into an in-memory cache
 *   - Reads: O(1) from cache
 *   - Writes: update cache immediately, then persist to Sheets API
 *
 * Row format: every table has an `id` column (auto-increment integer) as col 0.
 */

import * as SecureStore from '../utils/secureStorage';
import { getValidAccessToken } from './googleAuthService';
import { SPREADSHEET_ID_KEY } from '../utils/constants';

// ── Sheet definitions ─────────────────────────────────────────────────────────

export const SHEET_HEADERS: Record<string, string[]> = {
  meals: ['id', 'user_id', 'meal_type', 'date', 'eaten_at', 'created_at'],
  foods: ['id', 'meal_id', 'description', 'image_path', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'analysis', 'created_at'],
  goals: ['id', 'user_id', 'daily_calories', 'daily_protein', 'daily_carbs', 'daily_fat', 'daily_steps', 'target_weight', 'target_weight_unit', 'target_waist', 'target_waist_unit', 'target_biceps', 'target_biceps_unit', 'is_active', 'created_at', 'updated_at'],
  exercises: ['id', 'user_id', 'exercise_type', 'description', 'duration_minutes', 'calories_burned', 'intensity', 'muscle_groups', 'analysis', 'date', 'created_at'],
  step_entries: ['id', 'user_id', 'step_count', 'source', 'image_path', 'date', 'created_at'],
  body_metrics: ['id', 'user_id', 'metric_type', 'value', 'unit', 'notes', 'date', 'created_at'],
  habits: ['id', 'user_id', 'name', 'icon', 'color', 'frequency', 'frequency_target', 'habit_type', 'is_default', 'is_active', 'created_at'],
  habit_logs: ['id', 'habit_id', 'user_id', 'date', 'content', 'image_url', 'log_type', 'created_at'],
  todo_items: ['id', 'habit_id', 'user_id', 'text', 'is_done', 'done_date', 'created_date', 'is_archived', 'created_at'],
  notes: ['id', 'user_id', 'title', 'content', 'date', 'audio_path', 'image_path', 'created_at', 'updated_at'],
  reminders: ['id', 'user_id', 'todo_item_id', 'text', 'reminder_time', 'reminder_date', 'audio_path', 'is_triggered', 'recurrence', 'is_active', 'created_at'],
  saved_meals: ['id', 'user_id', 'name', 'created_at', 'updated_at'],
  saved_meal_items: ['id', 'saved_meal_id', 'description', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'],
  food_library: ['id', 'user_id', 'name', 'aliases', 'calories_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g', 'fiber_per_100g', 'sugar_per_100g', 'sodium_per_100g', 'category', 'serving_size_g', 'created_at'],
  user_goals: ['id', 'user_id', 'title', 'description', 'goal_type', 'target_date', 'status', 'created_at'],
  goal_habits: ['id', 'goal_id', 'habit_id', 'created_at'],
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Row = Record<string, any>;
type Cache = Map<string, Row[]>; // sheetName → rows (each row has id)

// ── Module state ──────────────────────────────────────────────────────────────

let _cache: Cache | null = null;
let _spreadsheetId: string | null = null;
let _sheetIds: Record<string, number> = {}; // name → numeric Google sheet id
let _initPromise: Promise<void> | null = null;

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getSpreadsheetId(): Promise<string> {
  if (_spreadsheetId) return _spreadsheetId;
  const stored = await SecureStore.getItemAsync(SPREADSHEET_ID_KEY);
  if (stored) { _spreadsheetId = stored; return stored; }
  throw new Error('NO_SPREADSHEET');
}

async function sheetsGet(path: string): Promise<any> {
  const token = await getValidAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Sheets GET failed ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function sheetsPost(path: string, body: any): Promise<any> {
  const token = await getValidAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Sheets POST failed ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function sheetsPut(path: string, body: any): Promise<any> {
  const token = await getValidAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Sheets PUT failed ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

function rowToObject(headers: string[], row: string[]): Row {
  const obj: Row = {};
  headers.forEach((h, i) => {
    const raw = row[i] ?? '';
    // Coerce numeric-looking values
    obj[h] = raw === '' ? null : (isNaN(Number(raw)) || raw.trim() === '' ? raw : Number(raw));
  });
  return obj;
}

function objectToRow(headers: string[], obj: Row): string[] {
  return headers.map(h => {
    const v = obj[h];
    if (v === null || v === undefined) return '';
    return String(v);
  });
}

// ── Load a single sheet into cache ───────────────────────────────────────────

async function loadSheet(spreadsheetId: string, sheetName: string): Promise<Row[]> {
  try {
    const data = await sheetsGet(`/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`);
    const values: string[][] = data.values || [];
    if (values.length < 1) return [];
    const headers = values[0];
    return values.slice(1).map(row => rowToObject(headers, row));
  } catch {
    return [];
  }
}

// ── Initialize: load all sheets ───────────────────────────────────────────────

async function initInternal(): Promise<void> {
  const spreadsheetId = await getSpreadsheetId();

  // Fetch spreadsheet metadata to get sheet IDs
  const meta = await sheetsGet(`/${spreadsheetId}?fields=sheets.properties`);
  for (const sheet of meta.sheets || []) {
    _sheetIds[sheet.properties.title] = sheet.properties.sheetId;
  }

  // Load all sheets in parallel
  const sheetNames = Object.keys(SHEET_HEADERS);
  const results = await Promise.all(
    sheetNames.map(name => loadSheet(spreadsheetId, name))
  );

  _cache = new Map();
  sheetNames.forEach((name, i) => _cache!.set(name, results[i]));
  _spreadsheetId = spreadsheetId;
}

export async function initDB(): Promise<void> {
  if (_cache) return;
  if (_initPromise) return _initPromise;
  _initPromise = initInternal().catch(e => {
    _initPromise = null;
    throw e;
  });
  return _initPromise;
}

export function resetDB(): void {
  _cache = null;
  _spreadsheetId = null;
  _sheetIds = {};
  _initPromise = null;
}

function getCache(sheetName: string): Row[] {
  if (!_cache) throw new Error('DB not initialized — call initDB() first');
  if (!_cache.has(sheetName)) _cache.set(sheetName, []);
  return _cache.get(sheetName)!;
}

// ── Auto-increment ID ─────────────────────────────────────────────────────────

function nextId(sheetName: string): number {
  const rows = getCache(sheetName);
  if (rows.length === 0) return 1;
  return Math.max(...rows.map(r => Number(r.id) || 0)) + 1;
}

// ── CRUD operations ───────────────────────────────────────────────────────────

export function findAll<T = Row>(sheetName: string): T[] {
  return getCache(sheetName) as unknown as T[];
}

export function findById<T = Row>(sheetName: string, id: number): T | null {
  const row = getCache(sheetName).find(r => Number(r.id) === id);
  return (row ?? null) as T | null;
}

export function findWhere<T = Row>(sheetName: string, predicate: (row: T) => boolean): T[] {
  return (getCache(sheetName) as unknown as T[]).filter(predicate);
}

export function findFirst<T = Row>(sheetName: string, predicate: (row: T) => boolean): T | null {
  return (getCache(sheetName) as unknown as T[]).find(predicate) ?? null;
}

export async function insert<T = Row>(sheetName: string, data: Omit<Row, 'id'>): Promise<T> {
  const id = nextId(sheetName);
  const row: Row = { id, ...data };
  getCache(sheetName).push(row);

  // Persist to Sheets
  const headers = SHEET_HEADERS[sheetName];
  const values = [objectToRow(headers, row)];
  const spreadsheetId = await getSpreadsheetId();
  await sheetsPost(
    `/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { values }
  );

  return row as unknown as T;
}

export async function update<T = Row>(sheetName: string, id: number, data: Partial<Row>): Promise<T> {
  const cache = getCache(sheetName);
  const idx = cache.findIndex(r => Number(r.id) === id);
  if (idx === -1) throw new Error(`Row id=${id} not found in ${sheetName}`);

  const updated = { ...cache[idx], ...data, id };
  cache[idx] = updated;

  // Row in the sheet = header row (1) + cache index (0-based) + 1 = idx + 2
  const sheetRow = idx + 2;
  const headers = SHEET_HEADERS[sheetName];
  const colCount = headers.length;
  const endCol = String.fromCharCode(64 + colCount); // A=65
  const range = `${sheetName}!A${sheetRow}:${endCol}${sheetRow}`;
  const spreadsheetId = await getSpreadsheetId();

  await sheetsPut(
    `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    { values: [objectToRow(headers, updated)] }
  );

  return updated as unknown as T;
}

export async function remove(sheetName: string, id: number): Promise<void> {
  const cache = getCache(sheetName);
  const idx = cache.findIndex(r => Number(r.id) === id);
  if (idx === -1) return;

  cache.splice(idx, 1);

  const sheetId = _sheetIds[sheetName];
  if (sheetId === undefined) throw new Error(`Sheet ID not found for ${sheetName}`);

  const spreadsheetId = await getSpreadsheetId();

  // Fetch the ID column directly from the sheet to find the exact row —
  // the cache index can drift if another device inserted rows since last load.
  const colData = await sheetsGet(`/${spreadsheetId}/values/${encodeURIComponent(sheetName + '!A:A')}`);
  const idRows: string[][] = (colData.values || []).slice(1); // skip header
  const sheetIdx = idRows.findIndex(r => Number(r[0]) === id);
  if (sheetIdx === -1) return; // already gone
  const sheetRow = sheetIdx + 1; // 0-based: header=0, first data=1

  await sheetsPost(`/${spreadsheetId}:batchUpdate`, {
    requests: [{
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: sheetRow,
          endIndex: sheetRow + 1,
        },
      },
    }],
  });
}

// ── Batch sync: re-load one sheet from Sheets ─────────────────────────────────

export async function reloadSheet(sheetName: string): Promise<void> {
  const spreadsheetId = await getSpreadsheetId();
  const rows = await loadSheet(spreadsheetId, sheetName);
  if (_cache) _cache.set(sheetName, rows);
}
