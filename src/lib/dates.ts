export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dbDayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function startOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function mondayOf(d: Date): Date {
  const monday = startOfLocalDay(d);
  monday.setDate(monday.getDate() - dbDayIndex(d));
  return monday;
}
