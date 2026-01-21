import { useState } from 'react';
import { WeekConfig, WEEKDAY_KEYS } from '@/types/kitchen-duty';
import { getNextMonday, formatDateDE, parseDateDE } from '@/lib/kitchen-duty-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from 'lucide-react';

interface WeekConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: WeekConfig) => void;
}

const WEEKDAY_LABELS: Record<string, string> = {
  montag: 'Montag',
  dienstag: 'Dienstag',
  mittwoch: 'Mittwoch',
  donnerstag: 'Donnerstag',
  freitag: 'Freitag',
};

export function WeekConfigDialog({ open, onOpenChange, onConfirm }: WeekConfigDialogProps) {
  const defaultDate = getNextMonday();
  const [dateInput, setDateInput] = useState(formatDateDE(defaultDate));
  const [days, setDays] = useState({
    montag: true,
    dienstag: true,
    mittwoch: true,
    donnerstag: true,
    freitag: true,
  });
  const [error, setError] = useState('');

  const handleDayToggle = (day: keyof typeof days) => {
    setDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const handleConfirm = () => {
    const parsed = parseDateDE(dateInput);
    if (!parsed) {
      setError('Bitte gültiges Datum eingeben (TT.MM.JJJJ)');
      return;
    }
    
    // Check if at least one day is selected
    if (!Object.values(days).some(Boolean)) {
      setError('Mindestens ein Tag muss ausgewählt sein');
      return;
    }
    
    setError('');
    onConfirm({ startDate: parsed, days });
    onOpenChange(false);
  };

  const selectedCount = Object.values(days).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Woche konfigurieren
          </DialogTitle>
          <DialogDescription>
            Wählen Sie das Startdatum und die zu planenden Wochentage
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Date input */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Startdatum (Montag)</Label>
            <Input
              id="start-date"
              value={dateInput}
              onChange={(e) => {
                setDateInput(e.target.value);
                setError('');
              }}
              placeholder="TT.MM.JJJJ"
              className="font-mono"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Day checkboxes */}
          <div className="space-y-3">
            <Label>Wochentage ({selectedCount} ausgewählt)</Label>
            <div className="grid grid-cols-2 gap-3">
              {WEEKDAY_KEYS.map((day) => (
                <div
                  key={day}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    days[day] 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/50 border-transparent'
                  }`}
                  onClick={() => handleDayToggle(day)}
                >
                  <Checkbox
                    id={day}
                    checked={days[day]}
                    onCheckedChange={() => handleDayToggle(day)}
                  />
                  <Label htmlFor={day} className="cursor-pointer font-medium">
                    {WEEKDAY_LABELS[day]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm}>
            Woche planen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
