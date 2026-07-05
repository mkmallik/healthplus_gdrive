import * as db from './sheetsDB';
import { saveFile } from './fileService';
import * as aiService from './aiService';
import { today, nowISO } from './mealService';

function stepsToCalories(steps: number): number {
  return Math.round(steps * 0.04);
}

export async function getStepsForDate(dateStr?: string): Promise<any | null> {
  const d = dateStr || today();
  return db.findFirst('step_entries', (r: any) => r.user_id === 1 && r.date === d) ?? null;
}

export async function logStepsManual(stepCount: number): Promise<any> {
  const d = today();
  const existing = db.findFirst('step_entries', (r: any) => r.user_id === 1 && r.date === d) as any;
  const calories = stepsToCalories(stepCount);

  if (existing) {
    return db.update('step_entries', existing.id, { step_count: stepCount, source: 'manual', created_at: nowISO() });
  }
  return db.insert('step_entries', { user_id: 1, step_count: stepCount, source: 'manual', image_path: null, date: d, created_at: nowISO() });
}

export async function logStepsFromWatchImage(imageUri: string): Promise<any> {
  const ext = imageUri.split('.').pop() || 'jpg';
  const filename = await saveFile(imageUri, 'watch', ext);
  const result = await aiService.analyzeWatchImage(imageUri);

  const d = today();
  const stepCount = result?.step_count || 0;
  const existing = db.findFirst('step_entries', (r: any) => r.user_id === 1 && r.date === d) as any;

  if (existing) {
    return { entry: await db.update('step_entries', existing.id, { step_count: stepCount, source: 'watch_image', image_path: filename }), result };
  }
  const entry = await db.insert('step_entries', { user_id: 1, step_count: stepCount, source: 'watch_image', image_path: filename, date: d, created_at: nowISO() });
  return { entry, result };
}
