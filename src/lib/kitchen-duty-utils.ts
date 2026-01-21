import { Employee, DutyEntry, WEEKDAYS_DE, WeekConfig } from '@/types/kitchen-duty';
import { addDays, startOfWeek, format, parseISO, isValid } from 'date-fns';
import { de } from 'date-fns/locale';

export function getNextMonday(): Date {
  const today = new Date();
  const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
  return nextMonday;
}

export function formatDateDE(date: Date): string {
  return format(date, 'dd.MM.yyyy', { locale: de });
}

export function parseDateDE(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try parsing DD.MM.YYYY format
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(p => parseInt(p, 10));
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month - 1, day);
      if (isValid(date)) return date;
    }
  }
  
  // Try parsing ISO format
  try {
    const date = parseISO(dateStr);
    if (isValid(date)) return date;
  } catch {
    return null;
  }
  
  return null;
}

export function getLastDutyDaysAgo(employee: Employee): number {
  if (!employee.lastDutyDate) return Infinity;
  
  const lastDate = parseDateDE(employee.lastDutyDate) || parseISO(employee.lastDutyDate);
  if (!isValid(lastDate)) return Infinity;
  
  const today = new Date();
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function sortEmployeesByPriority(employees: Employee[]): Employee[] {
  return [...employees]
    .filter(e => e.active)
    .sort((a, b) => getLastDutyDaysAgo(b) - getLastDutyDaysAgo(a));
}

export function generateWeekDates(config: WeekConfig): Date[] {
  const dates: Date[] = [];
  const dayFlags = [
    config.days.montag,
    config.days.dienstag,
    config.days.mittwoch,
    config.days.donnerstag,
    config.days.freitag,
  ];
  
  for (let i = 0; i < 5; i++) {
    if (dayFlags[i]) {
      dates.push(addDays(config.startDate, i));
    }
  }
  
  return dates;
}

export function generateDutyPlan(
  config: WeekConfig,
  employees: Employee[],
  existingPlan: DutyEntry[] = []
): DutyEntry[] {
  const dates = generateWeekDates(config);
  const prioritizedEmployees = sortEmployeesByPriority(employees);
  const usedEmployeeIds = new Set<string>();
  
  // Keep locked entries
  const lockedEntries = existingPlan.filter(e => e.isLocked);
  lockedEntries.forEach(e => usedEmployeeIds.add(e.employeeId || ''));
  
  const plan: DutyEntry[] = [];
  
  for (const date of dates) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const weekdayDE = WEEKDAYS_DE[dayOfWeek] || '';
    
    // Check if there's a locked entry for this date
    const lockedEntry = lockedEntries.find(e => e.date === dateStr);
    if (lockedEntry) {
      plan.push(lockedEntry);
      continue;
    }
    
    // Find next available employee
    const availableEmployee = prioritizedEmployees.find(
      e => !usedEmployeeIds.has(e.id)
    );
    
    if (availableEmployee) {
      usedEmployeeIds.add(availableEmployee.id);
      plan.push({
        id: crypto.randomUUID(),
        date: dateStr,
        weekday: weekdayDE,
        employeeId: availableEmployee.id,
        employeeName: availableEmployee.name,
        isLocked: false,
      });
    } else {
      plan.push({
        id: crypto.randomUUID(),
        date: dateStr,
        weekday: weekdayDE,
        employeeId: null,
        employeeName: '– Nicht zugewiesen –',
        isLocked: false,
      });
    }
  }
  
  return plan.sort((a, b) => a.date.localeCompare(b.date));
}

export function shuffleUnlockedEntries(
  currentPlan: DutyEntry[],
  employees: Employee[]
): DutyEntry[] {
  const lockedEntries = currentPlan.filter(e => e.isLocked);
  const unlockedDates = currentPlan.filter(e => !e.isLocked);
  
  const usedEmployeeIds = new Set(lockedEntries.map(e => e.employeeId).filter(Boolean));
  
  // Get available employees and shuffle them
  const availableEmployees = employees
    .filter(e => e.active && !usedEmployeeIds.has(e.id))
    .sort(() => Math.random() - 0.5);
  
  let employeeIndex = 0;
  const newUnlocked = unlockedDates.map(entry => {
    if (employeeIndex < availableEmployees.length) {
      const employee = availableEmployees[employeeIndex++];
      return {
        ...entry,
        employeeId: employee.id,
        employeeName: employee.name,
      };
    }
    return {
      ...entry,
      employeeId: null,
      employeeName: '– Nicht zugewiesen –',
    };
  });
  
  return [...lockedEntries, ...newUnlocked].sort((a, b) => a.date.localeCompare(b.date));
}

export function generateId(): string {
  return crypto.randomUUID();
}
