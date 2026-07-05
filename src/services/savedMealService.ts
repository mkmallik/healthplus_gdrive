import * as db from './sheetsDB';
import { nowISO } from './mealService';

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
