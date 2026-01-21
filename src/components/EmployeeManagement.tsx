import { useState } from 'react';
import { Employee } from '@/types/kitchen-duty';
import { generateId, formatDateDE, parseDateDE } from '@/lib/kitchen-duty-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeManagementProps {
  employees: Employee[];
  onEmployeesChange: (employees: Employee[]) => void;
}

export function EmployeeManagement({ employees, onEmployeesChange }: EmployeeManagementProps) {
  const [newName, setNewName] = useState('');
  const [newLastDuty, setNewLastDuty] = useState('');

  const handleAddEmployee = () => {
    if (!newName.trim()) return;
    
    const lastDutyDate = parseDateDE(newLastDuty);
    
    const newEmployee: Employee = {
      id: generateId(),
      name: newName.trim(),
      active: true,
      lastDutyDate: lastDutyDate ? format(lastDutyDate, 'yyyy-MM-dd') : null,
    };
    
    onEmployeesChange([...employees, newEmployee]);
    setNewName('');
    setNewLastDuty('');
  };

  const handleToggleActive = (id: string) => {
    onEmployeesChange(
      employees.map(e => (e.id === id ? { ...e, active: !e.active } : e))
    );
  };

  const handleDelete = (id: string) => {
    onEmployeesChange(employees.filter(e => e.id !== id));
  };

  const handleUpdateLastDuty = (id: string, dateStr: string) => {
    const parsed = parseDateDE(dateStr);
    onEmployeesChange(
      employees.map(e =>
        e.id === id
          ? { ...e, lastDutyDate: parsed ? format(parsed, 'yyyy-MM-dd') : null }
          : e
      )
    );
  };

  const activeCount = employees.filter(e => e.active).length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Mitarbeitende verwalten
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {activeCount} aktiv / {employees.length} gesamt
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new employee form */}
        <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-secondary/50">
          <Input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[200px]"
            onKeyDown={(e) => e.key === 'Enter' && handleAddEmployee()}
          />
          <Input
            placeholder="Letzter Dienst (TT.MM.JJJJ)"
            value={newLastDuty}
            onChange={(e) => setNewLastDuty(e.target.value)}
            className="w-[180px]"
          />
          <Button onClick={handleAddEmployee} disabled={!newName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Hinzufügen
          </Button>
        </div>

        {/* Employee table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead className="w-[25%]">Letzter Dienst</TableHead>
                <TableHead className="w-[15%] text-center">Aktiv</TableHead>
                <TableHead className="w-[20%] text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Noch keine Mitarbeitenden angelegt
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow 
                    key={employee.id}
                    className={!employee.active ? 'opacity-50' : ''}
                  >
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={employee.lastDutyDate ? formatDateDE(new Date(employee.lastDutyDate)) : ''}
                          onChange={(e) => handleUpdateLastDuty(employee.id, e.target.value)}
                          placeholder="TT.MM.JJJJ"
                          className="h-8 w-[130px]"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={employee.active}
                        onCheckedChange={() => handleToggleActive(employee.id)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(employee.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
