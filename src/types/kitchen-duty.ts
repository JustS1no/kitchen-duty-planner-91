export interface Employee {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  lastDutyDate: string | null; // ISO date string or null
}

export interface DutyEntry {
  id: string;
  date: string; // ISO date string
  weekday: string; // German weekday name
  employeeId: string | null;
  employeeName: string;
  isLocked: boolean;
}

export interface LogEntry {
  id: string;
  date: string; // ISO date string of the duty
  employeeName: string;
  plannedAt: string; // ISO datetime string
}

export interface WeekConfig {
  startDate: Date;
  days: {
    montag: boolean;
    dienstag: boolean;
    mittwoch: boolean;
    donnerstag: boolean;
    freitag: boolean;
  };
}

export const WEEKDAYS_DE: Record<number, string> = {
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
};

export const WEEKDAY_KEYS = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag'] as const;
