import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type AuditLog = {
  id: string;
  organization_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  INSERT:      'bg-green-100 text-green-800',
  UPDATE:      'bg-blue-100 text-blue-800',
  DELETE:      'bg-red-100 text-red-800',
  SOFT_DELETE: 'bg-orange-100 text-orange-800',
  RESTORE:     'bg-purple-100 text-purple-800',
};

const TABLE_LABELS: Record<string, string> = {
  plants: 'Plantas', genetics: 'Genéticas', warehouses: 'Salas',
  installations: 'Locaciones', harvest_materials: 'Materia Vegetal',
  pacientes: 'Pacientes', entregas: 'Entregas',
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const filtered = logs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (tableFilter !== 'all' && log.table_name !== tableFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (log.user_email?.toLowerCase() || '').includes(q) ||
        (log.table_name?.toLowerCase() || '').includes(q) ||
        (log.record_id?.toLowerCase() || '').includes(q)
      );
    }
    return true;
  });

  return (
    <Layout title="Auditoría" subtitle="Registro de todas las acciones en el sistema">
      <div className="space-y-4">

        <div className="card-elevated p-4 flex items-center gap-3 border-l-4 border-l-primary">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Log de Auditoría</p>
            <p className="text-xs text-muted-foreground">{logs.length} acciones registradas</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por usuario, tabla o ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Acción" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              <SelectItem value="INSERT">Insert</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="SOFT_DELETE">Eliminación</SelectItem>
              <SelectItem value="RESTORE">Restauración</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tabla" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las tablas</SelectItem>
              {Object.entries(TABLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Tabla</TableHead>
                <TableHead>ID Registro</TableHead>
                <TableHead>Datos anteriores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay registros</TableCell></TableRow>
              ) : filtered.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell className="text-sm">{log.user_email || '-'}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{TABLE_LABELS[log.table_name] || log.table_name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.record_id?.slice(0, 16) || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.old_data ? JSON.stringify(log.old_data) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
