import { DutyEntry, Employee } from '@/types/kitchen-duty';
import { format, addDays } from 'date-fns';

/**
 * Generates ICS content for a single calendar event
 */
function generateIcsEvent(entry: DutyEntry, employee: Employee, organizerEmail: string): string {
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
    `SUMMARY:Küchendienst`,
    `DESCRIPTION:Küchendienst am ${entry.weekday}`,
    `ORGANIZER;CN=Küchendienst Planer:mailto:${organizerEmail}`,
    employee.email ? `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE;CN=${employee.name}:mailto:${employee.email}` : '',
    'END:VEVENT',
  ].filter(line => line !== '');
  
  return lines.join('\r\n');
}

/**
 * Generates a complete ICS file content for multiple events
 */
export function generateIcsFile(entries: DutyEntry[], employees: Employee[], organizerEmail: string = 'kuechendienst@example.com'): string {
  const events = entries
    .filter(entry => entry.employeeId)
    .map(entry => {
      const employee = employees.find(e => e.id === entry.employeeId);
      if (!employee) return null;
      return generateIcsEvent(entry, employee, organizerEmail);
    })
    .filter((event): event is string => event !== null);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Küchendienst//Kitchen Duty Planner//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
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
