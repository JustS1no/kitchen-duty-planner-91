import { DutyEntry, Employee } from '@/types/kitchen-duty';
import { generateIcsFileForEmployee } from './ics-calendar';

// Type definitions for Electron API
interface MeetingRequestItem {
  date: string;
  subject: string;
  body: string;
  location?: string;
  startLocal: string; // "YYYY-MM-DD HH:mm" (local time)
  endLocal: string;   // "YYYY-MM-DD HH:mm" (local time)
  attendees: string[];
  mirrorToDefault?: boolean;
}

interface MeetingRequestPayload {
  displayOnly: boolean;
  items: MeetingRequestItem[];
}

interface MeetingRequestResult {
  success: boolean;
  results?: { date: string; success: boolean; action?: string; error?: string }[];
  error?: string;
}

interface ElectronAPI {
  openIcsInOutlook: (icsContent: string, fileName: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  openMultipleIcsInOutlook: (files: { icsContent: string; fileName: string }[]) => Promise<{ fileName: string; success: boolean; filePath?: string; error?: string }[]>;
  sendOutlookMeetingRequests: (payload: MeetingRequestPayload) => Promise<MeetingRequestResult>;
  isElectron: () => Promise<boolean>;
  isWindows: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Check if running in Electron environment
 */
export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

/**
 * Check if running in Electron (async version for preload verification)
 */
export async function isElectron(): Promise<boolean> {
  if (!window.electronAPI) return false;
  try {
    return await window.electronAPI.isElectron();
  } catch {
    return false;
  }
}

/**
 * Check if running on Windows (for COM availability)
 */
export async function isWindows(): Promise<boolean> {
  if (!window.electronAPI) return false;
  try {
    return await window.electronAPI.isWindows();
  } catch {
    return false;
  }
}

/**
 * Open a single ICS file directly in Outlook (Electron only)
 */
export async function openIcsInOutlook(
  entry: DutyEntry,
  employee: Employee
): Promise<{ success: boolean; error?: string }> {
  if (!window.electronAPI) {
    return { success: false, error: 'Electron API nicht verfügbar' };
  }

  const icsContent = generateIcsFileForEmployee([entry], employee);
  if (!icsContent) {
    return { success: false, error: 'Keine Termine zum Exportieren' };
  }

  const fileName = `kuechendienst-${employee.name.toLowerCase().replace(/\s+/g, '-')}-${entry.date}.ics`;

  try {
    const result = await window.electronAPI.openIcsInOutlook(icsContent, fileName);
    return result;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Open ICS files for an employee's all duties in Outlook
 */
export async function openEmployeeDutiesInOutlook(
  entries: DutyEntry[],
  employee: Employee
): Promise<{ success: boolean; error?: string }> {
  if (!window.electronAPI) {
    return { success: false, error: 'Electron API nicht verfügbar' };
  }

  const employeeEntries = entries.filter(e => e.employeeId === employee.id);
  if (employeeEntries.length === 0) {
    return { success: false, error: 'Keine Termine für diesen Mitarbeiter' };
  }

  const icsContent = generateIcsFileForEmployee(entries, employee);
  if (!icsContent) {
    return { success: false, error: 'Fehler beim Generieren der ICS-Datei' };
  }

  const fileName = `kuechendienst-${employee.name.toLowerCase().replace(/\s+/g, '-')}.ics`;

  try {
    const result = await window.electronAPI.openIcsInOutlook(icsContent, fileName);
    return result;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Open ICS files for all employees with duties in Outlook (batch)
 */
export async function openAllDutiesInOutlook(
  entries: DutyEntry[],
  employees: Employee[]
): Promise<{ results: { employeeName: string; success: boolean; error?: string }[] }> {
  if (!window.electronAPI) {
    return { results: [{ employeeName: 'System', success: false, error: 'Electron API nicht verfügbar' }] };
  }

  const employeesWithDuties = employees.filter(emp =>
    entries.some(entry => entry.employeeId === emp.id)
  );

  if (employeesWithDuties.length === 0) {
    return { results: [{ employeeName: 'System', success: false, error: 'Keine zugewiesenen Dienste' }] };
  }

  const files = employeesWithDuties
    .map(employee => {
      const icsContent = generateIcsFileForEmployee(entries, employee);
      if (!icsContent) return null;

      return {
        icsContent,
        fileName: `kuechendienst-${employee.name.toLowerCase().replace(/\s+/g, '-')}.ics`,
        employeeName: employee.name,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  try {
    const apiResults = await window.electronAPI.openMultipleIcsInOutlook(
      files.map(f => ({ icsContent: f.icsContent, fileName: f.fileName }))
    );

    return {
      results: apiResults.map((r, i) => ({
        employeeName: files[i]?.employeeName || 'Unbekannt',
        success: r.success,
        error: r.error,
      })),
    };
  } catch (error) {
    return { results: [{ employeeName: 'System', success: false, error: String(error) }] };
  }
}

/**
 * Send Outlook meeting requests for a single employee's duties via COM/OOM
 * This creates real meeting invitations that recipients can accept/decline
 */

function formatYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysYmd(ymd: string, days: number) {
  // Force local date math at midnight local time
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatYmd(d);
}

export async function sendEmployeeDutiesAsOutlookInvites(
  entries: DutyEntry[],
  employee: Employee,
  options: { displayOnly?: boolean } = {}
): Promise<{ success: boolean; error?: string; results?: { date: string; success: boolean; action?: string; error?: string }[] }> {
  if (!window.electronAPI) {
    return { success: false, error: 'Electron API nicht verfügbar' };
  }

  // Check if employee has email
  if (!employee.email) {
    return { success: false, error: `${employee.name} hat keine E-Mail-Adresse hinterlegt.` };
  }

  // Determine if this employee is the current user (Organizer) chosen at app start.
  // Read organizer id from localStorage. Note: our useLocalStorage hook stores values as JSON,
  // so strings are persisted with quotes (e.g. "\"abc\""). We therefore try JSON.parse first.
  const organizerIdRaw = localStorage.getItem("kitchen-duty-organizer-id");
  let organizerId = "";
  if (organizerIdRaw) {
    try {
      const parsed = JSON.parse(organizerIdRaw);
      organizerId = typeof parsed === "string" ? parsed : String(parsed ?? "");
    } catch {
      organizerId = organizerIdRaw;
    }
  }
  organizerId = organizerId.trim();

  const isMine = !!organizerId && organizerId === employee.id;

// Filter entries for this employee
  const employeeEntries = entries.filter(e => e.employeeId === employee.id);
  if (employeeEntries.length === 0) {
    return { success: false, error: 'Keine Termine für diesen Mitarbeiter' };
  }

  // Build meeting request items
  const items: MeetingRequestItem[] = employeeEntries.map(entry => {
    const startLocal = `${entry.date} 00:00`;
    const endLocal = `${addDaysYmd(entry.date, 1)} 00:00`;

    return {
      date: entry.date,
      subject: 'Küchendienst',
      body: `Küchendienst am ${entry.weekday}, ${entry.date}.\n\nDieser Termin wurde automatisch vom Küchendienst-Planer erstellt.`,
      startLocal,
      endLocal,
      attendees: [employee.email],
      mirrorToDefault: isMine,
    };
  });

  const payload: MeetingRequestPayload = {
    displayOnly: options.displayOnly ?? false,
    items,
  };

  try {
    const result = await window.electronAPI.sendOutlookMeetingRequests(payload);
    return result;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Send Outlook meeting requests for all employees with duties via COM/OOM
 */
export async function sendAllDutiesAsOutlookInvites(
  entries: DutyEntry[],
  employees: Employee[],
  options: { displayOnly?: boolean } = {}
): Promise<{ results: { employeeName: string; success: boolean; error?: string }[] }> {
  if (!window.electronAPI) {
    return { results: [{ employeeName: 'System', success: false, error: 'Electron API nicht verfügbar' }] };
  }

  const employeesWithDuties = employees.filter(emp =>
    entries.some(entry => entry.employeeId === emp.id)
  );

  if (employeesWithDuties.length === 0) {
    return { results: [{ employeeName: 'System', success: false, error: 'Keine zugewiesenen Dienste' }] };
  }

  const results: { employeeName: string; success: boolean; error?: string }[] = [];

  for (const employee of employeesWithDuties) {
    if (!employee.email) {
      results.push({
        employeeName: employee.name,
        success: false,
        error: 'Keine E-Mail-Adresse hinterlegt',
      });
      continue;
    }

    const result = await sendEmployeeDutiesAsOutlookInvites(entries, employee, options);
    results.push({
      employeeName: employee.name,
      success: result.success,
      error: result.error,
    });

    // Small delay between employees
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return { results };
}