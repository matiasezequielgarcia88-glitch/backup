import { ActivityLog } from '@/types/cultivation';
import { Scissors, ArrowRight, RefreshCw, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityFeedProps {
  activities: ActivityLog[];
}

const activityConfig = {
  esquejado: {
    icon: Scissors,
    bgClass: 'bg-state-clone/10',
    iconClass: 'text-state-clone',
  },
  movimiento: {
    icon: ArrowRight,
    bgClass: 'bg-info/10',
    iconClass: 'text-info',
  },
  trasplante: {
    icon: ArrowRight,
    bgClass: 'bg-info/10',
    iconClass: 'text-info',
  },
  cambio_estado: {
    icon: RefreshCw,
    bgClass: 'bg-warning/10',
    iconClass: 'text-warning',
  },
  sanitario: {
    icon: HeartPulse,
    bgClass: 'bg-success/10',
    iconClass: 'text-success',
  },
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="card-elevated">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold text-foreground">Actividad Reciente</h3>
        <p className="text-sm text-muted-foreground">Últimos registros en la bitácora</p>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity, index) => {
          const config = activityConfig[activity.type];
          const Icon = config.icon;

          return (
            <div
              key={activity.id}
              className="flex gap-4 p-4 hover:bg-muted/50 transition-colors animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                  config.bgClass
                )}
              >
                <Icon className={cn('h-5 w-5', config.iconClass)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(activity.createdAt, {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border p-3">
        <button className="w-full text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          Ver toda la bitácora →
        </button>
      </div>
    </div>
  );
}
