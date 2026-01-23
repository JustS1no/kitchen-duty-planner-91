import { DutyEntry, Employee } from '@/types/kitchen-duty';
import { format, addDays } from 'date-fns';

/**
 * Generates ICS content for a single calendar event
 * Note: ORGANIZER and ATTENDEE are omitted to prevent Exchange path issues
 * when importing locally
 */
function generateIcsEvent(entry: DutyEntry, employee: Employee): string {
  const eventDate = new Date(entry.date);
  const nextDay = addDays(eventDate, 1);
  
  // Format dates for ICS (YYYYMMDD for all-day events)
  const startDate = format(eventDate, 'yyyyMMdd');
  const endDate = format(nextDay, 'yyyyMMdd');
  
  // Generate unique ID for the event
  const uid = `${entry.id}-${Date.now()}@kuechendienst`;
  
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:Küchendienst - ${employee.name}`,
    `DESCRIPTION:Küchendienst am ${entry.weekday}`,
    'END:VEVENT',
  ];
  
  return lines.join('\r\n');
}

/**
 * Generates a complete ICS file content for a single employee's events
 */
export function generateIcsFileForEmployee(entries: DutyEntry[], employee: Employee): string {
  const employeeEntries = entries.filter(entry => entry.employeeId === employee.id);
  
  if (employeeEntries.length === 0) {
    return '';
  }

  const events = employeeEntries.map(entry => generateIcsEvent(entry, employee));

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Küchendienst//Kitchen Duty Planner//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

/**
 * Generates a complete ICS file content for multiple events (all employees)
 */
export function generateIcsFile(entries: DutyEntry[], employees: Employee[]): string {
  const events = entries
    .filter(entry => entry.employeeId)
    .map(entry => {
      const employee = employees.find(e => e.id === entry.employeeId);
      if (!employee) return null;
      return generateIcsEvent(entry, employee);
    })
    .filter((event): event is string => event !== null);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Küchendienst//Kitchen Duty Planner//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

/**
 * Creates a mailto link that opens the email client with an ICS attachment
 * Note: Due to mailto limitations, we can't attach files directly.
 * Instead, we create a data URL that can be copied to clipboard.
 */
export interface MailtoData {
  employeeEmail: string;
  employeeName: string;
  subject: string;
  body: string;
  icsContent: string;
  icsFileName: string;
}

/**
 * Generates mailto data for each employee with their duty assignments
 */
export function generateMailtoDataForEmployees(
  entries: DutyEntry[], 
  employees: Employee[]
): MailtoData[] {
  const result: MailtoData[] = [];
  
  const employeesWithDuties = employees.filter(emp => 
    emp.email && entries.some(entry => entry.employeeId === emp.id)
  );

  for (const employee of employeesWithDuties) {
    const employeeEntries = entries.filter(entry => entry.employeeId === employee.id);
    const icsContent = generateIcsFileForEmployee(entries, employee);
    
    if (!icsContent || !employee.email) continue;

    const dutyDates = employeeEntries
      .map(e => `• ${e.weekday}, ${format(new Date(e.date), 'dd.MM.yyyy')}`)
      .join('\n');

    result.push({
      employeeEmail: employee.email,
      employeeName: employee.name,
      subject: `Küchendienst-Termine`,
      body: `Hallo ${employee.name},\n\nanbei deine Küchendienst-Termine:\n\n${dutyDates}\n\nBitte füge die angehängte ICS-Datei zu deinem Kalender hinzu.\n\nViele Grüße`,
      icsContent,
      icsFileName: `kuechendienst-${employee.name.toLowerCase().replace(/\s+/g, '-')}.ics`,
    });
  }

  return result;
}

/**
 * Opens mailto link for a specific employee
 */
export function openMailtoForEmployee(mailtoData: MailtoData): void {
  const mailtoUrl = `mailto:${encodeURIComponent(mailtoData.employeeEmail)}?subject=${encodeURIComponent(mailtoData.subject)}&body=${encodeURIComponent(mailtoData.body)}`;
  window.open(mailtoUrl, '_blank');
}

/**
 * Downloads an ICS file for a specific employee
 */
export function downloadIcsFileForEmployee(mailtoData: MailtoData): void {
  const blob = new Blob([mailtoData.icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = mailtoData.icsFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Downloads an ICS file with all assigned duty entries
 */
export function downloadIcsFile(entries: DutyEntry[], employees: Employee[]): { success: number; errors: string[] } {
  const errors: string[] = [];
  const assignedEntries = entries.filter(entry => {
    if (!entry.employeeId) {
      return false;
    }
    const employee = employees.find(e => e.id === entry.employeeId);
    if (!employee) {
      errors.push(`${entry.weekday}: Mitarbeiter nicht gefunden`);
      return false;
    }
    return true;
  });

  if (assignedEntries.length === 0) {
    return { success: 0, errors: ['Keine zugewiesenen Dienste gefunden'] };
  }

  const icsContent = generateIcsFile(assignedEntries, employees);
  
  // Create and download the file
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `kuechendienst-${format(new Date(), 'yyyy-MM-dd')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);

  return { success: assignedEntries.length, errors };
}
