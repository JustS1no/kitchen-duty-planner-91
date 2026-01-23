import { useState } from 'react';
import { DutyEntry, Employee } from '@/types/kitchen-duty';
import { 
  generateMailtoDataForEmployees, 
  openMailtoForEmployee, 
  downloadIcsFileForEmployee,
  MailtoData 
} from '@/lib/ics-calendar';
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
  Mail, 
  Download, 
  Check, 
  AlertCircle, 
  Send,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';

interface SendInvitationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: DutyEntry[];
  employees: Employee[];
}

export function SendInvitationsDialog({
  open,
  onOpenChange,
  plan,
  employees,
}: SendInvitationsDialogProps) {
  const [sentStatus, setSentStatus] = useState<Record<string, 'pending' | 'sent' | 'downloaded'>>({});
  
  const mailtoDataList = generateMailtoDataForEmployees(plan, employees);
  const employeesWithoutEmail = employees.filter(emp => 
    !emp.email && plan.some(entry => entry.employeeId === emp.id)
  );

  const handleSendEmail = (data: MailtoData) => {
    // First download the ICS file
    downloadIcsFileForEmployee(data);
    
    // Then open the mailto link
    setTimeout(() => {
      openMailtoForEmployee(data);
      setSentStatus(prev => ({ ...prev, [data.employeeEmail]: 'sent' }));
    }, 500);
  };

  const handleDownloadOnly = (data: MailtoData) => {
    downloadIcsFileForEmployee(data);
    setSentStatus(prev => ({ ...prev, [data.employeeEmail]: 'downloaded' }));
  };

  const handleSendAll = () => {
    mailtoDataList.forEach((data, index) => {
      setTimeout(() => {
        handleSendEmail(data);
      }, index * 1000); // Stagger to avoid overwhelming the email client
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
            <Send className="h-5 w-5 text-primary" />
            Einladungen versenden
          </DialogTitle>
          <DialogDescription>
            Für jeden Mitarbeiter wird eine E-Mail mit der ICS-Datei erstellt. 
            Die ICS-Datei wird automatisch heruntergeladen und kann der E-Mail angehängt werden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning for employees without email */}
          {employeesWithoutEmail.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Fehlende E-Mail-Adressen</p>
                <p className="text-muted-foreground mt-1">
                  {employeesWithoutEmail.map(e => e.name).join(', ')} – 
                  bitte E-Mail-Adressen in der Mitarbeiterverwaltung ergänzen.
                </p>
              </div>
            </div>
          )}

          {/* Employee list */}
          {mailtoDataList.length > 0 ? (
            <>
              <div className="flex justify-end">
                <Button 
                  onClick={handleSendAll}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Alle Mails öffnen
                </Button>
              </div>

              <div className="space-y-3">
                {mailtoDataList.map((data) => {
                  const employee = employees.find(e => e.email === data.employeeEmail);
                  const duties = employee ? getDutyDates(employee.id) : [];
                  const status = sentStatus[data.employeeEmail];

                  return (
                    <div 
                      key={data.employeeEmail}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{data.employeeName}</span>
                          {status === 'sent' && (
                            <Badge variant="secondary" className="gap-1 bg-secondary text-secondary-foreground">
                              <Check className="h-3 w-3" />
                              Mail geöffnet
                            </Badge>
                          )}
                          {status === 'downloaded' && (
                            <Badge variant="secondary" className="gap-1">
                              <Download className="h-3 w-3" />
                              Heruntergeladen
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {data.employeeEmail}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {duties.map((duty, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs gap-1">
                              <Calendar className="h-3 w-3" />
                              {duty.weekday} {duty.date}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadOnly(data)}
                          title="Nur ICS-Datei herunterladen"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSendEmail(data)}
                          className="gap-1"
                        >
                          <Mail className="h-4 w-4" />
                          Mail öffnen
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Keine Mitarbeiter mit E-Mail-Adressen und zugewiesenen Diensten gefunden.</p>
              <p className="text-sm mt-1">
                Bitte E-Mail-Adressen in der Mitarbeiterverwaltung ergänzen.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
