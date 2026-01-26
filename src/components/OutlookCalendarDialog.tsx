import { useState } from 'react';
import { DutyEntry, Employee } from '@/types/kitchen-duty';
import { isElectronEnvironment, openEmployeeDutiesInOutlook, openAllDutiesInOutlook } from '@/lib/electron-calendar';
import { downloadIcsFileForEmployee, generateMailtoDataForEmployees, MailtoData } from '@/lib/ics-calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Check, 
  AlertCircle, 
  User,
  Loader2,
  Monitor,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface OutlookCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: DutyEntry[];
  employees: Employee[];
}

export function OutlookCalendarDialog({
  open,
  onOpenChange,
  plan,
  employees,
}: OutlookCalendarDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [sentStatus, setSentStatus] = useState<Record<string, 'pending' | 'opened' | 'error'>>({});
  
  const isElectron = isElectronEnvironment();
  const mailtoDataList = generateMailtoDataForEmployees(plan, employees);
  const employeesWithDuties = employees.filter(emp =>
    plan.some(entry => entry.employeeId === emp.id)
  );

  const handleOpenInOutlook = async (employee: Employee) => {
    setLoading(prev => ({ ...prev, [employee.id]: true }));
    
    try {
      const result = await openEmployeeDutiesInOutlook(plan, employee);
      
      if (result.success) {
        setSentStatus(prev => ({ ...prev, [employee.id]: 'opened' }));
        toast({
          title: 'Outlook geöffnet',
          description: `Termine für ${employee.name} wurden in Outlook geöffnet.`,
        });
      } else {
        setSentStatus(prev => ({ ...prev, [employee.id]: 'error' }));
        toast({
          title: 'Fehler',
          description: result.error || 'Unbekannter Fehler',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setSentStatus(prev => ({ ...prev, [employee.id]: 'error' }));
      toast({
        title: 'Fehler',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, [employee.id]: false }));
    }
  };

  const handleOpenAllInOutlook = async () => {
    setLoading(prev => ({ ...prev, all: true }));
    
    try {
      const { results } = await openAllDutiesInOutlook(plan, employees);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      successful.forEach(r => {
        const emp = employees.find(e => e.name === r.employeeName);
        if (emp) {
          setSentStatus(prev => ({ ...prev, [emp.id]: 'opened' }));
        }
      });
      
      failed.forEach(r => {
        const emp = employees.find(e => e.name === r.employeeName);
        if (emp) {
          setSentStatus(prev => ({ ...prev, [emp.id]: 'error' }));
        }
      });
      
      if (failed.length === 0) {
        toast({
          title: 'Alle Termine geöffnet',
          description: `${successful.length} Mitarbeiter-Termine wurden in Outlook geöffnet.`,
        });
      } else {
        toast({
          title: 'Teilweise erfolgreich',
          description: `${successful.length} erfolgreich, ${failed.length} Fehler.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, all: false }));
    }
  };

  const handleFallbackDownload = (data: MailtoData) => {
    downloadIcsFileForEmployee(data);
    toast({
      title: 'ICS heruntergeladen',
      description: `Datei für ${data.employeeName} wurde heruntergeladen. Öffnen Sie diese manuell in Outlook.`,
    });
  };

  const getDutyDates = (employeeId: string) => {
    return plan
      .filter(entry => entry.employeeId === employeeId)
      .map(entry => ({
        weekday: entry.weekday,
        date: format(new Date(entry.date), 'dd.MM.')
      }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            In Outlook-Kalender eintragen
          </DialogTitle>
          <DialogDescription>
            {isElectron ? (
              <>
                Öffnet die Termine direkt in Outlook. Klicken Sie dort auf "Speichern & Schließen".
              </>
            ) : (
              <>
                <span className="flex items-center gap-2 text-warning">
                  <Globe className="h-4 w-4" />
                  Web-Version erkannt – für direktes Öffnen in Outlook nutzen Sie die Desktop-App.
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode indicator */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${isElectron ? 'bg-primary/5 border-primary/20' : 'bg-warning/10 border-warning/20'}`}>
            {isElectron ? (
              <>
                <Monitor className="h-5 w-5 text-primary shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Desktop-App erkannt</p>
                  <p className="text-muted-foreground">Termine werden direkt in Outlook geöffnet.</p>
                </div>
              </>
            ) : (
              <>
                <Globe className="h-5 w-5 text-warning shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Web-Version</p>
                  <p className="text-muted-foreground">ICS-Dateien werden heruntergeladen. Manuell in Outlook öffnen.</p>
                </div>
              </>
            )}
          </div>

          {employeesWithDuties.length > 0 ? (
            <>
              {/* Batch action */}
              {isElectron && (
                <div className="flex justify-end">
                  <Button 
                    onClick={handleOpenAllInOutlook}
                    disabled={loading.all}
                    className="gap-2"
                  >
                    {loading.all ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    Alle in Outlook öffnen
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {employeesWithDuties.map((employee) => {
                  const duties = getDutyDates(employee.id);
                  const status = sentStatus[employee.id];
                  const isLoading = loading[employee.id];
                  const mailtoData = mailtoDataList.find(d => 
                    employees.find(e => e.email === d.employeeEmail)?.id === employee.id
                  );

                  return (
                    <div 
                      key={employee.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{employee.name}</span>
                          {status === 'opened' && (
                            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                              <Check className="h-3 w-3" />
                              Geöffnet
                            </Badge>
                          )}
                          {status === 'error' && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Fehler
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {duties.map((duty, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs gap-1">
                              <Calendar className="h-3 w-3" />
                              {duty.weekday} {duty.date}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="shrink-0">
                        {isElectron ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenInOutlook(employee)}
                            disabled={isLoading}
                            className="gap-1"
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Calendar className="h-4 w-4" />
                            )}
                            In Outlook öffnen
                          </Button>
                        ) : mailtoData ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFallbackDownload(mailtoData)}
                            className="gap-1"
                          >
                            <Calendar className="h-4 w-4" />
                            ICS herunterladen
                          </Button>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Keine E-Mail
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Keine Mitarbeiter mit zugewiesenen Diensten gefunden.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
