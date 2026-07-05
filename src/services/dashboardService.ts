import * as db from './sheetsDB';
import { today } from './mealService';

function sumFoodsForDate(dateStr: string): { calories: number; protein: number; carbs: number; fat: number; fiber: number } {
  const meals = db.findWhere('meals', (r: any) => r.user_id === 1 && r.date === dateStr) as any[];
  const mealIds = new Set(meals.map(m => m.id));
  const foods = db.findWhere('foods', (f: any) => mealIds.has(f.meal_id)) as any[];
  return {
    calories: foods.reduce((s, f) => s + (Number(f.calories) || 0), 0),
    protein: foods.reduce((s, f) => s + (Number(f.protein) || 0), 0),
    carbs: foods.reduce((s, f) => s + (Number(f.carbs) || 0), 0),
    fat: foods.reduce((s, f) => s + (Number(f.fat) || 0), 0),
    fiber: foods.reduce((s, f) => s + (Number(f.fiber) || 0), 0),
  };
}

export async function getDashboard(dateStr?: string): Promise<any> {
  const d = dateStr || today();
  const goal = db.findFirst('goals', (r: any) => r.user_id === 1 && Number(r.is_active) === 1) as any;
  const nutrition = sumFoodsForDate(d);
  const steps = db.findFirst('step_entries', (r: any) => r.user_id === 1 && r.date === d) as any;
  const exercises = db.findWhere('exercises', (r: any) => r.user_id === 1 && r.date === d) as any[];
  const exerciseCalories = exercises.reduce((s, e) => s + (Number(e.calories_burned) || 0), 0);
  const latestMetrics: Record<string, any> = {};
  for (const m of db.findWhere('body_metrics', (r: any) => r.user_id === 1) as any[]) {
    if (!latestMetrics[m.metric_type] || m.date > latestMetrics[m.metric_type].date) {
      latestMetrics[m.metric_type] = m;
    }
  }

  return {
    date: d,
    nutrition: {
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein * 10) / 10,
      carbs: Math.round(nutrition.carbs * 10) / 10,
      fat: Math.round(nutrition.fat * 10) / 10,
      fiber: Math.round(nutrition.fiber * 10) / 10,
    },
    goal: goal ? {
      daily_calories: Number(goal.daily_calories),
      daily_protein: Number(goal.daily_protein),
      daily_carbs: Number(goal.daily_carbs),
      daily_fat: Number(goal.daily_fat),
      daily_steps: goal.daily_steps ? Number(goal.daily_steps) : null,
    } : { daily_calories: 2000, daily_protein: 50, daily_carbs: 250, daily_fat: 65, daily_steps: null },
    steps: { step_count: Number(steps?.step_count) || 0 },
    exercise_calories: exerciseCalories,
    body_metrics: latestMetrics,
  };
}

export async function getWeeklyData(): Promise<any[]> {
  const result: any[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const nutrition = sumFoodsForDate(dateStr);
    const steps = db.findFirst('step_entries', (r: any) => r.user_id === 1 && r.date === dateStr) as any;
    result.push({
      date: dateStr,
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein * 10) / 10,
      steps: Number(steps?.step_count) || 0,
    });
  }
  return result;
}
