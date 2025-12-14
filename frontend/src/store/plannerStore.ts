/**
 * plannerStore.ts - Date-based planner store with task templates
 * 
 * Manages planner data with named tasks that can be added/removed dynamically
 */

export interface TaskTemplate {
  id: string;
  name: string;
  type?: 'binary' | 'count';
  order: number;
  createdAt: string;
  deletedAt?: string;
}

export interface DayData {
  date: string;
  tasks: Record<string, boolean>; // taskId -> completion status
}

export type WeekData = Map<string, DayData>;

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse an ISO date key (YYYY-MM-DD) into a local Date at midnight.
 *
 * Avoids the timezone shift that can happen with `new Date('YYYY-MM-DD')`.
 */
export function parseDateKeyLocal(dateKey: string): Date {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) {
    return new Date(dateKey);
  }

  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  // JS: 0=Sun..6=Sat. Monday-start means we shift by (day+6)%7.
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get array of 7 dates for the week containing the given date
 * Week runs Monday to Sunday
 */
export function getWeekDates(baseDate: Date): Date[] {
  const weekStart = getWeekStart(baseDate);
  const dates: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }

  return dates;
}

/**
 * Format a date range for display
 * e.g., "Dec 15 – Dec 21, 2025"
 */
export function formatWeekRange(dates: Date[]): string {
  if (dates.length === 0) return '';

  const first = dates[0];
  const last = dates[dates.length - 1];

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const firstMonth = monthNames[first.getMonth()];
  const lastMonth = monthNames[last.getMonth()];
  const firstDay = first.getDate();
  const lastDay = last.getDate();
  const year = last.getFullYear();

  if (first.getMonth() === last.getMonth()) {
    return `${firstMonth} ${firstDay} – ${lastDay}, ${year}`;
  }

  return `${firstMonth} ${firstDay} – ${lastMonth} ${lastDay}, ${year}`;
}

/**
 * Format a single date for day header
 * e.g., "Sun 15"
 */
export function formatDayHeader(date: Date): { weekday: string; dayNum: number } {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    weekday: weekdays[date.getDay()],
    dayNum: date.getDate()
  };
}

/**
 * Create default day data with no tasks completed
 */
export function createDefaultDayData(date: Date): DayData {
  return {
    date: formatDateKey(date),
    tasks: {}
  };
}

/**
 * Navigate to previous week
 */
export function getPreviousWeek(currentDate: Date): Date {
  const d = new Date(currentDate);
  d.setDate(d.getDate() - 7);
  return d;
}

/**
 * Navigate to next week
 */
export function getNextWeek(currentDate: Date): Date {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + 7);
  return d;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Filter tasks that are valid for a specific date
 */
export function getTasksForDate(templates: TaskTemplate[], date: Date): TaskTemplate[] {
  const dateKey = formatDateKey(date);

  return templates.filter(task => {
    // Include if created on or before this date
    if (task.createdAt > dateKey) return false;
    // Exclude if deleted before or on this date
    if (task.deletedAt && task.deletedAt <= dateKey) return false;
    return true;
  }).sort((a, b) => a.order - b.order);
}
