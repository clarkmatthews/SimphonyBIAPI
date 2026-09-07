import type { ScheduleConfig } from './types';

function parseHm(time: string) {
  const [h, m] = time.split(':').map((n) => Number(n));
  return { h: h || 0, m: m || 0 };
}

function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? 0 : parts.hour),
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday] ?? 0,
  };
}

function fromZoned(timeZone: string, year: number, month: number, day: number, hour: number, minute: number) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = zonedParts(new Date(utcGuess), timeZone);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Date(utcGuess + (desired - actual));
}

export function computeNextRun(schedule: ScheduleConfig, timeZone: string, from = new Date()): Date {
  if (schedule.type === 'interval') {
    const minutes = Math.max(15, Number(schedule.everyMinutes) || 15);
    const ms = minutes * 60 * 1000;
    return new Date(Math.ceil((from.getTime() + 1000) / ms) * ms);
  }

  const { h, m } = parseHm(schedule.time);
  for (let add = 0; add <= 14; add++) {
    const probe = new Date(from.getTime() + add * 24 * 60 * 60 * 1000);
    const parts = zonedParts(probe, timeZone);
    const candidate = fromZoned(timeZone, parts.year, parts.month, parts.day, h, m);
    if (candidate <= from) continue;
    if (schedule.type === 'daily') return candidate;
    if (schedule.daysOfWeek.includes(zonedParts(candidate, timeZone).weekday)) return candidate;
  }
  return new Date(from.getTime() + 24 * 60 * 60 * 1000);
}

export function describeSchedule(schedule: ScheduleConfig) {
  if (schedule.type === 'interval') return `Every ${schedule.everyMinutes} min`;
  if (schedule.type === 'daily') return `Daily at ${schedule.time}`;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${schedule.daysOfWeek.map((d) => days[d]).join(', ')} at ${schedule.time}`;
}
