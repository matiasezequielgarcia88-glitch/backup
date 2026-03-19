import { useState, useRef, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { CHEMOTYPES, ChemotypeCode } from '@/types/cultivation';
import { Printer, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

type LabelSize = 'small' | 'medium' | 'large';

const LABEL_SIZES: Record<LabelSize, { label: string; w: string; h: string }> = {
  small: { label: 'Pequeña (40x25mm)', w: '160px', h: '100px' },
  medium: { label: 'Mediana (60x40mm)', w: '240px', h: '160px' },
  large: { label: 'Grande (100x50mm)', w: '400px', h: '200px' },
};

const STATE_COLORS: Record<string, string> = {
  madre: 'bg-purple-100 text-purple-800',
  esqueje: 'bg-blue-100 text-blue-800',
  vegetativo: 'bg-green-100 text-green-800',
  floracion: 'bg-yellow-100 text-yellow-800',
};

const STATE_LABELS: Record<string, string> = {
  madre: 'Madre', esqueje: 'Esqueje', vegetativo: 'Vegetativo', floracion: 'Floración',
};

function getPlantUrl(plantId: string) {
  return `${window.location.origin}/planta/${plantId}`;
}

export default function Labels() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [searchQuery, setSearchQuery] = useState('');
  const [installationFilter, setInstallationFilter] = useState('all');
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const printRef = useRef<HTMLDivElement>(null);

  const { data: plants = [] } = useQuery({
    queryKey: ['plants', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('*').eq('organization_id', orgId!).order('serial_number');
      if (error) throw error;
      return data;
    },
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('genetics').select('id, name, chemotype_code').eq('organization_id', orgId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('installations').select('id, name').eq('organization_id', orgId!).order('name');
      if (error) throw error;
      return data;
    },
  });

  const filteredPlants = plants.filter(plant => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!plant.serial_number.toLowerCase().includes(query) &&
          !plant.lot_number.toLowerCase().includes(query)) return false;
    }
    if (installationFilter !== 'all' && plant.installation_id !== installationFilter) return false;
    return true;
  });

  const togglePlant = (id: string) => {
    setSelectedPlants(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedPlants.length === filteredPlants.length) {
      setSelectedPlants([]);
    } else {
      setSelectedPlants(filteredPlants.map(p => p.id));
    }
  };

  const selectedPlantsData = plants.filter(p => selectedPlants.includes(p.id));

  const handlePrint = useCallback(() => {
    if (!printRef.current || selectedPlantsData.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelsHtml = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, sans-serif; }
          .labels-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; }
          .label-card { border: 1px solid #ccc; border-radius: 6px; padding: 8px; display: flex; gap: 8px; page-break-inside: avoid; background: white; }
          .label-info { flex: 1; min-width: 0; }
          .label-serial { font-family: monospace; font-size: 11px; font-weight: 700; }
          .label-detail { font-size: 9px; color: #666; margin-top: 2px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="labels-grid">${labelsHtml}</div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [selectedPlantsData]);

  const qrSize = labelSize === 'small' ? 50 : labelSize === 'medium' ? 70 : 100;
  const fontSize = labelSize === 'small' ? '9px' : labelSize === 'medium' ? '11px' : '13px';
  const detailSize = labelSize === 'small' ? '7px' : labelSize === 'medium' ? '9px' : '11px';

  return (
    <Layout title="Gestión de Etiquetas" subtitle="Generar e imprimir etiquetas con códigos QR">
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Plant selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-elevated p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por Nº serie o lote..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={installationFilter} onValueChange={setInstallationFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Locación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las locaciones</SelectItem>
                  {installations.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedPlants.length === filteredPlants.length && filteredPlants.length > 0 ? 'Deseleccionar' : 'Seleccionar'} todas
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedPlants.length} plantas seleccionadas
              </span>
            </div>
          </div>

          {filteredPlants.length === 0 && (
            <div className="card-elevated p-8 text-center text-muted-foreground">
              No hay plantas que coincidan con los filtros.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredPlants.slice(0, 20).map((plant, index) => {
              const isSelected = selectedPlants.includes(plant.id);
              const genetic = genetics.find(g => g.id === plant.genetic_id);
              return (
                <div
                  key={plant.id}
                  onClick={() => togglePlant(plant.id)}
                  className={cn(
                    'card-elevated p-4 cursor-pointer transition-all animate-fade-in',
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <code className="font-mono text-sm font-semibold">{plant.serial_number}</code>
                      <p className="text-sm text-muted-foreground">{genetic?.name || 'Sin genética'}</p>
                      <p className="text-xs text-muted-foreground">Lote: {plant.lot_number}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                        isSelected ? 'bg-primary border-primary' : 'border-border bg-background'
                      )}>
                        {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATE_COLORS[plant.state] || 'bg-gray-100 text-gray-800'}`}>
                        {STATE_LABELS[plant.state] || plant.state}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPlants.length > 20 && (
            <p className="text-center text-sm text-muted-foreground">
              Mostrando 20 de {filteredPlants.length} plantas
            </p>
          )}
        </div>

        {/* Label preview & print */}
        <div className="space-y-4">
          <div className="card-elevated p-6 sticky top-24">
            <h3 className="font-semibold text-foreground mb-4">Vista Previa de Etiqueta</h3>

            {selectedPlantsData.length > 0 ? (
              <div className="space-y-4">
                {/* Preview first label */}
                {(() => {
                  const first = selectedPlantsData[0];
                  const genetic = genetics.find(g => g.id === first.genetic_id);
                  const chemotype = first.chemotype_code ? CHEMOTYPES[first.chemotype_code as ChemotypeCode] : null;
                  return (
                    <div className="p-4 bg-white border-2 border-dashed border-border rounded-lg">
                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0">
                          <QRCodeSVG value={getPlantUrl(first.id)} size={qrSize} level="M" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs font-bold text-gray-900">{first.serial_number}</p>
                          <p className="text-xs text-gray-600 mt-1">{genetic?.name || 'Sin genética'}</p>
                          <p className="text-[10px] text-gray-500">{chemotype?.name || ''}</p>
                          <p className="text-[10px] text-gray-500">Lote: {first.lot_number}</p>
                          <p className="text-[10px] text-gray-500">
                            {format(new Date(first.planting_date), 'dd/MM/yyyy', { locale: es })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <Label>Formato de Etiqueta</Label>
                  <Select value={labelSize} onValueChange={v => setLabelSize(v as LabelSize)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LABEL_SIZES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full gap-2" size="lg" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Imprimir {selectedPlants.length} Etiqueta{selectedPlants.length !== 1 && 's'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  El QR enlaza al detalle de cada planta en la app
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Printer className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Seleccioná plantas para generar etiquetas
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden printable labels */}
      <div ref={printRef} className="hidden">
        {selectedPlantsData.map(plant => {
          const genetic = genetics.find(g => g.id === plant.genetic_id);
          const chemotype = plant.chemotype_code ? CHEMOTYPES[plant.chemotype_code as ChemotypeCode] : null;
          return (
            <div key={plant.id} className="label-card" style={{ width: LABEL_SIZES[labelSize].w, height: LABEL_SIZES[labelSize].h }}>
              <div style={{ flexShrink: 0 }}>
                <QRCodeSVG value={getPlantUrl(plant.id)} size={qrSize} level="M" />
              </div>
              <div className="label-info">
                <div className="label-serial" style={{ fontSize }}>{plant.serial_number}</div>
                <div className="label-detail" style={{ fontSize: detailSize }}>{genetic?.name || 'Sin genética'}</div>
                <div className="label-detail" style={{ fontSize: detailSize }}>{chemotype?.name || ''}</div>
                <div className="label-detail" style={{ fontSize: detailSize }}>Lote: {plant.lot_number}</div>
                <div className="label-detail" style={{ fontSize: detailSize }}>
                  {format(new Date(plant.planting_date), 'dd/MM/yyyy', { locale: es })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
