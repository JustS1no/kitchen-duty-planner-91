import { DutyEntry, Employee } from '@/types/kitchen-duty';
import { format, addDays } from 'date-fns';

/**
 * Generates an Outlook Web calendar URL for a kitchen duty event
 * Opens the Outlook Web "new event" form with pre-filled data
 */
export function generateOutlookWebUrl(entry: DutyEntry, employee: Employee | undefined): string {
  if (!employee?.email) {
    throw new Error('Mitarbeiter hat keine E-Mail-Adresse hinterlegt');
  }

  const eventDate = new Date(entry.date);
  const nextDay = addDays(eventDate, 1);
  
  // Format dates for Outlook Web (ISO format)
  const startDate = format(eventDate, 'yyyy-MM-dd');
  const endDate = format(nextDay, 'yyyy-MM-dd');
  
  const subject = encodeURIComponent(`Küchendienst - ${employee.name}`);
  const body = encodeURIComponent(`Küchendienst am ${entry.weekday}, ${format(eventDate, 'dd.MM.yyyy')}\n\nZuständig: ${employee.name}`);
  
  // Outlook Web deeplink for creating a new calendar event
  // The attendees parameter adds the employee as required attendee
  const outlookUrl = new URL('https://outlook.office.com/calendar/0/deeplink/compose');
  outlookUrl.searchParams.set('subject', `Küchendienst - ${employee.name}`);
  outlookUrl.searchParams.set('body', `Küchendienst am ${entry.weekday}, ${format(eventDate, 'dd.MM.yyyy')}\n\nZuständig: ${employee.name}`);
  outlookUrl.searchParams.set('startdt', startDate);
  outlookUrl.searchParams.set('enddt', endDate);
  outlookUrl.searchParams.set('allday', 'true');
  outlookUrl.searchParams.set('to', employee.email);
  outlookUrl.searchParams.set('path', '/calendar/action/compose');

  return outlookUrl.toString();
}

/**
 * Opens Outlook Web calendar with pre-filled event data for a single duty entry
 */
export function openOutlookCalendar(entry: DutyEntry, employee: Employee | undefined): void {
  const url = generateOutlookWebUrl(entry, employee);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Opens Outlook Web calendar for multiple duty entries (opens multiple tabs)
 * Returns the count of successfully opened entries and any errors
 */
export function openMultipleOutlookCalendars(
  entries: DutyEntry[], 
  employees: Employee[]
): { success: number; errors: string[] } {
  const errors: string[] = [];
  let success = 0;

  entries.forEach(entry => {
    if (!entry.employeeId) {
      errors.push(`${entry.weekday}: Kein Mitarbeiter zugewiesen`);
      return;
    }

    const employee = employees.find(e => e.id === entry.employeeId);
    
    if (!employee) {
      errors.push(`${entry.weekday}: Mitarbeiter nicht gefunden`);
      return;
    }

    if (!employee.email) {
      errors.push(`${entry.weekday}: ${employee.name} hat keine E-Mail-Adresse`);
      return;
    }

    try {
      openOutlookCalendar(entry, employee);
      success++;
    } catch (error) {
      errors.push(`${entry.weekday}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  });

  return { success, errors };
}
