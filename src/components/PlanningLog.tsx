import { LogEntry } from '@/types/kitchen-duty';
import { formatDateDE } from '@/lib/kitchen-duty-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PlanningLogProps {
  entries: LogEntry[];
}

export function PlanningLog({ entries }: PlanningLogProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Planungs-Log
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          Noch keine Planungen durchgeführt
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5 text-primary" />
          Planungs-Log
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {entries.length} Einträge
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {entries.slice().reverse().map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.employeeName}</p>
                  <p className="text-sm text-muted-foreground">
                    Küchendienst am {formatDateDE(new Date(entry.date))}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Geplant am</p>
                  <p className="font-mono">
                    {format(new Date(entry.plannedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
