import { PlantState } from '@/types/cultivation';
import { cn } from '@/lib/utils';

interface PlantStateCardProps {
  state: PlantState;
  count: number;
  percentage: number;
}

const stateConfig: Record<
  PlantState,
  { label: string; icon: string; bgClass: string; textClass: string }
> = {
  madre: {
    label: 'Madres',
    icon: '👑',
    bgClass: 'bg-state-mother/10',
    textClass: 'text-state-mother',
  },
  esqueje: {
    label: 'Esquejes',
    icon: '🌱',
    bgClass: 'bg-state-clone/10',
    textClass: 'text-state-clone',
  },
  vegetativo: {
    label: 'Vegetativo',
    icon: '🌿',
    bgClass: 'bg-state-vegetative/10',
    textClass: 'text-state-vegetative',
  },
  floracion: {
    label: 'Floración',
    icon: '🌸',
    bgClass: 'bg-state-flowering/10',
    textClass: 'text-state-flowering',
  },
};

export function PlantStateCard({ state, count, percentage }: PlantStateCardProps) {
  const config = stateConfig[state];

  return (
    <div className="card-elevated p-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg text-lg',
            config.bgClass
          )}
        >
          {config.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{config.label}</p>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', config.textClass)}>{count}</span>
            <span className="text-xs text-muted-foreground">({percentage.toFixed(1)}%)</span>
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', config.textClass)}
          style={{ width: `${percentage}%`, backgroundColor: 'currentColor' }}
        />
      </div>
    </div>
  );
}
