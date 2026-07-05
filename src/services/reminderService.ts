import * as db from './sheetsDB';
import * as aiService from './aiService';
import { today, nowISO } from './mealService';

export async function getReminders(dateStr?: string): Promise<any[]> {
  const d = dateStr || today();
  return (db.findWhere('reminders', (r: any) => r.user_id === 1 && Number(r.is_active) === 1) as any[])
    .sort((a, b) => a.reminder_time.localeCompare(b.reminder_time))
    .map(r => ({
      ...r,
      is_triggered_today: Number(r.is_triggered) === 1 && r.reminder_date === d,
    }));
}

export async function triggerReminder(id: number, _dateStr?: string): Promise<void> {
  const reminder = db.findById('reminders', id) as any;
  if (!reminder) return;
  if (reminder.recurrence && reminder.recurrence !== 'onetime') {
    await advanceRecurringReminder(id);
  } else {
    await db.update('reminders', id, { is_triggered: 1 });
  }
}

export async function createReminder(data: {
  text: string;
  reminder_time: string; // HH:MM
  reminder_date?: string;
  recurrence?: string;
  todo_item_id?: number | null;
  generateAudio?: boolean;
}): Promise<any> {
  let audioPath: string | null = null;

  if (data.generateAudio) {
    try {
      audioPath = await aiService.generateTts(data.text);
    } catch {}
  }

  return db.insert('reminders', {
    user_id: 1,
    todo_item_id: data.todo_item_id ?? null,
    text: data.text,
    reminder_time: data.reminder_time,
    reminder_date: data.reminder_date || today(),
    audio_path: audioPath,
    is_triggered: 0,
    recurrence: data.recurrence || 'onetime',
    is_active: 1,
    created_at: nowISO(),
  });
}

export async function markReminderTriggered(id: number): Promise<void> {
  await db.update('reminders', id, { is_triggered: 1 });
}

export async function deleteReminder(id: number): Promise<void> {
  await db.update('reminders', id, { is_active: 0 });
}

export async function getDueReminders(): Promise<any[]> {
  const now = new Date();
  const todayStr = today();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (db.findWhere('reminders', (r: any) =>
    r.user_id === 1 && Number(r.is_active) === 1 && Number(r.is_triggered) === 0
  ) as any[]).filter(r => {
    if (r.recurrence === 'onetime') {
      return r.reminder_date === todayStr && r.reminder_time <= currentTime;
    }
    return r.reminder_time <= currentTime;
  });
}

export async function advanceRecurringReminder(id: number): Promise<void> {
  const reminder = db.findById('reminders', id) as any;
  if (!reminder) return;

  const next = new Date(reminder.reminder_date || today());
  switch (reminder.recurrence) {
    case 'daily': next.setDate(next.getDate() + 1); break;
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'biweekly': next.setDate(next.getDate() + 14); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    default: await db.update('reminders', id, { is_triggered: 1 }); return;
  }

  await db.update('reminders', id, {
    reminder_date: next.toISOString().split('T')[0],
    is_triggered: 0,
  });
}
