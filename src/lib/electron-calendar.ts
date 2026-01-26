import { DutyEntry, Employee } from '@/types/kitchen-duty';
import { generateIcsFileForEmployee } from './ics-calendar';

// Type definitions for Electron API
interface ElectronAPI {
  openIcsInOutlook: (icsContent: string, fileName: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  openMultipleIcsInOutlook: (files: { icsContent: string; fileName: string }[]) => Promise<{ fileName: string; success: boolean; filePath?: string; error?: string }[]>;
  isElectron: () => Promise<boolean>;
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
