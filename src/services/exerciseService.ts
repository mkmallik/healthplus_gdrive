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
