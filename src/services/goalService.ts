import * as db from './sheetsDB';
import { nowISO } from './mealService';

export async function getActiveGoal(): Promise<any | null> {
  return db.findFirst('goals', (r: any) => r.user_id === 1 && Number(r.is_active) === 1) ?? null;
}

export async function createGoal(data: {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_steps?: number | null;
  target_weight?: number | null;
  target_weight_unit?: string | null;
  target_waist?: number | null;
  target_waist_unit?: string | null;
  target_biceps?: number | null;
  target_biceps_unit?: string | null;
}): Promise<any> {
  const now = nowISO();

  // Deactivate existing goals in cache + Sheets
  const existingGoals = db.findWhere('goals', (r: any) => r.user_id === 1 && Number(r.is_active) === 1);
  for (const g of existingGoals) {
    await db.update('goals', (g as any).id, { is_active: 0, updated_at: now });
  }

  return db.insert('goals', {
    user_id: 1,
    daily_calories: data.daily_calories,
    daily_protein: data.daily_protein,
    daily_carbs: data.daily_carbs,
    daily_fat: data.daily_fat,
    daily_steps: data.daily_steps ?? null,
    target_weight: data.target_weight ?? null,
    target_weight_unit: data.target_weight_unit ?? null,
    target_waist: data.target_waist ?? null,
    target_waist_unit: data.target_waist_unit ?? null,
    target_biceps: data.target_biceps ?? null,
    target_biceps_unit: data.target_biceps_unit ?? null,
    is_active: 1,
    created_at: now,
    updated_at: now,
  });
}
