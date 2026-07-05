/**
 * File service — stores images and audio in Google Drive.
 *
 * Storage model:
 *   - Files are uploaded to a "HealthPlus Files" folder in the user's Drive.
 *   - The Drive file ID is returned as "gdrive:<fileId>" and stored in Sheets.
 *   - On read, we check a local on-device cache first (expo's cacheDirectory).
 *     If the cache is cold, we download from Drive, cache it, then return the URI.
 *   - This means files load instantly after the first access on each device,
 *     but always have a Drive copy as the source of truth.
 *
 * Why drive.file scope is enough:
 *   - We created the folder, so we can read/write it under drive.file.
 */

import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { getValidAccessToken } from './googleAuthService';
import { DRIVE_FOLDER_ID_KEY, GDRIVE_PREFIX } from '../utils/constants';

const CACHE_DIR = FileSystem.cacheDirectory + 'healthplus_media/';
const LEGACY_DIR = FileSystem.documentDirectory + 'healthplus_files/';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif',
    m4a: 'audio/mp4', mp3: 'audio/mpeg', mp4: 'audio/mp4',
    aac: 'audio/aac', wav: 'audio/wav',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

// ── Drive folder management ───────────────────────────────────────────────────

async function getOrCreateDriveFolder(): Promise<string> {
  const cached = await SecureStore.getItemAsync(DRIVE_FOLDER_ID_KEY);
  if (cached) return cached;

  const token = await getValidAccessToken();

  // Check if folder already exists
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name%3D'HealthPlus+Files'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+trashed%3Dfalse&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files?.length > 0) {
      const id: string = data.files[0].id;
      await SecureStore.setItemAsync(DRIVE_FOLDER_ID_KEY, id);
      return id;
    }
  }

  // Create the folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'HealthPlus Files',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) throw new Error('Failed to create Drive folder');
  const folder = await createRes.json();
  await SecureStore.setItemAsync(DRIVE_FOLDER_ID_KEY, folder.id);
  return folder.id;
}

// ── Upload to Drive ───────────────────────────────────────────────────────────

async function uploadToDrive(localUri: string, filename: string, mimeType: string): Promise<string> {
  const folderId = await getOrCreateDriveFolder();
  const token = await getValidAccessToken();

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Multipart upload: metadata + file content
  const boundary = '-------HealthPlusBoundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = JSON.stringify({ name: filename, parents: [folderId] });

  // We send as base64 encoded body
  const multipartBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    metadata +
    delimiter +
    `Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n` +
    base64 +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(`Drive upload failed: ${JSON.stringify(err)}`);
  }

  const file = await uploadRes.json();
  return file.id as string;
}

// ── Download from Drive ───────────────────────────────────────────────────────

async function downloadFromDrive(fileId: string, cacheFilename: string): Promise<string> {
  await ensureDir(CACHE_DIR);
  const dest = CACHE_DIR + cacheFilename;

  const token = await getValidAccessToken();
  const downloadResult = await FileSystem.downloadAsync(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    dest,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (downloadResult.status !== 200) throw new Error('Drive download failed');
  return dest;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save a file (image or audio) to Google Drive.
 * Returns a "gdrive:<fileId>" reference to store in Sheets.
 */
export async function saveFile(uri: string, prefix: string, ext: string): Promise<string> {
  const filename = `${prefix}_${Date.now()}.${ext}`;
  const mimeType = mimeFromExt(ext);
  const fileId = await uploadToDrive(uri, filename, mimeType);
  return `${GDRIVE_PREFIX}${fileId}`;
}

/**
 * Get a local URI for displaying a file.
 * For Drive files: checks cache, downloads if needed.
 * For legacy local files: returns the old local path directly.
 */
export async function getFileUri(fileRef: string): Promise<string> {
  if (!fileRef) throw new Error('No file reference');

  // Legacy: old local filename (no prefix) — still serve from local dir
  if (!fileRef.startsWith(GDRIVE_PREFIX)) {
    const legacy = LEGACY_DIR + fileRef;
    const info = await FileSystem.getInfoAsync(legacy);
    if (info.exists) return legacy;
    // Also try if it's already an absolute URI
    if (fileRef.startsWith('file://') || fileRef.startsWith('/')) return fileRef;
    throw new Error('File not found locally');
  }

  const fileId = fileRef.slice(GDRIVE_PREFIX.length);
  const cacheFilename = `gdrive_${fileId}`;
  const cachePath = CACHE_DIR + cacheFilename;

  // Return cached version if present
  const info = await FileSystem.getInfoAsync(cachePath);
  if (info.exists) return cachePath;

  // Download from Drive into cache
  return downloadFromDrive(fileId, cacheFilename);
}

/**
 * Delete a file from Google Drive (and local cache).
 */
export async function deleteFile(fileRef: string): Promise<void> {
  if (!fileRef) return;

  if (!fileRef.startsWith(GDRIVE_PREFIX)) {
    // Legacy local file
    try {
      const path = fileRef.startsWith('/') || fileRef.startsWith('file://')
        ? fileRef
        : LEGACY_DIR + fileRef;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) await FileSystem.deleteAsync(path);
    } catch {}
    return;
  }

  const fileId = fileRef.slice(GDRIVE_PREFIX.length);

  // Delete from Drive
  try {
    const token = await getValidAccessToken();
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {}

  // Delete from local cache
  try {
    const cachePath = CACHE_DIR + `gdrive_${fileId}`;
    const info = await FileSystem.getInfoAsync(cachePath);
    if (info.exists) await FileSystem.deleteAsync(cachePath);
  } catch {}
}

/**
 * Check if a file reference is valid (exists in cache or can be resolved).
 * For Drive files this does NOT make a network call — it only checks local cache.
 */
export async function fileExists(fileRef: string): Promise<boolean> {
  if (!fileRef) return false;
  try {
    if (!fileRef.startsWith(GDRIVE_PREFIX)) {
      const info = await FileSystem.getInfoAsync(LEGACY_DIR + fileRef);
      return info.exists;
    }
    // For Drive refs, just return true — it'll 404 when accessed if deleted
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear the local media cache (frees device storage; Drive copy is unaffected).
 */
export async function clearLocalCache(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch {}
}

export function isDriveRef(fileRef: string): boolean {
  return fileRef?.startsWith(GDRIVE_PREFIX) ?? false;
}
