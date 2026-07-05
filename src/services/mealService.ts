import * as db from './sheetsDB';
import * as aiService from './aiService';
import { saveFile, deleteFile } from './fileService';

export function today(): string {
  return new Date().toISOString().split('T')[0];
}
export function nowISO(): string {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function classifyMeal(): string {
  const h = new Date().getHours();
  if (h >= 6 && h <= 10) return 'breakfast';
  if (h >= 11 && h <= 14) return 'lunch';
  if (h >= 17 && h <= 21) return 'dinner';
  return 'snack';
}

function foodRowToResponse(row: any): any {
  let analysis = null;
  if (row.analysis) { try { analysis = JSON.parse(row.analysis); } catch {} }
  return {
    id: row.id, meal_id: row.meal_id, description: row.description,
    image_path: row.image_path, calories: Number(row.calories) || 0,
    protein: Number(row.protein) || 0, carbs: Number(row.carbs) || 0,
    fat: Number(row.fat) || 0, fiber: Number(row.fiber) || 0,
    sugar: Number(row.sugar) || 0, sodium: Number(row.sodium) || 0,
    analysis, created_at: row.created_at,
  };
}

async function getOrCreateMeal(mealType: string, dateStr: string): Promise<number> {
  const existing = db.findFirst('meals', (r: any) =>
    r.user_id === 1 && r.meal_type === mealType && r.date === dateStr
  );
  if (existing) return (existing as any).id;
  const meal = await db.insert('meals', { user_id: 1, meal_type: mealType, date: dateStr, eaten_at: null, created_at: nowISO() });
  return (meal as any).id;
}

export async function getMealsByDate(dateStr?: string): Promise<any[]> {
  const d = dateStr || today();
  const meals = db.findWhere('meals', (r: any) => r.user_id === 1 && r.date === d)
    .sort((a: any, b: any) => a.meal_type.localeCompare(b.meal_type));

  return meals.map((meal: any) => {
    const foods = db.findWhere('foods', (f: any) => f.meal_id === meal.id).map(foodRowToResponse);
    return {
      id: meal.id,
      meal_type: meal.meal_type,
      date: meal.date,
      foods,
      total_calories: foods.reduce((s: number, f: any) => s + f.calories, 0),
      total_protein: foods.reduce((s: number, f: any) => s + f.protein, 0),
      total_carbs: foods.reduce((s: number, f: any) => s + f.carbs, 0),
      total_fat: foods.reduce((s: number, f: any) => s + f.fat, 0),
    };
  });
}

export async function getMealInsights(mealId: number): Promise<any> {
  const meal = db.findById('meals', mealId) as any;
  if (!meal || meal.user_id !== 1) throw new Error('Meal not found');

  const foods = db.findWhere('foods', (f: any) => f.meal_id === mealId);
  if (foods.length === 0) throw new Error('Meal has no food entries');

  const foodsData = foods.map((f: any) => ({
    description: f.description || 'Unknown food',
    calories: Number(f.calories), protein: Number(f.protein),
    carbs: Number(f.carbs), fat: Number(f.fat),
    fiber: Number(f.fiber), sugar: Number(f.sugar), sodium: Number(f.sodium),
  }));

  const analysis = await aiService.analyzeMeal(foodsData);
  const sum = (key: string) => foods.reduce((s: number, f: any) => s + (Number(f[key]) || 0), 0);

  return {
    meal_id: meal.id, meal_type: meal.meal_type,
    total_calories: Math.round(sum('calories') * 10) / 10,
    total_protein: Math.round(sum('protein') * 10) / 10,
    total_carbs: Math.round(sum('carbs') * 10) / 10,
    total_fat: Math.round(sum('fat') * 10) / 10,
    total_fiber: Math.round(sum('fiber') * 10) / 10,
    total_sugar: Math.round(sum('sugar') * 10) / 10,
    total_sodium: Math.round(sum('sodium') * 10) / 10,
    food_count: foods.length,
    food_names: foods.map((f: any) => f.description || 'Unknown food'),
    health_score: analysis?.health_score ?? 5,
    sugar_spike_risk: analysis?.sugar_spike_risk ?? 'moderate',
    blood_sugar_impact: analysis?.blood_sugar_impact ?? '',
    glycemic_index_estimate: analysis?.glycemic_index_estimate ?? 'medium',
    satiety_rating: analysis?.satiety_rating ?? 5,
    satiety_explanation: analysis?.satiety_explanation ?? '',
    fat_loss_context: analysis?.fat_loss_context ?? '',
    meal_timing_advice: analysis?.meal_timing_advice ?? '',
    macro_balance: analysis?.macro_balance ?? '',
    food_synergies: analysis?.food_synergies ?? [],
    recommendations: analysis?.recommendations ?? [],
    overall_verdict: analysis?.overall_verdict ?? '',
  };
}

export async function logFoodImage(imageUri: string, description: string, audioUri?: string): Promise<any> {
  const dateStr = today();
  const ext = imageUri.split('.').pop() || 'jpg';
  const imageFilename = await saveFile(imageUri, 'food', ext);

  let transcription = '';
  if (audioUri) { const t = await aiService.transcribeAudio(audioUri); transcription = t || ''; }

  const combined = description && transcription ? `${description}. ${transcription}` : description || transcription;
  const items = await aiService.analyzeFoodImage(imageUri, combined);
  const mealType = classifyMeal();
  const mealId = await getOrCreateMeal(mealType, dateStr);

  const foodResponses: any[] = [];
  const foodItems = items || [{ name: combined || 'Food', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }, analysis: null }];

  for (const item of foodItems) {
    const n = item.nutrition;
    const food = await db.insert('foods', {
      meal_id: mealId, description: item.name, image_path: imageFilename,
      calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat,
      fiber: n.fiber, sugar: n.sugar, sodium: n.sodium,
      analysis: item.analysis ? JSON.stringify(item.analysis) : null,
      created_at: nowISO(),
    });
    foodResponses.push(foodRowToResponse(food));
  }

  return { foods: foodResponses, meal_type: mealType, transcription: transcription || description };
}

export async function logFoodText(description: string, audioUri?: string, mealTypeOverride?: string): Promise<any> {
  const dateStr = today();
  let transcription = '';
  if (audioUri) { const t = await aiService.transcribeAudio(audioUri); transcription = t || ''; }

  const combined = description && transcription ? `${description}. ${transcription}` : description || transcription;
  if (!combined.trim()) throw new Error('Provide a description or audio recording');

  const items = await aiService.analyzeFoodText(combined);
  const mealType = mealTypeOverride && ['breakfast', 'lunch', 'dinner', 'snack'].includes(mealTypeOverride)
    ? mealTypeOverride : classifyMeal();
  const mealId = await getOrCreateMeal(mealType, dateStr);

  const foodResponses: any[] = [];
  const foodItems = items || [{ name: combined, nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }, analysis: null }];

  for (const item of foodItems) {
    const n = item.nutrition;
    const food = await db.insert('foods', {
      meal_id: mealId, description: item.name, image_path: null,
      calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat,
      fiber: n.fiber, sugar: n.sugar, sodium: n.sodium,
      analysis: item.analysis ? JSON.stringify(item.analysis) : null,
      created_at: nowISO(),
    });
    foodResponses.push(foodRowToResponse(food));
  }

  return { foods: foodResponses, meal_type: mealType, transcription: transcription || combined };
}

export async function relogFood(foodId: number, mealType: string): Promise<any> {
  const allFoods = db.findAll('foods') as any[];
  const allMeals = db.findAll('meals') as any[];
  const mealIds = new Set(allMeals.filter((m: any) => m.user_id === 1).map((m: any) => m.id));
  const original = allFoods.find((f: any) => f.id === foodId && mealIds.has(f.meal_id));
  if (!original) throw new Error('Food not found');

  const mealId = await getOrCreateMeal(mealType, today());
  const food = await db.insert('foods', {
    meal_id: mealId, description: original.description, image_path: original.image_path,
    calories: original.calories, protein: original.protein, carbs: original.carbs,
    fat: original.fat, fiber: original.fiber, sugar: original.sugar, sodium: original.sodium,
    analysis: original.analysis, created_at: nowISO(),
  });
  return { food: foodRowToResponse(food), meal_type: mealType, transcription: original.description || '' };
}

export async function getFood(foodId: number): Promise<any> {
  const food = db.findById('foods', foodId) as any;
  if (!food) throw new Error('Food not found');
  return foodRowToResponse(food);
}

export async function updateFood(foodId: number, updates: any): Promise<any> {
  const food = db.findById('foods', foodId) as any;
  if (!food) throw new Error('Food not found');

  if (updates.recalculate && updates.description) {
    const items = await aiService.analyzeFoodText(updates.description);
    if (items && items.length > 0) {
      const totals: any = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
      for (const item of items) {
        for (const k of Object.keys(totals)) totals[k] += parseFloat(item.nutrition[k]) || 0;
      }
      for (const k of Object.keys(totals)) totals[k] = Math.round(totals[k] * 10) / 10;
      Object.assign(updates, totals);
      if (items[0].analysis) updates.analysis = JSON.stringify(items[0].analysis);
    }
  }
  delete updates.recalculate;

  const allowed = ['description', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'analysis'];
  const patch: any = {};
  for (const k of allowed) { if (k in updates) patch[k] = updates[k]; }

  const updated = await db.update('foods', foodId, patch);
  return foodRowToResponse(updated);
}

export async function moveFood(foodId: number, newMealType: string): Promise<any> {
  const food = db.findById('foods', foodId) as any;
  if (!food) throw new Error('Food not found');
  const meal = db.findById('meals', food.meal_id) as any;
  if (!meal || meal.meal_type === newMealType) return foodRowToResponse(food);

  const newMealId = await getOrCreateMeal(newMealType, meal.date);
  const oldMealId = food.meal_id;
  const updated = await db.update('foods', foodId, { meal_id: newMealId });

  // Cleanup empty meal
  const remaining = db.findWhere('foods', (f: any) => f.meal_id === oldMealId);
  if (remaining.length === 0) await db.remove('meals', oldMealId);

  return foodRowToResponse(updated);
}

export async function deleteFood(foodId: number): Promise<void> {
  const food = db.findById('foods', foodId) as any;
  if (!food) throw new Error('Food not found');
  if (food.image_path) await deleteFile(food.image_path).catch(() => {});
  const mealId = food.meal_id;
  await db.remove('foods', foodId);
  const remaining = db.findWhere('foods', (f: any) => f.meal_id === mealId);
  if (remaining.length === 0) await db.remove('meals', mealId);
}

export async function getRecentFoods(): Promise<any[]> {
  const allFoods = (db.findAll('foods') as any[])
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const seen = new Set<string>();
  const result: any[] = [];
  for (const f of allFoods) {
    const desc = (f.description || '').trim().toLowerCase();
    if (desc && !seen.has(desc)) {
      seen.add(desc);
      result.push(foodRowToResponse(f));
      if (result.length >= 20) break;
    }
  }
  return result;
}
