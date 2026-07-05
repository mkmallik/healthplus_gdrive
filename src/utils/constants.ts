export const COLORS = {
  primary: '#00D4AA',
  primaryDark: '#00B090',
  secondary: '#FF6B6B',
  background: '#121212',
  surface: '#1E1E1E',
  surfaceElevated: '#2A2A2A',
  border: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  success: '#4CAF50',
  warning: '#FFB74D',
  error: '#FF5252',
  info: '#29B6F6',
  protein: '#FF6B6B',
  carbs: '#FFD93D',
  fat: '#6BCB77',
  fiber: '#4D96FF',
};

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'email',
  'profile',
];

export const SHEETS_TOKEN_KEY = 'google_access_token';
export const SHEETS_REFRESH_TOKEN_KEY = 'google_refresh_token';
export const SHEETS_TOKEN_EXPIRY_KEY = 'google_token_expiry';
export const SHEETS_CLIENT_ID_KEY = 'google_client_id';
export const SPREADSHEET_ID_KEY = 'healthplus_spreadsheet_id';
export const USER_NAME_KEY = 'user_display_name';
export const USER_EMAIL_KEY = 'user_email';

export const OPENAI_API_KEY_STORE = 'openai_api_key';
export const DRIVE_FOLDER_ID_KEY = 'healthplus_drive_folder_id';
export const GDRIVE_PREFIX = 'gdrive:';
