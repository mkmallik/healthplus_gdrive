import * as db from './sheetsDB';
import { saveFile } from './fileService';
import * as aiService from './aiService';
import { today, nowISO } from './mealService';

export async function getHabits(): Promise<any[]> {
  return db.findWhere('habits', (r: any) => r.user_id === 1 && Number(r.is_active) === 1)
    .sort((a: any, b: any) => a.id - b.id);
}

export async function createHabit(data: {
  name: string; icon?: string; color?: string;
  habit_type?: string; frequency?: string;
}): Promise<any> {
  return db.insert('habits', {
    user_id: 1,
    name: data.name,
    icon: data.icon || 'checkmark-circle',
    color: data.color || '#00D4AA',
    frequency: data.frequency || 'daily',
    frequency_target: 1,
    habit_type: data.habit_type || 'boolean',
    is_default: 0,
    is_active: 1,
    created_at: nowISO(),
  });
}

export async function updateHabit(id: number, data: Partial<{ name: string; icon: string; color: string; habit_type: string }>): Promise<any> {
  return db.update('habits', id, data);
}

export async function deleteHabit(id: number): Promise<void> {
  await db.update('habits', id, { is_active: 0 });
}

export async function getHabitLogsForDate(dateStr?: string): Promise<any[]> {
  const d = dateStr || today();
  const activeHabitIds = new Set(
    (db.findWhere('habits', (r: any) => r.user_id === 1 && Number(r.is_active) === 1) as any[]).map((h: any) => h.id)
  );
  return (db.findWhere('habit_logs', (r: any) => r.user_id === 1 && r.date === d) as any[])
    .filter((l: any) => activeHabitIds.has(l.habit_id));
}

export async function logHabit(habitId: number, content?: string, imageUri?: string): Promise<any> {
  const habit = db.findById('habits', habitId) as any;
  if (!habit) throw new Error('Habit not found');

  const d = today();
  // For boolean habits, toggle: remove if already logged today
  if (habit.habit_type === 'boolean') {
    const existing = db.findFirst('habit_logs', (r: any) =>
      r.habit_id === habitId && r.date === d
    ) as any;
    if (existing) {
      await db.remove('habit_logs', existing.id);
      return null;
    }
  }

  let imagePath: string | null = null;
  if (imageUri) {
    const ext = imageUri.split('.').pop() || 'jpg';
    imagePath = await saveFile(imageUri, 'habit', ext);
  }

  let finalContent = content || null;
  if (imagePath && !content && habit.habit_type === 'descriptive') {
    try { finalContent = await aiService.describeHabitImage(imageUri!, habit.name); } catch {}
  }

  return db.insert('habit_logs', {
    habit_id: habitId, user_id: 1, date: d,
    content: finalContent, image_url: imagePath,
    log_type: imageUri ? 'image' : 'manual',
    created_at: nowISO(),
  });
}

export async function getHabitStreak(habitId: number): Promise<number> {
  const logs = (db.findWhere('habit_logs', (r: any) => r.habit_id === habitId) as any[])
    .map((l: any) => l.date)
    .sort()
    .reverse();

  if (logs.length === 0) return 0;

  const todayStr = today();
  let streak = 0;
  let current = new Date(todayStr);

  for (const logDate of logs) {
    const d = current.toISOString().split('T')[0];
    if (logDate === d) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else if (logDate < d) {
      break;
    }
  }
  return streak;
}

export async function ensureDefaultHabits(): Promise<void> {
  const existing = db.findWhere('habits', (r: any) => r.user_id === 1);
  if (existing.length > 0) return;

  const defaults = [
    { name: 'Log Food', icon: 'restaurant', color: '#FFB74D' },
    { name: 'Log Weight', icon: 'scale-outline', color: '#A1887F' },
    { name: 'Log Steps', icon: 'footsteps', color: '#26C6DA' },
    { name: 'Exercise', icon: 'fitness', color: '#FF4081' },
  ];

  for (const h of defaults) {
    await db.insert('habits', {
      user_id: 1, name: h.name, icon: h.icon, color: h.color,
      frequency: 'daily', frequency_target: 1,
      habit_type: 'boolean', is_default: 1, is_active: 1, created_at: nowISO(),
    });
  }
}
