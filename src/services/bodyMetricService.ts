import * as db from './sheetsDB';
import * as aiService from './aiService';
import { today, nowISO } from './mealService';

export async function logBodyMetricText(description: string): Promise<any[]> {
  const result = await aiService.analyzeBodyMetric(description);
  const metrics = result?.metrics || [];
  const saved: any[] = [];
  const d = today();

  for (const m of metrics) {
    const existing = db.findFirst('body_metrics', (r: any) =>
      r.user_id === 1 && r.metric_type === m.metric_type && r.date === d
    ) as any;
    if (existing) {
      saved.push(await db.update('body_metrics', existing.id, { value: m.value, unit: m.unit, notes: m.notes || null }));
    } else {
      saved.push(await db.insert('body_metrics', {
        user_id: 1, metric_type: m.metric_type, value: m.value,
        unit: m.unit, notes: m.notes || null, date: d, created_at: nowISO(),
      }));
    }
  }
  return saved;
}

export async function logBodyMetricDirect(metricType: string, value: number, unit: string): Promise<any> {
  const d = today();
  const existing = db.findFirst('body_metrics', (r: any) =>
    r.user_id === 1 && r.metric_type === metricType && r.date === d
  ) as any;
  if (existing) {
    return db.update('body_metrics', existing.id, { value, unit });
  }
  return db.insert('body_metrics', { user_id: 1, metric_type: metricType, value, unit, notes: null, date: d, created_at: nowISO() });
}

export async function getBodyMetricsHistory(metricType: string, days: number = 30): Promise<any[]> {
  return (db.findWhere('body_metrics', (r: any) => r.user_id === 1 && r.metric_type === metricType) as any[])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);
}

export async function getLatestMetrics(): Promise<Record<string, any>> {
  const all = db.findWhere('body_metrics', (r: any) => r.user_id === 1) as any[];
  const latest: Record<string, any> = {};
  for (const m of all) {
    if (!latest[m.metric_type] || m.date > latest[m.metric_type].date) {
      latest[m.metric_type] = m;
    }
  }
  return latest;
}
