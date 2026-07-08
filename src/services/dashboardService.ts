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

export async function getDailySummary(dateStr: string): Promise<any> {
  const goal = db.findFirst('goals', (r: any) => r.user_id === 1 && Number(r.is_active) === 1) as any;
  const meals = db.findWhere('meals', (r: any) => r.user_id === 1 && r.date === dateStr) as any[];
  const allFoods = db.findWhere('foods', (f: any) => meals.some((m: any) => m.id === f.meal_id)) as any[];

  const mealData = meals.map((m: any) => {
    const foods = allFoods.filter((f: any) => f.meal_id === m.id);
    return {
      id: m.id,
      meal_type: m.meal_type,
      foods,
      total_calories: foods.reduce((s: number, f: any) => s + (Number(f.calories) || 0), 0),
      total_protein: foods.reduce((s: number, f: any) => s + (Number(f.protein) || 0), 0),
      total_carbs: foods.reduce((s: number, f: any) => s + (Number(f.carbs) || 0), 0),
      total_fat: foods.reduce((s: number, f: any) => s + (Number(f.fat) || 0), 0),
    };
  });

  const exercises = db.findWhere('exercises', (r: any) => r.user_id === 1 && r.date === dateStr) as any[];
  const steps = db.findFirst('step_entries', (r: any) => r.user_id === 1 && r.date === dateStr) as any;
  const bodyMetrics = db.findWhere('body_metrics', (r: any) => r.user_id === 1).sort((a: any, b: any) => b.date.localeCompare(a.date)) as any[];

  const totalCalories = allFoods.reduce((s: number, f: any) => s + (Number(f.calories) || 0), 0);
  const totalProtein = allFoods.reduce((s: number, f: any) => s + (Number(f.protein) || 0), 0);
  const totalCarbs = allFoods.reduce((s: number, f: any) => s + (Number(f.carbs) || 0), 0);
  const totalFat = allFoods.reduce((s: number, f: any) => s + (Number(f.fat) || 0), 0);
  const exerciseCalsBurned = exercises.reduce((s: number, e: any) => s + (Number(e.calories_burned) || 0), 0);
  const totalDurationMinutes = exercises.reduce((s: number, e: any) => s + (Number(e.duration_minutes) || 0), 0);

  // Normalize exercise rows so UI gets proper numbers (not raw sheet strings)
  const normalizedExercises = exercises.map((e: any) => ({
    ...e,
    duration_minutes: Number(e.duration_minutes) || 0,
    calories_burned: Number(e.calories_burned) || 0,
    intensity: e.intensity || 'moderate',
  }));

  // BMR using Mifflin-St Jeor (weight only; assume 170cm height, 30yr age, male defaults)
  const latestWeight = bodyMetrics.find((m: any) => (m.metric_type || '').toLowerCase() === 'weight');
  const rawWeightVal = latestWeight ? Number(latestWeight.value) : NaN;
  const weightKg = isNaN(rawWeightVal) ? 70 : rawWeightVal;
  // Convert lbs to kg if unit is lb/lbs
  const weightKgNorm = latestWeight && /^lb/i.test(latestWeight.unit || '') ? weightKg * 0.453592 : weightKg;
  const bmr = Math.round(10 * (weightKgNorm || 70) + 6.25 * 170 - 5 * 30 + 5);

  // Steps calories: ~0.04 kcal/step beyond what walking exercise already covers
  const stepCount = Number(steps?.step_count) || 0;
  // Only add step burn if there's no auto-logged walking exercise for today
  const hasWalkingExercise = exercises.some((e: any) => (e.exercise_type || '').toLowerCase() === 'walking');
  const stepsCals = hasWalkingExercise ? 0 : Math.round(stepCount * 0.04);

  const totalBurned = bmr + exerciseCalsBurned + stepsCals;

  console.log('[getDailySummary] calories_burned debug:', { bmr, exerciseCalsBurned, stepsCals, totalBurned, weightKg, weightKgNorm, latestWeight: latestWeight ? { type: latestWeight.metric_type, value: latestWeight.value, unit: latestWeight.unit } : null });

  return {
    goal,
    meals: mealData,
    total_calories: totalCalories,
    total_protein: totalProtein,
    total_carbs: totalCarbs,
    total_fat: totalFat,
    exercise_summary: {
      exercises: normalizedExercises,
      total_calories_burned: exerciseCalsBurned,
      total_exercises: exercises.length,
      total_duration_minutes: totalDurationMinutes,
    },
    step_summary: { total_steps: stepCount, step_count: stepCount },
    body_metrics: bodyMetrics,
    calories_burned: {
      bmr,
      exercise: exerciseCalsBurned,
      steps: stepsCals,
      total: totalBurned,
    },
  };
}

export async function getWeeklySummary(_dateStr?: string): Promise<any> {
  const data = await getWeeklyData();
  const totals = data.reduce((acc, d) => ({
    calories: acc.calories + d.calories,
    protein: acc.protein + d.protein,
    steps: acc.steps + d.steps,
  }), { calories: 0, protein: 0, steps: 0 });
  return { days: data, averages: { calories: Math.round(totals.calories / 7), protein: Math.round(totals.protein * 10 / 7) / 10, steps: Math.round(totals.steps / 7) } };
}

export async function getMonthlySummary(_year?: number, _month?: number): Promise<any> {
  const result: any[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const meals = db.findWhere('meals', (r: any) => r.user_id === 1 && r.date === dateStr) as any[];
    const mealIds = new Set(meals.map((m: any) => m.id));
    const foods = db.findWhere('foods', (f: any) => mealIds.has(f.meal_id)) as any[];
    const steps = db.findFirst('step_entries', (r: any) => r.user_id === 1 && r.date === dateStr) as any;
    result.push({ date: dateStr, calories: Math.round(foods.reduce((s, f) => s + (Number(f.calories) || 0), 0)), steps: Number(steps?.step_count) || 0 });
  }
  return { days: result };
}
