import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Scissors, ArrowRight, RefreshCw, HeartPulse, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const activityConfig: Record<string, {
  icon: React.ElementType;
  label: string;
  bgClass: string;
  iconClass: string;
  borderClass: string;
}> = {
  esquejado: {
    icon: Scissors,
    label: 'Esquejado',
    bgClass: 'bg-blue-100',
    iconClass: 'text-blue-700',
    borderClass: 'border-l-blue-500',
  },
  movimiento: {
    icon: ArrowRight,
    label: 'Movimiento',
    bgClass: 'bg-sky-100',
    iconClass: 'text-sky-700',
    borderClass: 'border-l-sky-500',
  },
  trasplante: {
    icon: ArrowRight,
    label: 'Trasplante',
    bgClass: 'bg-sky-100',
    iconClass: 'text-sky-700',
    borderClass: 'border-l-sky-500',
  },
  cambio_estado: {
    icon: RefreshCw,
    label: 'Cambio de Estado',
    bgClass: 'bg-yellow-100',
    iconClass: 'text-yellow-700',
    borderClass: 'border-l-yellow-500',
  },
  sanitario: {
    icon: HeartPulse,
    label: 'Control Sanitario',
    bgClass: 'bg-green-100',
    iconClass: 'text-green-700',
    borderClass: 'border-l-green-500',
  },
};

const defaultConfig = {
  icon: RefreshCw,
  label: 'Actividad',
  bgClass: 'bg-gray-100',
  iconClass: 'text-gray-700',
  borderClass: 'border-l-gray-400',
};

export default function ActivityLog() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity_logs', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installations')
        .select('id, name')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const getInstallationName = (id?: string | null) =>
    installations.find(i => i.id === id)?.name || '—';

  const filteredLogs = typeFilter === 'all'
    ? logs
    : logs.filter(log => log.type === typeFilter);

  const groupedByDate = filteredLogs.reduce((acc, log) => {
    const dateKey = format(new Date(log.created_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(log);
    return acc;
  }, {} as Record<string, typeof filteredLogs>);

  return (
    <Layout title="Bitácora de Actividades" subtitle="Registro histórico de todas las operaciones">
      <div className="space-y-6">
        {/* Filters */}
        <div className="card-elevated p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Tipo de actividad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las actividades</SelectItem>
                <SelectItem value="esquejado">Esquejado</SelectItem>
                <SelectItem value="movimiento">Movimiento</SelectItem>
                <SelectItem value="cambio_estado">Cambio de Estado</SelectItem>
                <SelectItem value="sanitario">Control Sanitario</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {filteredLogs.length} registros encontrados
            </p>
          </div>
        </div>

        {/* Empty state */}
        {!isLoading && filteredLogs.length === 0 && (
          <div className="card-elevated p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No hay actividades registradas aún.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Las operaciones como esquejados y movimientos aparecerán aquí automáticamente.
            </p>
          </div>
        )}

        {/* Activity timeline */}
        <div className="space-y-8">
          {Object.entries(groupedByDate).map(([dateKey, dateLogs]) => (
            <div key={dateKey} className="animate-fade-in">
              {/* Date header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Calendar className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {format(new Date(dateKey), "EEEE, d 'de' MMMM", { locale: es })}
                  </p>
                  <p className="text-xs text-muted-foreground">{dateLogs.length} actividades</p>
                </div>
              </div>

              {/* Activity cards */}
              <div className="ml-5 border-l-2 border-border pl-8 space-y-4">
                {dateLogs.map((log, index) => {
                  const config = activityConfig[log.type] || defaultConfig;
                  const Icon = config.icon;
                  const plantIds = Array.isArray(log.plant_ids) ? log.plant_ids : [];

                  return (
                    <div
                      key={log.id}
                      className={cn('card-elevated p-4 border-l-4 animate-slide-up', config.borderClass)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', config.bgClass)}>
                          <Icon className={cn('h-5 w-5', config.iconClass)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', config.bgClass, config.iconClass)}>
                                {config.label}
                              </span>
                              <p className="font-medium text-foreground mt-2">{log.description}</p>
                            </div>
                            <time className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), 'HH:mm')}
                            </time>
                          </div>

                          {/* Details */}
                          <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                            {log.source_installation_id && (
                              <div>
                                <span className="text-muted-foreground">Origen: </span>
                                <span className="font-medium">{getInstallationName(log.source_installation_id)}</span>
                              </div>
                            )}
                            {log.target_installation_id && (
                              <div>
                                <span className="text-muted-foreground">Destino: </span>
                                <span className="font-medium">{getInstallationName(log.target_installation_id)}</span>
                              </div>
                            )}
                            {plantIds.length > 0 && (
                              <div>
                                <span className="text-muted-foreground">Plantas: </span>
                                <span className="font-medium">{plantIds.length}</span>
                              </div>
                            )}
                          </div>

                          {/* Metadata */}
                          {log.metadata && typeof log.metadata === 'object' && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {Object.entries(log.metadata as Record<string, unknown>).map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  {key}: <strong>{String(value)}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
