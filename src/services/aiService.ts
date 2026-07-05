import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const API_KEY_STORE = 'openai_api_key';

// Shared calorie reference data
const INDIAN_FOOD_REFS = `INDIAN FOOD CALORIE REFERENCES (standard home-cooked portions):
Breads: chapati/roti(1, ~35g)=70-80, tandoori roti(1, ~50g)=120, plain paratha(1, ~60g)=150-180, stuffed paratha/aloo paratha(1, ~80g)=200-250, methi paratha(1, ~70g)=180, plain naan(1, ~80g)=260, butter naan(1, ~80g)=260, garlic naan(1, ~90g)=280, puri(1)=100-120, bhatura(1, ~120g)=300, kulcha(1)=200-250, roomali roti(1)=90-100, thepla(1, ~50g)=130, makki roti(1)=110-130
Rice (1 cup = ~200g cooked): plain rice=200-240, veg pulao(1 cup, ~200g)=280, jeera rice(1 cup, ~180g)=240, curd rice(1 cup, ~220g)=260, lemon rice(1 cup, ~200g)=280, tamarind rice(1 cup, ~200g)=300, khichdi(1 cup, ~220g)=220, veg biryani(1 cup, ~200g)=290, paneer biryani(1 cup, ~220g)=350, chicken biryani(1 serving plate, ~300-350g)=400-500, mutton biryani(1 cup, ~220g)=360
Dals & Curries (1 cup = ~200g): dal tadka(1 cup)=220, dal makhani(1 cup)=300, kadhi(1 cup)=180, rajma(1 cup)=180, chole/chana masala(1 cup)=180, veg korma(1 cup)=250, malai kofta(1 cup)=350, baingan bharta(1 cup, ~180g)=150, bhindi fry(1 cup, ~180g)=220, cabbage sabzi(1 cup, ~180g)=110, aloo matar(1 cup)=150, sambar(1 cup)=100, paneer butter masala(1 cup)=300, palak paneer(1 cup)=250, shahi paneer(1 cup)=320, chicken curry(1 cup)=220, butter chicken(1 cup)=300, mutton curry(1 cup)=350, fish curry(1 cup)=200, prawn curry(1 cup, ~180g)=240, egg curry(2 eggs)=250-300
Paneer & Tofu: paneer tikka(6 pcs, ~150g)=300, paneer bhurji(1 cup, ~180g)=320, tofu stir fry(1 cup, ~180g)=220
Non-veg: chicken tandoori(1 leg, ~150g)=220, chicken tikka(6 pcs, ~150g)=250, chicken keema(1 cup, ~180g)=280, fish fry(1 pc, ~120g)=220
Eggs: omelette(2 eggs, ~120g)=180, egg bhurji(1 cup, ~150g)=200, boiled eggs(2, ~100g)=140
South Indian: plain dosa(1, ~80g)=120-150, masala dosa(1, ~150g)=250-300, rava dosa(1, ~120g)=220, 1 idli(~40g)=40-50, medu vada(1)=130-150, uttapam(1)=200-250, appam(1, ~80g)=120, pesarattu(1)=150-180, pongal(1 cup, ~200g)=250, coconut chutney(2 tbsp)=30-40
Breakfast: sabudana khichdi(1 cup, ~200g)=300, besan chilla(2 pcs, ~150g)=250, plate poha(~200g)=250-300, plate upma(~200g)=200-250
Street food: pav bhaji(1 plate, ~350g)=400, vada pav(1, ~150g)=300, samosa(1, ~80-100g)=250-300, kachori(1)=200-250, pakora/bhaji(1 pc)=40-60, pani puri(6 pcs, ~150g)=180, dahi puri(6 pcs, ~200g)=300, bhel puri(1 plate, ~150g)=220, sev puri(6 pcs, ~180g)=320, aloo tikki(2 pcs, ~150g)=300, bread pakora(1, ~150g)=300, mirchi bhaji(1, ~100g)=180, dhokla(2 pcs)=120-150
Sweets: gulab jamun(1, ~50g)=150-180, rasgulla(1)=120-150, barfi/burfi(1 pc, ~40g)=170, peda(1, ~35g)=150, ladoo(1)=150-200, jalebi(2 pcs, ~60g)=250, rasmalai(1 pc, ~80g)=200, kulfi(1 stick, ~90g)=180, kheer/payasam(1 cup)=200-250, halwa(1 cup)=250-350, gajar halwa(1 cup)=250-300, falooda(1 glass, ~300g)=350
Beverages: chai/milk tea(1 cup, ~150ml)=50-60, masala chai(1 cup, ~150ml)=50-60, black tea(1 cup)=5, filter coffee(1 cup, ~150ml)=90, black coffee=5, sweet lassi(1 glass, ~250ml)=220, salted lassi(1 glass, ~250ml)=150, mango lassi(1 glass, ~300ml)=300, chaas/buttermilk(1 glass)=40-60, coconut water(1 glass, ~250ml)=45, sugarcane juice(1 glass, ~250ml)=180, fresh lime soda sweet(1 glass)=120, nimbu pani(sugar)=40-60
Accompaniments: raita(1 katori)=50-70, pickle(1 tbsp)=15-30, roasted papad(1)=40-50, fried papad(1)=80-100, curd/dahi(1 cup, ~200g)=60-80, ghee(1 tsp)=45, ghee(1 tbsp)=120
Dry snacks: roasted peanuts(1 handful, ~30g)=170, roasted chana(1 handful, ~30g)=120, murukku(1 pc, ~25g)=130
Biscuits: monaco biscuit(1 pc, ~3g)=16, parle-g(1 biscuit, ~5g)=25, marie gold(1, ~6g)=27, good day(1, ~6g)=30, oreo(1)=53, hide&seek(1, ~6g)=30`;

const COMMON_FOOD_REFS = `COMMON REFERENCES:
Eggs: 1 large egg=72, 2 boiled eggs(~100g)=140, 2 egg omelette(~120g)=180, egg bhurji(1 cup)=200
Other: 1 slice toast/bread(~30g)=75, 1 pat butter(~5g)=36, 1 banana=105, 1 chicken breast(~150g)=230-250, 1 apple=95, 1 glass whole milk(250ml)=150, 1 tbsp oil=120, ice cream vanilla(1 scoop, ~70g)=140, maggi noodles(1 pack)=300-350

CRITICAL RULE — NO DOUBLE-COUNTING: When the user lists ingredients separately (e.g. 'eggs + butter + toast'), count each at BASE value and sum. Do NOT add hidden cooking fat/oil to an item if the user already listed butter/oil/ghee as a separate ingredient. Example: '2 scrambled eggs + toast + butter' = 150 + 75 + 36 = ~261 kcal.`;

export const API_KEY_MISSING_ERROR = 'API_KEY_NOT_CONFIGURED';

export class ApiKeyMissingError extends Error {
  constructor() {
    super('OpenAI API key is not configured. Go to Settings → API Key to add one.');
    this.name = API_KEY_MISSING_ERROR;
  }
}

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(API_KEY_STORE);
  } catch {
    return null;
  }
}

async function requireApiKey(): Promise<string> {
  const key = await getApiKey();
  if (!key) throw new ApiKeyMissingError();
  return key;
}

export async function setApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_STORE, key);
}

export async function removeApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_STORE);
}

export async function testApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function hasApiKey(): Promise<boolean> {
  return getApiKey().then(k => !!k);
}

function extractJson(text: string): any {
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const start = text.indexOf('{');
  if (start === -1) return {};
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.substring(start, i + 1)); }
        catch { return {}; }
      }
    }
  }
  return {};
}

function extractJsonArray(text: string): any[] {
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const start = text.indexOf('[');
  if (start === -1) {
    const obj = extractJson(text);
    if (obj.items && Array.isArray(obj.items)) return obj.items;
    return [];
  }
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.substring(start, i + 1)); }
        catch { return []; }
      }
    }
  }
  return [];
}

async function chatCompletion(apiKey: string, messages: any[], maxTokens: number = 2000, model: string = 'gpt-4o', temperature?: number): Promise<string> {
  const body: any = { model, messages, max_tokens: maxTokens };
  if (temperature !== undefined) body.temperature = temperature;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export async function transcribeAudio(audioUri: string): Promise<string | null> {
  const apiKey = await requireApiKey();

  const formData = new FormData();
  const ext = audioUri.split('.').pop() || 'm4a';
  formData.append('file', {
    uri: audioUri,
    name: `audio.${ext}`,
    type: `audio/${ext === 'm4a' ? 'mp4' : ext}`,
  } as any);
  formData.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.text;
}

export async function refineTranscription(rawText: string, context: string = 'journal entry'): Promise<string | null> {
  const apiKey = await requireApiKey();

  const content = await chatCompletion(apiKey, [
    {
      role: 'system',
      content: `You are a writing assistant. The user has dictated a ${context} via voice. Clean up the raw transcription into well-written, natural prose. Fix grammar, punctuation, and sentence structure. Preserve the original meaning and all details exactly — do not add or remove information. Keep the same tone and person (first person if they used it). Return ONLY the refined text, nothing else.`,
    },
    { role: 'user', content: rawText },
  ], 1000, 'gpt-4o-mini', 0.3);
  return content || rawText;
}

export async function analyzeFoodText(description: string): Promise<any[] | null> {
  const apiKey = await requireApiKey();

  const content = await chatCompletion(apiKey, [
    {
      role: 'system',
      content: `You are a professional dietitian specializing in Indian and global cuisines. When analyzing food descriptions, use USDA/IFCT standard reference portions unless the user specifies a portion size. 1 katori = ~150ml small bowl.\nIMPORTANT: Return EACH food item SEPARATELY with its own nutrition.\n\n${INDIAN_FOOD_REFS}\n\n${COMMON_FOOD_REFS}\n\nDo NOT overestimate. Aim for accuracy over caution. Round calories to nearest 5 kcal.`,
    },
    {
      role: 'user',
      content: `Analyze this food description: "${description}"\n\nSplit into INDIVIDUAL food items and return a JSON ARRAY. Each element must be an object with:\n- "name": string (the food item name with portion, e.g. "2 Rotis (~70g)")\n- "nutrition": object with keys: calories (kcal), protein (g), carbs (g), fat (g), fiber (g), sugar (g), sodium (mg)\n- "analysis": object with keys: food_items, health_score, sugar_spike_risk, healthy_items, unhealthy_items, recommendations, blood_sugar_impact, glycemic_index_estimate, satiety_rating, satiety_explanation, fat_loss_context, meal_timing_advice\n\nIMPORTANT: If the description mentions multiple items, return one object per item. If only one item, return an array with one object.\n\nReturn ONLY the JSON array, no other text.`,
    },
  ], 3000);

  const items = extractJsonArray(content);
  return normalizeItems(items, description);
}

export async function analyzeFoodImage(imageUri: string, description: string): Promise<any[] | null> {
  const apiKey = await requireApiKey();

  const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
  const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
  const mimeType = `image/${mimeMap[ext] || 'jpeg'}`;

  const descLine = description ? `The user describes it as: '${description}'. ` : '';

  const content = await chatCompletion(apiKey, [
    {
      role: 'system',
      content: `You are a professional dietitian and food portion estimator specializing in Indian and global cuisines. When analyzing food images, estimate the ACTUAL visible portion size.\n- Standard dinner plate is ~25cm (10 inches), Indian thali plate ~30cm\n- 1 katori (small bowl) = ~150ml, standard glass = ~250ml\nIMPORTANT: Return EACH food item SEPARATELY with its own nutrition.\n\n${INDIAN_FOOD_REFS}\n\n${COMMON_FOOD_REFS}\n\nDo NOT overestimate. Round calories to nearest 5 kcal.`,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this food image. ${descLine}Split into INDIVIDUAL food items and return a JSON ARRAY. Each element must be an object with:\n"name": string, "nutrition": {calories, protein, carbs, fat, fiber, sugar, sodium}, "analysis": {food_items, health_score, sugar_spike_risk, healthy_items, unhealthy_items, recommendations, blood_sugar_impact, glycemic_index_estimate, satiety_rating, satiety_explanation, fat_loss_context, meal_timing_advice}\n\nReturn ONLY the JSON array, no other text.`,
        },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
      ],
    },
  ], 3000);

  const items = extractJsonArray(content);
  return normalizeItems(items, description || 'Food from image');
}

function normalizeItems(items: any[], fallbackName: string): any[] {
  const result: any[] = [];
  for (const item of items) {
    if (typeof item !== 'object' || !item) continue;
    const name = item.name || 'Unknown food';
    const nutritionRaw = item.nutrition || {};
    const nutrition: Record<string, number> = {};
    for (const k of ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium']) {
      nutrition[k] = parseFloat(nutritionRaw[k]) || 0;
    }
    const analysis = item.analysis || null;
    result.push({ name, nutrition, analysis });
  }
  if (result.length === 0) {
    result.push({ name: fallbackName.substring(0, 80), nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }, analysis: null });
  }
  return result;
}

export async function analyzeExercise(description: string): Promise<any | null> {
  const apiKey = await requireApiKey();

  const content = await chatCompletion(apiKey, [
    {
      role: 'system',
      content: `You are a certified fitness trainer and exercise physiologist. Analyze exercise descriptions and estimate calories burned using MET values.\n\nReference MET values:\n- Walking (3.5 mph): 3.5 MET\n- Brisk walking (4.0 mph): 4.3 MET\n- Running (6 mph): 9.8 MET\n- Running (8 mph): 13.5 MET\n- Badminton (doubles): 5.0 MET\n- Badminton (singles, competitive): 7.0 MET\n- Weight training (general): 3.5 MET\n- Weight training (vigorous): 6.0 MET\n- Cycling (moderate): 6.8 MET\n- Swimming (moderate): 5.8 MET\n- Yoga: 2.5 MET\n\nFormula: Calories = MET x weight_kg x duration_hours\nAssume 70kg body weight unless specified. If duration is not stated, make a reasonable estimate based on typical sessions.`,
    },
    {
      role: 'user',
      content: `Analyze this exercise description: "${description}"\n\nReturn ONLY a JSON object with these keys:\n- "exercise_type": string (e.g. "badminton", "walking", "weight_training", "running", "cycling", "swimming", "yoga", "other")\n- "duration_minutes": number\n- "calories_burned": number\n- "intensity": one of "low", "moderate", "high", "vigorous"\n- "muscle_groups": list of strings\n- "analysis": 2-3 sentence summary\n- "recovery_advice": 1-2 sentence recovery tip\n- "health_benefits": list of 3-5 short health benefit strings\n\nReturn ONLY the JSON object, no other text.`,
    },
  ], 1000);

  const result = extractJson(content);
  result.exercise_type = result.exercise_type || 'other';
  result.duration_minutes = result.duration_minutes || 30;
  result.calories_burned = result.calories_burned || 150;
  result.intensity = result.intensity || 'moderate';
  result.muscle_groups = result.muscle_groups || [];
  result.analysis = result.analysis || '';
  result.recovery_advice = result.recovery_advice || '';
  result.health_benefits = result.health_benefits || [];
  return result;
}

export async function analyzeBodyMetric(description: string): Promise<any | null> {
  const apiKey = await requireApiKey();

  const content = await chatCompletion(apiKey, [
    {
      role: 'system',
      content: 'You extract body measurement data from natural language. Default units: kg for weight, cm for waist. A single description can contain multiple metrics (e.g. weight AND waist).',
    },
    {
      role: 'user',
      content: `Extract body metrics from: "${description}"\n\nReturn ONLY a JSON object with this key:\n- "metrics": a list of objects, each with:\n    - "metric_type": one of "weight", "waist", "biceps"\n    - "value": number\n    - "unit": string (kg, lbs, cm, inches)\n    - "notes": any extra context\n\nReturn ONLY the JSON object, no other text.`,
    },
  ], 500);

  const result = extractJson(content);
  result.metrics = result.metrics || [];
  return result;
}

export async function analyzeWatchImage(imageUri: string): Promise<any | null> {
  const apiKey = await requireApiKey();

  const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
  const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp' };
  const mimeType = `image/${mimeMap[ext] || 'jpeg'}`;

  const content = await chatCompletion(apiKey, [
    {
      role: 'system',
      content: 'You are an expert at reading fitness tracker and smartwatch displays. Extract the step count and any other visible metrics from the display.',
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Read this fitness tracker / smartwatch display and extract data.\n\nReturn ONLY a JSON object with these keys:\n- "step_count": integer\n- "confidence": one of "high", "medium", "low"\n- "heart_rate": integer or null\n- "calories": integer or null\n- "distance_km": float or null\n- "raw_text": string\n\nReturn ONLY the JSON object, no other text.',
        },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    },
  ], 500);

  const result = extractJson(content);
  result.step_count = result.step_count || 0;
  return result;
}

export async function analyzeMeal(foods: any[]): Promise<any | null> {
  const apiKey = await requireApiKey();

  const foodSummary = foods.map(f =>
    `- ${f.description} (${f.calories} kcal, P:${f.protein}g, C:${f.carbs}g, F:${f.fat}g, Fiber:${f.fiber}g, Sugar:${f.sugar}g, Sodium:${f.sodium}mg)`
  ).join('\n');
  const totalCal = foods.reduce((s, f) => s + f.calories, 0);
  const totalProtein = foods.reduce((s, f) => s + f.protein, 0);
  const totalCarbs = foods.reduce((s, f) => s + f.carbs, 0);
  const totalFat = foods.reduce((s, f) => s + f.fat, 0);

  const content = await chatCompletion(apiKey, [
    {
      role: 'user',
      content: `Analyze this COMPLETE MEAL as a whole.\n\nFoods in this meal:\n${foodSummary}\n\nMeal totals: ${totalCal.toFixed(0)} kcal, ${totalProtein.toFixed(0)}g protein, ${totalCarbs.toFixed(0)}g carbs, ${totalFat.toFixed(0)}g fat\n\nReturn ONLY a JSON object with these keys:\n- "health_score": integer 1-10\n- "sugar_spike_risk": one of "low", "moderate", "high"\n- "blood_sugar_impact": 2-3 sentences\n- "glycemic_index_estimate": one of "low", "medium", "high"\n- "satiety_rating": integer 1-10\n- "satiety_explanation": 2-3 sentences\n- "fat_loss_context": 2-3 sentences\n- "meal_timing_advice": 2-3 sentences\n- "macro_balance": 1-2 sentences\n- "food_synergies": list of strings\n- "recommendations": list of 3-5 strings\n- "overall_verdict": 2-3 sentences\n\nReturn ONLY the JSON object, no other text.`,
    },
  ], 1500);

  const result = extractJson(content);
  result.health_score = result.health_score || 5;
  result.sugar_spike_risk = result.sugar_spike_risk || 'moderate';
  return result;
}

export async function describeHabitImage(imageUri: string, habitName: string): Promise<string | null> {
  const apiKey = await requireApiKey();

  const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
  const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = `image/${ext === 'png' ? 'png' : 'jpeg'}`;

  const content = await chatCompletion(apiKey, [
    {
      role: 'system',
      content: `The user is logging their daily habit: '${habitName}'. They uploaded an image as evidence or a note for what they did. Write a brief 1-2 sentence summary of what the image shows, in the context of this habit. Be concise and descriptive.`,
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: `Describe what I did for my '${habitName}' habit today.` },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    },
  ], 200);
  return content;
}

export async function classifyVoiceInput(transcription: string, habits: { id: number; name: string }[], todoHabits: { id: number; name: string }[]): Promise<any | null> {
  const apiKey = await requireApiKey();

  const habitNames = habits.map(h => `"${h.name}" (id=${h.id})`).join(', ');
  const todoNames = todoHabits.map(h => `"${h.name}" (id=${h.id})`).join(', ');

  const content = await chatCompletion(apiKey, [
    {
      role: 'system',
      content: `You are an intelligent voice command classifier for a health tracking app. The user speaks a voice command. Classify it into one of these categories:\n\n1. 'food' — logging food/meals eaten\n2. 'exercise' — logging exercise/workout done\n3. 'steps' — updating step count\n4. 'body_metric' — logging weight/waist/biceps measurement\n5. 'habit_log' — logging a descriptive habit ONLY if it matches one of the available descriptive habits\n6. 'todo' — adding a task/to-do item. Keywords: 'add todo', 'add task', 'need to', 'have to', 'buy', 'call', 'schedule', etc.\n7. 'note' — adding a personal note, thought, observation, or journal entry\n8. 'reminder' — setting a reminder with a SPECIFIC TIME mentioned. MUST have a time.\n\nAvailable descriptive habits: [${habitNames}]\nAvailable todo habits: [${todoNames}]\n\nReturn ONLY a JSON object with:\n- "category": one of the above\n- "content": the relevant content extracted\n- "habit_id": integer habit ID if habit_log, or null\n- "habit_name": matched habit name if applicable, or null\n- "reminder_time": time string in HH:MM (24h) if reminder, or null\n- "reminder_text": the reminder message if reminder, or null\n- "recurrence": one of "onetime", "daily", "weekly", "biweekly", "monthly" if reminder, or null\n- "todo_habit_id": integer todo habit ID if todo, or null\n\nReturn ONLY the JSON object.`,
    },
    { role: 'user', content: transcription },
  ], 500, 'gpt-4o', 0.2);

  const result = extractJson(content);
  result.category = result.category || 'note';
  result.content = result.content || transcription;
  return result;
}

export async function generateTts(text: string): Promise<string | null> {
  const apiKey = await requireApiKey();

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'tts-1', voice: 'alloy', input: text }),
    });
    if (!res.ok) return null;

    const blob = await res.blob();
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });

    const filename = `reminder_${Date.now()}.mp3`;
    const path = FileSystem.documentDirectory + 'healthplus_files/' + filename;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    return filename;
  } catch {
    return null;
  }
}
