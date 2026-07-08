/**
 * User Goals Service
 * Manages short-term and long-term objectives, with linked habits as interventions.
 * Uses the user_goals and goal_habits sheets.
 */

import * as db from './sheetsDB';
import { nowISO } from './mealService';

export interface UserGoal {
  id: number;
  user_id: number;
  title: string;
  description: string;
  goal_type: 'short_term' | 'long_term';
  target_date: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  linkedHabits?: any[];
}

export async function getGoals(): Promise<UserGoal[]> {
  const goals = db.findWhere('user_goals', (r: any) => r.user_id === 1 && r.status !== 'archived');
  const goalHabits = db.findWhere('goal_habits', () => true);
  const habits = db.findWhere('habits', (h: any) => Number(h.is_active) !== 0);

  return goals.map((g: any) => {
    const linked = goalHabits
      .filter((gh: any) => Number(gh.goal_id) === Number(g.id))
      .map((gh: any) => habits.find((h: any) => Number(h.id) === Number(gh.habit_id)))
      .filter(Boolean);
    return { ...g, linkedHabits: linked };
  }) as UserGoal[];
}

export async function createGoal(data: {
  title: string;
  description?: string;
  goal_type: 'short_term' | 'long_term';
  target_date?: string | null;
}): Promise<UserGoal> {
  return db.insert('user_goals', {
    user_id: 1,
    title: data.title,
    description: data.description || '',
    goal_type: data.goal_type,
    target_date: data.target_date ?? null,
    status: 'active',
    created_at: nowISO(),
  }) as any;
}

export async function updateGoal(id: number, data: Partial<{
  title: string;
  description: string;
  goal_type: string;
  target_date: string | null;
  status: string;
}>): Promise<void> {
  await db.update('user_goals', id, data);
}

export async function deleteGoal(id: number): Promise<void> {
  await db.update('user_goals', id, { status: 'archived' });
}

export async function linkHabitToGoal(goalId: number, habitId: number): Promise<void> {
  // Check if already linked
  const existing = db.findFirst('goal_habits', (r: any) =>
    Number(r.goal_id) === goalId && Number(r.habit_id) === habitId
  );
  if (existing) return;
  await db.insert('goal_habits', {
    goal_id: goalId,
    habit_id: habitId,
    created_at: nowISO(),
  });
}

export async function unlinkHabitFromGoal(goalId: number, habitId: number): Promise<void> {
  const row = db.findFirst('goal_habits', (r: any) =>
    Number(r.goal_id) === goalId && Number(r.habit_id) === habitId
  );
  if (row) {
    await db.remove('goal_habits', (row as any).id);
  }
}

export async function autoGenerateGoalsFromHabits(): Promise<void> {
  const habits = db.findWhere('habits', (h: any) =>
    Number(h.is_active) !== 0 && Number(h.is_default) !== 0
  );

  const HABIT_GOAL_MAP: Record<string, { title: string; goal_type: 'short_term' | 'long_term' }> = {
    'Log Food': { title: 'Track nutrition daily', goal_type: 'short_term' },
    'Log Weight': { title: 'Monitor body metrics', goal_type: 'short_term' },
    'Log Steps': { title: 'Stay active daily', goal_type: 'short_term' },
    'Exercise': { title: 'Build fitness habit', goal_type: 'long_term' },
  };

  const existingGoals = db.findWhere('user_goals', (r: any) => r.user_id === 1 && r.status !== 'archived');
  const existingTitles = new Set(existingGoals.map((g: any) => g.title));

  for (const habit of habits) {
    const mapping = HABIT_GOAL_MAP[(habit as any).name];
    if (!mapping) continue;
    if (existingTitles.has(mapping.title)) continue;

    const goal = await createGoal({ title: mapping.title, goal_type: mapping.goal_type });
    await linkHabitToGoal((goal as any).id, (habit as any).id);
  }
}
