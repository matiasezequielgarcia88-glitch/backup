import { PlantState } from '@/types/cultivation';
import { cn } from '@/lib/utils';

interface PlantStateBadgeProps {
  state: PlantState;
  size?: 'sm' | 'md';
}

const stateConfig: Record<PlantState, { label: string; className: string }> = {
  madre: { label: 'Madre', className: 'badge-mother' },
  esqueje: { label: 'Esqueje', className: 'badge-clone' },
  vegetativo: { label: 'Vegetativo', className: 'badge-vegetative' },
  floracion: { label: 'Floración', className: 'badge-flowering' },
};

export function PlantStateBadge({ state, size = 'md' }: PlantStateBadgeProps) {
  const config = stateConfig[state];

  return (
    <span
      className={cn(
        config.className,
        size === 'sm' && 'text-[10px] px-2 py-0.5'
      )}
    >
      {config.label}
    </span>
  );
}
