/**
 * Creates the HealthPlus spreadsheet in the user's Google Drive on first login.
 * Sets up all sheet tabs with the correct header rows.
 */

import * as SecureStore from '../utils/secureStorage';
import { getValidAccessToken } from './googleAuthService';
import { SHEET_HEADERS } from './sheetsDB';
import { SPREADSHEET_ID_KEY } from '../utils/constants';

async function drivePost(path: string, body: any): Promise<any> {
  const token = await getValidAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Drive API error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

export async function createHealthPlusSpreadsheet(): Promise<string> {
  const sheetNames = Object.keys(SHEET_HEADERS);

  // Create spreadsheet with all sheets
  const spreadsheet = await drivePost('', {
    properties: { title: 'HealthPlus Data' },
    sheets: sheetNames.map((name, i) => ({
      properties: {
        sheetId: i,
        title: name,
        index: i,
        gridProperties: { rowCount: 1000, columnCount: 30 },
      },
    })),
  });

  const spreadsheetId: string = spreadsheet.spreadsheetId;

  // Write header rows for all sheets in one batch request
  const token = await getValidAccessToken();
  const data = sheetNames.map(name => ({
    range: `${name}!A1`,
    values: [SHEET_HEADERS[name]],
  }));

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'RAW', data }),
    }
  );
  if (!batchRes.ok) {
    const err = await batchRes.json().catch(() => ({}));
    throw new Error(`Header write failed: ${JSON.stringify(err)}`);
  }

  // Freeze header rows and bold them via batchUpdate
  const sheetsMetaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (sheetsMetaRes.ok) {
    const meta = await sheetsMetaRes.json();
    const requests = (meta.sheets || []).flatMap((s: any) => [
      {
        updateSheetProperties: {
          properties: {
            sheetId: s.properties.sheetId,
            gridProperties: { frozenRowCount: 1 },
          },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      {
        repeatCell: {
          range: { sheetId: s.properties.sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      },
    ]);

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
  }

  await SecureStore.setItemAsync(SPREADSHEET_ID_KEY, spreadsheetId);
  return spreadsheetId;
}

export async function getOrCreateSpreadsheet(): Promise<string> {
  const existing = await SecureStore.getItemAsync(SPREADSHEET_ID_KEY);
  if (existing) {
    // Verify it still exists
    try {
      const token = await getValidAccessToken();
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${existing}?fields=spreadsheetId`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) return existing;
    } catch {}
  }
  return createHealthPlusSpreadsheet();
}

export async function clearSpreadsheetId(): Promise<void> {
  await SecureStore.deleteItemAsync(SPREADSHEET_ID_KEY);
}

export function getSpreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
