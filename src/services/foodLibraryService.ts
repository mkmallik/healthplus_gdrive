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
