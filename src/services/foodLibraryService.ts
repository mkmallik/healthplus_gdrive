import * as db from './sheetsDB';
import { nowISO } from './mealService';

export async function searchFoodLibrary(query: string): Promise<any[]> {
  const q = query.toLowerCase().trim();
  return (db.findWhere('food_library', (r: any) =>
    (r.name || '').toLowerCase().includes(q) ||
    (r.aliases || '').toLowerCase().includes(q)
  ) as any[]).slice(0, 20);
}

export async function addToFoodLibrary(data: {
  name: string;
  aliases?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  sodium_per_100g?: number;
  category?: string;
  serving_size_g?: number;
}): Promise<any> {
  // Check for duplicate
  const exists = db.findFirst('food_library', (r: any) =>
    (r.name || '').toLowerCase() === data.name.toLowerCase()
  );
  if (exists) throw new Error(`"${data.name}" already exists in library`);

  return db.insert('food_library', {
    user_id: 1,
    name: data.name,
    aliases: data.aliases || null,
    calories_per_100g: data.calories_per_100g,
    protein_per_100g: data.protein_per_100g,
    carbs_per_100g: data.carbs_per_100g,
    fat_per_100g: data.fat_per_100g,
    fiber_per_100g: data.fiber_per_100g || 0,
    sugar_per_100g: data.sugar_per_100g || 0,
    sodium_per_100g: data.sodium_per_100g || 0,
    category: data.category || 'other',
    serving_size_g: data.serving_size_g || 100,
    created_at: nowISO(),
  });
}

export async function deleteFoodLibraryItem(id: number): Promise<void> {
  await db.remove('food_library', id);
}

export async function getFoodLibraryItem(id: number): Promise<any | null> {
  return db.findById('food_library', id) ?? null;
}

export async function listCategories(): Promise<string[]> {
  const items = db.findWhere('food_library', (r: any) => r.user_id === 1) as any[];
  const cats = new Set(items.map((i: any) => i.category || 'other'));
  return Array.from(cats).sort();
}

export async function listFoodLibrary(optsOrCategory?: { category?: string; query?: string } | string): Promise<any[]> {
  const opts = typeof optsOrCategory === 'string' ? { category: optsOrCategory } : optsOrCategory;
  let items = db.findWhere('food_library', (r: any) => r.user_id === 1) as any[];
  if (opts?.category) items = items.filter((i: any) => i.category === opts.category);
  if (opts?.query) {
    const q = opts.query.toLowerCase();
    items = items.filter((i: any) => (i.name || '').toLowerCase().includes(q));
  }
  return items.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
}

export async function quickLog(itemId: number, gramsOrMealId: number, mealTypeOrGrams?: number | string): Promise<any> {
  const grams = typeof mealTypeOrGrams === 'number' ? mealTypeOrGrams : gramsOrMealId;
  const item = db.findById('food_library', itemId) as any;
  if (!item) throw new Error('Food library item not found');
  const factor = grams / 100;
  return db.insert('foods', {
    meal_id: null, description: `${item.name} (${grams}g)`,
    calories: Math.round((Number(item.calories_per_100g) || 0) * factor),
    protein: Math.round((Number(item.protein_per_100g) || 0) * factor * 10) / 10,
    carbs: Math.round((Number(item.carbs_per_100g) || 0) * factor * 10) / 10,
    fat: Math.round((Number(item.fat_per_100g) || 0) * factor * 10) / 10,
    fiber: Math.round((Number(item.fiber_per_100g) || 0) * factor * 10) / 10,
    sugar: 0, sodium: 0, serving_size: `${grams}g`, created_at: nowISO(),
  });
}
