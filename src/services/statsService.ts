import * as db from './sheetsDB';
import { today } from './mealService';

export async function getNutritionHistory(days: number = 30): Promise<any[]> {
  const result: any[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const meals = db.findWhere('meals', (r: any) => r.user_id === 1 && r.date === dateStr) as any[];
    const mealIds = new Set(meals.map((m: any) => m.id));
    const foods = db.findWhere('foods', (f: any) => mealIds.has(f.meal_id)) as any[];
    result.push({
      date: dateStr,
      calories: Math.round(foods.reduce((s, f) => s + (Number(f.calories) || 0), 0)),
      protein: Math.round(foods.reduce((s, f) => s + (Number(f.protein) || 0), 0) * 10) / 10,
      carbs: Math.round(foods.reduce((s, f) => s + (Number(f.carbs) || 0), 0) * 10) / 10,
      fat: Math.round(foods.reduce((s, f) => s + (Number(f.fat) || 0), 0) * 10) / 10,
    });
  }
  return result;
}

export async function getStepsHistory(days: number = 30): Promise<any[]> {
  const result: any[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = db.findFirst('step_entries', (r: any) => r.user_id === 1 && r.date === dateStr) as any;
    result.push({ date: dateStr, steps: Number(entry?.step_count) || 0 });
  }
  return result;
}

export async function getBodyMetricHistory(metricType: string, days: number = 90): Promise<any[]> {
  return (db.findWhere('body_metrics', (r: any) => r.user_id === 1 && r.metric_type === metricType) as any[])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);
}

export async function getHabitStreaks(): Promise<any[]> {
  const habits = db.findWhere('habits', (r: any) => r.user_id === 1 && Number(r.is_active) === 1) as any[];
  const todayStr = today();

  return habits.map(habit => {
    const logs = (db.findWhere('habit_logs', (l: any) => l.habit_id === habit.id) as any[])
      .map((l: any) => l.date).sort().reverse();

    let streak = 0, current = new Date(todayStr);
    for (const logDate of logs) {
      const d = current.toISOString().split('T')[0];
      if (logDate === d) { streak++; current.setDate(current.getDate() - 1); }
      else if (logDate < d) break;
    }

    return { habit_id: habit.id, habit_name: habit.name, streak, total_logs: logs.length };
  });
}

export async function getExerciseSummary(days: number = 30): Promise<any> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const exercises = (db.findWhere('exercises', (r: any) => r.user_id === 1 && r.date >= cutoffStr) as any[]);
  return {
    total_sessions: exercises.length,
    total_minutes: exercises.reduce((s, e) => s + (Number(e.duration_minutes) || 0), 0),
    total_calories: exercises.reduce((s, e) => s + (Number(e.calories_burned) || 0), 0),
    by_type: exercises.reduce((acc: any, e) => {
      acc[e.exercise_type] = (acc[e.exercise_type] || 0) + 1;
      return acc;
    }, {}),
  };
}

export async function getStreaks(): Promise<any> {
  const logs = db.findWhere('habit_logs', (r: any) => r.user_id === 1) as any[];
  const dates = [...new Set(logs.map((l: any) => l.date))].sort().reverse();
  if (dates.length === 0) return { overall: { current_streak: 0, best_streak: 0 } };

  const todayStr = new Date().toISOString().split('T')[0];
  let current = 0;
  let best = 0;
  let streak = 0;
  let cur = new Date(todayStr);

  for (const d of dates) {
    const expected = cur.toISOString().split('T')[0];
    if (d === expected) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else if (d < expected) {
      break;
    }
  }
  current = streak;

  // calc best streak
  let tempStreak = 1;
  const sorted = [...dates].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    prev.setDate(prev.getDate() + 1);
    if (prev.toISOString().split('T')[0] === sorted[i]) {
      tempStreak++;
      best = Math.max(best, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  best = Math.max(best, current);

  return { overall: { current_streak: current, best_streak: best } };
}

export async function getTrends(_metricOrDays?: any, _period?: any): Promise<any> {
  const days = typeof _metricOrDays === 'number' ? _metricOrDays : 30;
  const nutrition = await getNutritionHistory(days);
  const steps = await getStepsHistory(days);
  return { nutrition, steps };
}
