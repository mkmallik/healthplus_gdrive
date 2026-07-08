import * as db from './sheetsDB';
import { today, nowISO } from './mealService';

export async function getSavedMeals(): Promise<any[]> {
  const meals = db.findWhere('saved_meals', (r: any) => r.user_id === 1) as any[];
  return meals.map(m => ({
    ...m,
    items: db.findWhere('saved_meal_items', (i: any) => i.saved_meal_id === m.id),
  })).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function saveMealFromLog(mealId: number, name: string): Promise<any> {
  const foods = db.findWhere('foods', (f: any) => f.meal_id === mealId) as any[];
  if (foods.length === 0) throw new Error('Meal has no foods');

  const meal = await db.insert('saved_meals', { user_id: 1, name, created_at: nowISO(), updated_at: nowISO() });
  for (const f of foods) {
    await db.insert('saved_meal_items', {
      saved_meal_id: (meal as any).id,
      description: f.description, calories: f.calories, protein: f.protein,
      carbs: f.carbs, fat: f.fat, fiber: f.fiber, sugar: f.sugar, sodium: f.sodium,
    });
  }
  return meal;
}

export async function deleteSavedMeal(id: number): Promise<void> {
  const items = db.findWhere('saved_meal_items', (i: any) => i.saved_meal_id === id) as any[];
  for (const item of items) await db.remove('saved_meal_items', item.id);
  await db.remove('saved_meals', id);
}

export async function listSavedMeals(): Promise<any[]> {
  return getSavedMeals();
}

export async function saveMealAsTemplate(mealId: number, name: string): Promise<any> {
  return saveMealFromLog(mealId, name);
}

export async function relogSavedMeal(savedMealId: number, mealType: string, dateStr?: string): Promise<any> {
  const d = dateStr || today();
  const savedMeal = db.findById('saved_meals', savedMealId) as any;
  if (!savedMeal) throw new Error('Saved meal not found');
  const items = db.findWhere('saved_meal_items', (i: any) => i.saved_meal_id === savedMealId) as any[];
  const meal = await db.insert('meals', {
    user_id: 1, meal_type: mealType, date: d,
    description: savedMeal.name, image_url: null, created_at: nowISO(),
  });
  for (const item of items) {
    await db.insert('foods', {
      meal_id: (meal as any).id, description: item.description,
      calories: item.calories, protein: item.protein, carbs: item.carbs,
      fat: item.fat, fiber: item.fiber || 0, sugar: item.sugar || 0, sodium: item.sodium || 0,
      serving_size: null, created_at: nowISO(),
    });
  }
  return meal;
}
