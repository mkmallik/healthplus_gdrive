import * as db from './sheetsDB';
import * as aiService from './aiService';
import { today, nowISO } from './mealService';

function exRowToResponse(row: any): any {
  let analysis = null, muscleGroups: string[] = [];
  if (row.analysis) { try { analysis = JSON.parse(row.analysis); } catch {} }
  if (row.muscle_groups) { try { muscleGroups = JSON.parse(row.muscle_groups); } catch { muscleGroups = [row.muscle_groups]; } }
  return {
    id: row.id, exercise_type: row.exercise_type, description: row.description,
    duration_minutes: Number(row.duration_minutes) || 0,
    calories_burned: Number(row.calories_burned) || 0,
    intensity: row.intensity || 'moderate',
    muscle_groups: muscleGroups, analysis, date: row.date, created_at: row.created_at,
  };
}

export async function logExerciseText(description: string, audioUri?: string): Promise<any> {
  let transcription = '';
  if (audioUri) { const t = await aiService.transcribeAudio(audioUri); transcription = t || ''; }
  const combined = description && transcription ? `${description}. ${transcription}` : description || transcription;
  if (!combined.trim()) throw new Error('Provide a description or audio');

  const result = await aiService.analyzeExercise(combined);
  const row = await db.insert('exercises', {
    user_id: 1,
    exercise_type: result.exercise_type || 'other',
    description: combined,
    duration_minutes: result.duration_minutes || 30,
    calories_burned: result.calories_burned || 0,
    intensity: result.intensity || 'moderate',
    muscle_groups: JSON.stringify(result.muscle_groups || []),
    analysis: JSON.stringify({
      analysis: result.analysis,
      recovery_advice: result.recovery_advice,
      health_benefits: result.health_benefits,
    }),
    date: today(),
    created_at: nowISO(),
  });

  return exRowToResponse(row);
}

export async function logExercise(description: string, audioUri?: string): Promise<any> {
  return logExerciseText(description, audioUri);
}

export async function getExercisesByDate(dateStr?: string): Promise<any[]> {
  const d = dateStr || today();
  return db.findWhere('exercises', (r: any) => r.user_id === 1 && r.date === d)
    .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
    .map(exRowToResponse);
}

export async function deleteExercise(id: number): Promise<void> {
  const ex = db.findById('exercises', id) as any;
  if (!ex || ex.user_id !== 1) throw new Error('Not found');
  await db.remove('exercises', id);
}

// Auto-log walking when steps >= 5000. Skips if a walking entry already exists today.
// Also marks the Exercise and Log Steps habits done.
export async function autoLogWalking(stepCount: number, dateStr?: string): Promise<void> {
  if (stepCount < 5000) return;
  const d = dateStr || today();
  const existing = db.findFirst('exercises', (r: any) =>
    r.user_id === 1 && r.date === d && (r.exercise_type || '').toLowerCase() === 'walking'
  );
  if (!existing) {
    const durationMinutes = Math.round(stepCount / 100);
    const caloriesBurned = Math.round(stepCount * 0.04);
    await db.insert('exercises', {
      user_id: 1,
      exercise_type: 'walking',
      description: `Walking — ${stepCount.toLocaleString()} steps`,
      duration_minutes: durationMinutes,
      calories_burned: caloriesBurned,
      intensity: stepCount >= 8000 ? 'moderate' : 'light',
      muscle_groups: JSON.stringify(['legs', 'core']),
      analysis: JSON.stringify({ analysis: 'Auto-logged from step count', health_benefits: ['cardiovascular health', 'calorie burn'] }),
      date: d,
      created_at: nowISO(),
    });
  }
  // Mark Exercise habit done (import lazily to avoid circular deps)
  const { markDefaultHabitDone } = await import('./habitService');
  markDefaultHabitDone('Exercise');
}
