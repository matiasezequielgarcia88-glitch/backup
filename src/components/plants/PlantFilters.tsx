import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlantState, Genetic } from '@/types/cultivation';
import { CHEMOTYPES } from '@/types/cultivation';

interface PlantFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  stateFilter: PlantState | 'all';
  onStateChange: (value: PlantState | 'all') => void;
  geneticFilter: string;
  onGeneticChange: (value: string) => void;
  genetics: Genetic[];
  onClearFilters: () => void;
}

export function PlantFilters({
  searchQuery,
  onSearchChange,
  stateFilter,
  onStateChange,
  geneticFilter,
  onGeneticChange,
  genetics,
  onClearFilters,
}: PlantFiltersProps) {
  const hasFilters = searchQuery || stateFilter !== 'all' || geneticFilter !== 'all';

  // Group genetics by chemotype
  const geneticsByChemotype = genetics.reduce((acc, genetic) => {
    const chemotype = genetic.chemotypeCode;
    if (!acc[chemotype]) acc[chemotype] = [];
    acc[chemotype].push(genetic);
    return acc;
  }, {} as Record<string, Genetic[]>);

  return (
    <div className="card-elevated p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por Nº serie, lote o genética..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-search"
          />
        </div>

        {/* State filter */}
        <Select value={stateFilter} onValueChange={(v) => onStateChange(v as PlantState | 'all')}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="madre">Madre</SelectItem>
            <SelectItem value="esqueje">Esqueje</SelectItem>
            <SelectItem value="vegetativo">Vegetativo</SelectItem>
            <SelectItem value="floracion">Floración</SelectItem>
          </SelectContent>
        </Select>

        {/* Genetic filter (grouped by chemotype) */}
        <Select value={geneticFilter} onValueChange={onGeneticChange}>
          <SelectTrigger className="w-full md:w-52">
            <SelectValue placeholder="Genética" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las genéticas</SelectItem>
            {Object.entries(geneticsByChemotype).map(([chemotype, gens]) => (
              <div key={chemotype}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                  {CHEMOTYPES[chemotype as keyof typeof CHEMOTYPES]?.name || chemotype}
                </div>
                {gens.map((genetic) => (
                  <SelectItem key={genetic.id} value={genetic.id}>
                    {genetic.name}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        )}

        {/* Filter button (mobile) */}
        <Button variant="outline" size="icon" className="md:hidden">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}