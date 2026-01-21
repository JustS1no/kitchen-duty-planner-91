import { useState, useCallback } from 'react';
import { Employee, DutyEntry, LogEntry, WeekConfig } from '@/types/kitchen-duty';
import { generateDutyPlan, shuffleUnlockedEntries, generateId } from '@/lib/kitchen-duty-utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { EmployeeManagement } from '@/components/EmployeeManagement';
import { WeekConfigDialog } from '@/components/WeekConfigDialog';
import { DutyPlanTable } from '@/components/DutyPlanTable';
import { PlanningLog } from '@/components/PlanningLog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarPlus, Users, ClipboardList, ChefHat } from 'lucide-react';
import { format } from 'date-fns';

const Index = () => {
  const [employees, setEmployees] = useLocalStorage<Employee[]>('kitchen-duty-employees', []);
  const [logEntries, setLogEntries] = useLocalStorage<LogEntry[]>('kitchen-duty-log', []);
  const [currentPlan, setCurrentPlan] = useState<DutyEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('planning');

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
