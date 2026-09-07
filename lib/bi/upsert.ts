import { pool } from '../db';
import type { EndpointDef } from '../types';

export async function upsertRows(endpoint: EndpointDef, rows: Record<string, unknown>[]) {
  if (!rows.length) return 0;

  const hasExtra = endpoint.table !== 'operations_daily_totals' && rows.some((r) => r.extra);
  const columns = [...endpoint.fields.map((f) => f.column), ...(hasExtra ? ['extra'] : [])];
  const updates = columns.filter((c) => !endpoint.uniqueKey.includes(c));
  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    const placeholders = columns.map((col) => {
      const raw = col === 'extra' ? JSON.stringify(row[col] ?? {}) : row[col] ?? null;
      values.push(raw);
      const idx = values.length;
      return col === 'extra' ? `$${idx}::jsonb` : `$${idx}`;
    });
    return `(${placeholders.join(', ')}, now())`;
  });

  const sql = `
    INSERT INTO ${endpoint.table} (${columns.join(', ')}, synced_at)
    VALUES ${tuples.join(',\n')}
    ON CONFLICT (${endpoint.uniqueKey.join(', ')}) DO UPDATE SET
      ${updates.length ? updates.map((c) => `${c} = EXCLUDED.${c}`).join(',\n      ') + ',' : ''}
      synced_at = now()
  `;

  await pool.query(sql, values);
  return rows.length;
}
