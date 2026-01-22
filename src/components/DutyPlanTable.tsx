import { DutyEntry, Employee } from '@/types/kitchen-duty';
import { formatDateDE } from '@/lib/kitchen-duty-utils';
import { downloadIcsFile } from '@/lib/ics-calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, LockOpen, Shuffle, CalendarDays, Save, X, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DutyPlanTableProps {
  plan: DutyEntry[];
  employees: Employee[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEmployeeChange: (entryId: string, employeeId: string) => void;
  onToggleLock: (entryIds: string[], lock: boolean) => void;
  onShuffle: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DutyPlanTable({
  plan,
  employees,
  selectedIds,
  onSelectionChange,
  onEmployeeChange,
  onToggleLock,
  onShuffle,
  onConfirm,
  onCancel,
}: DutyPlanTableProps) {
  const { toast } = useToast();
  const activeEmployees = employees.filter(e => e.active);
  const allSelected = plan.length > 0 && plan.every(e => selectedIds.has(e.id));
  const someSelected = selectedIds.size > 0;
  const lockedCount = plan.filter(e => e.isLocked).length;
  const assignedEntries = plan.filter(e => e.employeeId);

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(plan.map(e => e.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const handleLockSelected = () => {
    onToggleLock(Array.from(selectedIds), true);
    onSelectionChange(new Set());
  };

  const handleUnlockSelected = () => {
    onToggleLock(Array.from(selectedIds), false);
    onSelectionChange(new Set());
  };

  const handleDownloadIcs = () => {
    const { success, errors } = downloadIcsFile(plan, employees);
    
    if (errors.length > 0 && success === 0) {
      toast({
        title: 'Keine Termine',
        description: errors.join(', '),
        variant: 'destructive',
      });
    } else if (errors.length > 0) {
      toast({
        title: 'ICS heruntergeladen',
        description: `${success} Termine exportiert. Hinweise: ${errors.join(', ')}`,
      });
    } else {
      toast({
        title: 'ICS heruntergeladen',
        description: `${success} Kalendertermin${success > 1 ? 'e' : ''} als ICS-Datei exportiert.`,
      });
    }
  };

  if (plan.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Keine Planung vorhanden</p>
          <p className="text-sm mt-1">Klicken Sie auf "Neue Woche planen" um zu beginnen</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5 text-primary" />
          Wochenplanung
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {lockedCount} von {plan.length} fixiert
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-secondary/50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLockSelected}
            disabled={!someSelected}
          >
            <Lock className="h-4 w-4 mr-1" />
            Fixieren ({selectedIds.size})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnlockSelected}
            disabled={!someSelected}
          >
            <LockOpen className="h-4 w-4 mr-1" />
            Freigeben
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShuffle}
          >
            <Shuffle className="h-4 w-4 mr-1" />
            Neu würfeln
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadIcs}
            disabled={assignedEntries.length === 0}
            title="Lädt eine ICS-Datei herunter, die in jeden Kalender importiert werden kann"
          >
            <Download className="h-4 w-4 mr-1" />
            Kalender-Export (.ics)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-1" />
            Abbrechen
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
          >
            <Save className="h-4 w-4 mr-1" />
            Bestätigen
          </Button>
        </div>

        {/* Plan table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[130px]">Datum</TableHead>
                <TableHead className="w-[120px]">Wochentag</TableHead>
                <TableHead>Mitarbeitender</TableHead>
                <TableHead className="w-[80px] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.map((entry) => (
                <TableRow 
                  key={entry.id}
                  className={entry.isLocked ? 'bg-locked/5' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(entry.id)}
                      onCheckedChange={() => handleSelectOne(entry.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatDateDE(new Date(entry.date))}
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.weekday}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={entry.employeeId || 'none'}
                      onValueChange={(value) => onEmployeeChange(entry.id, value)}
                      disabled={entry.isLocked}
                    >
                      <SelectTrigger className={entry.isLocked ? 'opacity-75' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">– Nicht zugewiesen –</SelectItem>
                        {activeEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    {entry.isLocked ? (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-locked/10 text-locked">
                        <Lock className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
                        <LockOpen className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
