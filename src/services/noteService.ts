import * as db from './sheetsDB';
import { saveFile, deleteFile } from './fileService';
import * as aiService from './aiService';
import { today, nowISO } from './mealService';

export async function getNotes(dateStr?: string): Promise<any[]> {
  const rows = dateStr
    ? db.findWhere('notes', (r: any) => r.user_id === 1 && r.date === dateStr)
    : db.findWhere('notes', (r: any) => r.user_id === 1);
  return (rows as any[]).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function createNote(data: {
  title?: string; content?: string; imageUri?: string; audioUri?: string;
}): Promise<any> {
  let imagePath: string | null = null, audioPath: string | null = null;
  if (data.imageUri) {
    const ext = data.imageUri.split('.').pop() || 'jpg';
    imagePath = await saveFile(data.imageUri, 'note', ext);
  }
  if (data.audioUri) {
    const ext = data.audioUri.split('.').pop() || 'm4a';
    audioPath = await saveFile(data.audioUri, 'note_audio', ext);
  }

  let content = data.content || null;
  if (audioPath && data.audioUri && !content) {
    const t = await aiService.transcribeAudio(data.audioUri);
    if (t) content = await aiService.refineTranscription(t, 'journal note') ?? t;
  }

  return db.insert('notes', {
    user_id: 1, title: data.title || null, content,
    date: today(), audio_path: audioPath, image_path: imagePath,
    created_at: nowISO(), updated_at: nowISO(),
  });
}

export async function updateNote(id: number, data: { title?: string; content?: string }): Promise<any> {
  return db.update('notes', id, { ...data, updated_at: nowISO() });
}

export async function deleteNote(id: number): Promise<void> {
  const note = db.findById('notes', id) as any;
  if (note?.image_path) await deleteFile(note.image_path).catch(() => {});
  if (note?.audio_path) await deleteFile(note.audio_path).catch(() => {});
  await db.remove('notes', id);
}

export async function searchNotes(query: string): Promise<any[]> {
  const q = query.toLowerCase();
  return (db.findWhere('notes', (r: any) =>
    r.user_id === 1 &&
    ((r.title || '').toLowerCase().includes(q) || (r.content || '').toLowerCase().includes(q))
  ) as any[]).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function getNote(id: number): Promise<any | null> {
  return (db.findById('notes', id) as any) ?? null;
}
