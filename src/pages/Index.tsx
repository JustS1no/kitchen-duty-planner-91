import { useState, useCallback } from 'react';
import { Employee, DutyEntry, LogEntry, WeekConfig } from '@/types/kitchen-duty';
import { generateDutyPlan, shuffleUnlockedEntries, generateId } from '@/lib/kitchen-duty-utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { EmployeeManagement } from '@/components/EmployeeManagement';
import { WeekConfigDialog } from '@/components/WeekConfigDialog';
import { DutyPlanTable } from '@/components/DutyPlanTable';
import { PlanningLog } from '@/components/PlanningLog';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarPlus, Users, ClipboardList, ChefHat } from 'lucide-react';
import { format } from 'date-fns';

const Index = () => {
  const [employees, setEmployees] = useLocalStorage<Employee[]>('kitchen-duty-employees', []);
  const [organizerId, setOrganizerId] = useLocalStorage<string>('kitchen-duty-organizer-id', '');
  const [showOrganizerGate, setShowOrganizerGate] = useState(true);
  const [setupMode, setSetupMode] = useState<'select' | 'new'>('select');
  const [newOrganizerName, setNewOrganizerName] = useState('');
  const [newOrganizerEmail, setNewOrganizerEmail] = useState('');
  const [organizerError, setOrganizerError] = useState<string | null>(null);

  const [logEntries, setLogEntries] = useLocalStorage<LogEntry[]>('kitchen-duty-log', []);
  const [currentPlan, setCurrentPlan] = useState<DutyEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('planning');
  const selectedOrganizer = employees.find(e => e.id === organizerId) || null;

  const continueWithOrganizer = () => {
    setOrganizerError(null);

    if (setupMode === 'new') {
      const name = newOrganizerName.trim();
      const email = newOrganizerEmail.trim();

      if (!name) {
        setOrganizerError('Bitte gib einen Namen ein.');
        return;
      }
      if (email && !email.includes('@')) {
        setOrganizerError('Bitte gib eine gültige E-Mail-Adresse ein (oder lasse das Feld leer).');
        return;
      }

      const id = generateId();
      const newEmp: Employee = {
        id,
        name,
        email: email || null,
        active: true,
        lastDutyDate: null,
      };

      setEmployees([...employees, newEmp]);
      setOrganizerId(id);
      setShowOrganizerGate(false);
      setSetupMode('select');
      setNewOrganizerName('');
      setNewOrganizerEmail('');
      return;
    }

    if (!organizerId) {
      setOrganizerError('Bitte wähle einen Mitarbeiter aus oder lege einen neuen an.');
      return;
    }

    setShowOrganizerGate(false);
  };

  const reopenOrganizerGate = () => {
    setOrganizerError(null);
    setShowOrganizerGate(true);
  };


  const handleConfigConfirm = useCallback((config: WeekConfig) => {
    const plan = generateDutyPlan(config, employees);
    setCurrentPlan(plan);
    setSelectedIds(new Set());
  }, [employees]);

  const handleEmployeeChange = useCallback((entryId: string, employeeId: string) => {
    setCurrentPlan(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      
      const employee = employees.find(e => e.id === employeeId);
      return {
        ...entry,
        employeeId: employeeId === 'none' ? null : employeeId,
        employeeName: employee?.name || '– Nicht zugewiesen –',
      };
    }));
  }, [employees]);

  const handleToggleLock = useCallback((entryIds: string[], lock: boolean) => {
    setCurrentPlan(prev => prev.map(entry =>
      entryIds.includes(entry.id) ? { ...entry, isLocked: lock } : entry
    ));
  }, []);

  const handleShuffle = useCallback(() => {
    setCurrentPlan(prev => shuffleUnlockedEntries(prev, employees));
  }, [employees]);

  const handleConfirm = useCallback(() => {
    const now = new Date().toISOString();
    const newLogEntries: LogEntry[] = currentPlan
      .filter(entry => entry.employeeId)
      .map(entry => ({
        id: generateId(),
        date: entry.date,
        employeeName: entry.employeeName,
        plannedAt: now,
      }));
    
    // Update last duty dates for employees
    const updatedEmployees = employees.map(emp => {
      const duty = currentPlan.find(d => d.employeeId === emp.id);
      if (duty) {
        return { ...emp, lastDutyDate: duty.date };
      }
      return emp;
    });
    
    setEmployees(updatedEmployees);
    setLogEntries(prev => [...prev, ...newLogEntries]);
    setCurrentPlan([]);
    setSelectedIds(new Set());
  }, [currentPlan, employees, setEmployees, setLogEntries]);

  const handleCancel = useCallback(() => {
    setCurrentPlan([]);
    setSelectedIds(new Set());
  }, []);

  const hasActivePlan = currentPlan.length > 0;
  const activeEmployeeCount = employees.filter(e => e.active).length;

  
  if (showOrganizerGate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <ChefHat className="h-6 w-6" /> Hallo!
            </CardTitle>
            <CardDescription>
              Bitte wähle einen bestehenden Mitarbeiter als Planer aus oder lege einen neuen Mitarbeiter an.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Organisator</Label>
              <Select
                value={setupMode === 'new' ? '__new__' : (organizerId || '')}
                onValueChange={(val) => {
                  setOrganizerError(null);
                  if (val === '__new__') {
                    setSetupMode('new');
                    return;
                  }
                  setSetupMode('select');
                  setOrganizerId(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(e => e.active !== false)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}{e.email ? ` (${e.email})` : ''}
                      </SelectItem>
                    ))}
                  <SelectItem value="__new__">Neuer Mitarbeiter…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {setupMode === 'new' && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="new-org-name">Name</Label>
                  <Input
                    id="new-org-name"
                    value={newOrganizerName}
                    onChange={(e) => setNewOrganizerName(e.target.value)}
                    placeholder="z.B. Sina Shirvani"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-org-email">E-Mail</Label>
                  <Input
                    id="new-org-email"
                    type="email"
                    value={newOrganizerEmail}
                    onChange={(e) => setNewOrganizerEmail(e.target.value)}
                    placeholder="z.B. sina@firma.de"
                  />
                </div>
              </div>
            )}

            {organizerError && (
              <p className="text-sm text-destructive">{organizerError}</p>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {selectedOrganizer ? (
                  <>Aktuell ausgewählt: <span className="font-medium text-foreground">{selectedOrganizer.name}</span></>
                ) : (
                  <>Bitte auswählen oder neu anlegen.</>
                )}
              </div>
              <Button onClick={continueWithOrganizer}>
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Küchendienst-Planung</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Wochenweise planen und verwalten
              </p>
            </div>
          </div>
          <div className="flex-1" />
          <Button
            onClick={() => setConfigDialogOpen(true)}
            disabled={activeEmployeeCount === 0}
            className="shadow-md"
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            Neue Woche planen
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container px-4 md:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="planning" className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Planung</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Mitarbeitende</span>
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Log</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="space-y-6">
            {!hasActivePlan && activeEmployeeCount === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Willkommen!</h2>
                  <p className="text-muted-foreground mt-1">
                    Fügen Sie zuerst Mitarbeitende hinzu, um mit der Planung zu beginnen.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('employees')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Mitarbeitende verwalten
                </Button>
              </div>
            )}
            
            {!hasActivePlan && activeEmployeeCount > 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarPlus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Bereit zur Planung</h2>
                  <p className="text-muted-foreground mt-1">
                    {activeEmployeeCount} aktive Mitarbeitende verfügbar
                  </p>
                </div>
                <Button onClick={() => setConfigDialogOpen(true)}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Neue Woche planen
                </Button>
              </div>
            )}

            {hasActivePlan && (
              <DutyPlanTable
                plan={currentPlan}
                employees={employees}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onEmployeeChange={handleEmployeeChange}
                onToggleLock={handleToggleLock}
                onShuffle={handleShuffle}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            )}
          </TabsContent>

          <TabsContent value="employees">
            <EmployeeManagement
              employees={employees}
              onEmployeesChange={setEmployees}
            />
          </TabsContent>

          <TabsContent value="log">
            <PlanningLog entries={logEntries} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Config Dialog */}
      <WeekConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onConfirm={handleConfigConfirm}
      />
    </div>
  );
};

export default Index;
