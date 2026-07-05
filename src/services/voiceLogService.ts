import * as aiService from './aiService';
import * as mealService from './mealService';
import * as exerciseService from './exerciseService';
import * as stepService from './stepService';
import * as bodyMetricService from './bodyMetricService';
import * as habitService from './habitService';
import * as noteService from './noteService';
import * as reminderService from './reminderService';
import * as todoService from './todoService';
import * as db from './sheetsDB';

export type VoiceCategory =
  | 'food' | 'exercise' | 'steps' | 'body_metric'
  | 'habit_log' | 'todo' | 'note' | 'reminder';

export interface VoiceResult {
  category: VoiceCategory;
  content: string;
  data: any;
  transcription: string;
}

export async function processVoiceLog(audioUri: string): Promise<VoiceResult> {
  // Transcribe
  const transcription = await aiService.transcribeAudio(audioUri);
  if (!transcription) throw new Error('Could not transcribe audio');

  // Get context for classification
  const habits = (db.findWhere('habits', (r: any) =>
    r.user_id === 1 && Number(r.is_active) === 1 && r.habit_type === 'descriptive'
  ) as any[]).map((h: any) => ({ id: h.id, name: h.name }));

  const todoHabits = (db.findWhere('habits', (r: any) =>
    r.user_id === 1 && Number(r.is_active) === 1 && r.habit_type === 'todo'
  ) as any[]).map((h: any) => ({ id: h.id, name: h.name }));

  const classified = await aiService.classifyVoiceInput(transcription, habits, todoHabits);
  const category: VoiceCategory = classified.category || 'note';

  let data: any = null;

  switch (category) {
    case 'food':
      data = await mealService.logFoodText(classified.content || transcription);
      break;

    case 'exercise':
      data = await exerciseService.logExerciseText(classified.content || transcription);
      break;

    case 'steps': {
      const match = (classified.content || transcription).match(/\d+/);
      if (match) data = await stepService.logStepsManual(parseInt(match[0]));
      break;
    }

    case 'body_metric':
      data = await bodyMetricService.logBodyMetricText(classified.content || transcription);
      break;

    case 'habit_log':
      if (classified.habit_id) {
        data = await habitService.logHabit(classified.habit_id, classified.content || transcription);
      }
      break;

    case 'todo':
      if (classified.todo_habit_id) {
        data = await todoService.addTodo(classified.todo_habit_id, classified.content || transcription);
      }
      break;

    case 'reminder':
      if (classified.reminder_time && classified.reminder_text) {
        data = await reminderService.createReminder({
          text: classified.reminder_text,
          reminder_time: classified.reminder_time,
          recurrence: classified.recurrence || 'onetime',
          generateAudio: true,
        });
      }
      break;

    case 'note':
    default:
      data = await noteService.createNote({ content: classified.content || transcription });
      break;
  }

  return { category, content: classified.content || transcription, data, transcription };
}
