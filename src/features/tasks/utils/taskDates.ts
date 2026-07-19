// Local-day helpers for review tasks. All task dates are local YYYY-MM-DD keys
// (same convention as the training history) so a task lands on the user's day.

const pad2 = (value: number): string => String(value).padStart(2, '0');

export const dayKeyOf = (input: number | Date): string => {
  const date = input instanceof Date ? input : new Date(input);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const parseDayKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addDaysToKey = (key: string, days: number): string => {
  const date = parseDayKey(key);
  date.setDate(date.getDate() + days);
  return dayKeyOf(date);
};

export const todayKey = (): string => dayKeyOf(new Date());
