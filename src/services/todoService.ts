import * as db from './sheetsDB';
import { today, nowISO } from './mealService';

export async function getTodoHabits(): Promise<any[]> {
  return db.findWhere('habits', (r: any) =>
    r.user_id === 1 && Number(r.is_active) === 1 && r.habit_type === 'todo'
  );
}

export async function getTodosForHabit(habitId: number, dateStr?: string): Promise<any[]> {
  const d = dateStr || today();
  return (db.findWhere('todo_items', (r: any) =>
    r.habit_id === habitId && r.user_id === 1 &&
    Number(r.is_archived) !== 1 &&
    (r.created_date === d || (Number(r.is_done) === 0))
  ) as any[]).sort((a, b) => a.id - b.id);
}

export async function addTodo(habitId: number, text: string): Promise<any> {
  return db.insert('todo_items', {
    habit_id: habitId, user_id: 1, text,
    is_done: 0, done_date: null, created_date: today(),
    is_archived: 0, created_at: nowISO(),
  });
}

export async function toggleTodo(id: number): Promise<any> {
  const item = db.findById('todo_items', id) as any;
  if (!item) throw new Error('Todo not found');
  const isDone = Number(item.is_done) === 1 ? 0 : 1;
  return db.update('todo_items', id, { is_done: isDone, done_date: isDone ? today() : null });
}

export async function deleteTodo(habitIdOrItemId: number, itemId?: number): Promise<void> {
  await db.remove('todo_items', itemId ?? habitIdOrItemId);
}

export async function archiveTodo(habitIdOrItemId: number, itemId?: number): Promise<void> {
  await db.update('todo_items', itemId ?? habitIdOrItemId, { is_archived: 1 });
}

export async function createTodo(habitId: number, text: string, _dateStr?: string): Promise<any> {
  return addTodo(habitId, text);
}

export async function updateTodo(habitId: number, itemId: number, data: { is_done?: boolean }, _dateStr?: string): Promise<any> {
  return db.update('todo_items', itemId, {
    ...(data.is_done !== undefined ? { is_done: data.is_done ? 1 : 0 } : {}),
  });
}

export async function getTodos(habitId: number, dateStr?: string): Promise<any> {
  const items = await getTodosForHabit(habitId, dateStr);
  const done = items.filter(i => Number(i.is_done) === 1).length;
  return { total: items.length, done, pending: items.length - done, items };
}
