import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CHEMOTYPES, ChemotypeCode } from '@/types/cultivation';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dna, Calendar, MapPin, Hash, GitBranch, FlaskConical, Leaf, ArrowLeft, QrCode, Printer, MoveRight, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const STATE_LABELS: Record<string, string> = {
  madre: 'Madre', esqueje: 'Esqueje', vegetativo: 'Vegetativo', floracion: 'Floración',
};

const STATE_COLORS: Record<string, string> = {
  madre: 'bg-purple-100 text-purple-800',
  esqueje: 'bg-blue-100 text-blue-800',
  vegetativo: 'bg-green-100 text-green-800',
  floracion: 'bg-yellow-100 text-yellow-800',
};

export default function PlantDetail() {
  const { plantId } = useParams<{ plantId: string }>();
  const queryClient = useQueryClient();
  const [showQR, setShowQR] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [moveWarehouseId, setMoveWarehouseId] = useState('');
  const [moveInstallationId, setMoveInstallationId] = useState('');

  // Fetch plant
  const { data: plant, isLoading } = useQuery({
    queryKey: ['plant', plantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('*').eq('id', plantId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!plantId,
  });

  // Fetch related data
  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', plant?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('genetics').select('*').eq('organization_id', plant!.organization_id);
      if (error) throw error;
      return data;
    },
    enabled: !!plant,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', plant?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('id, name').eq('organization_id', plant!.organization_id).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!plant,
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', plant?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('installations').select('id, warehouse_id, name, state').eq('organization_id', plant!.organization_id).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!plant,
  });

  // Fetch predecessor plant if exists
  const { data: predecessor } = useQuery({
    queryKey: ['plant', plant?.predecessor_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('*').eq('id', plant!.predecessor_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!plant?.predecessor_id,
  });

  // Fetch clones of this plant
  const { data: clones = [] } = useQuery({
    queryKey: ['clones', plantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('id, serial_number, state').eq('predecessor_id', plantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!plantId,
  });

  // Fetch activity logs for this plant
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['plant-logs', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .contains('plant_ids', [plantId])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!plantId,
  });

  // Move plant mutation
  const moveMutation = useMutation({
    mutationFn: async () => {
      const targetInst = installations.find(i => i.id === moveInstallationId);
      const { error } = await supabase.from('plants').update({
        installation_id: moveInstallationId,
        warehouse_id: moveWarehouseId,
        state: targetInst?.state || plant?.state,
        updated_at: new Date().toISOString(),
      }).eq('id', plantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant', plantId] });
      queryClient.invalidateQueries({ queryKey: ['plants'] });
      toast.success('Planta movida correctamente');
      setShowMove(false);
      setMoveWarehouseId('');
      setMoveInstallationId('');
    },
    onError: (error: any) => toast.error(`Error al mover: ${error.message}`),
  });

  const plantUrl = `${window.location.origin}/planta/${plantId}`;
  const filteredInstallations = installations.filter(i => i.warehouse_id === moveWarehouseId);

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>QR - ${plant?.serial_number}</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        img { width: 200px; height: 200px; }
        h2 { font-size: 18px; margin: 12px 0 4px; }
        p { font-size: 13px; color: #666; margin: 2px 0; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(plantUrl)}" />
        <h2>${plant?.serial_number}</h2>
        <p>${plant?.name}</p>
        <p>${plant?.lot_number}</p>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Leaf className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <h1 className="text-2xl font-bold text-foreground">Planta no encontrada</h1>
          <p className="text-muted-foreground">El identificador no corresponde a ninguna planta registrada.</p>
          <Button asChild variant="outline">
            <Link to="/plantas"><ArrowLeft className="h-4 w-4 mr-2" />Volver al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const genetic = genetics.find(g => g.id === plant.genetic_id);
  const installation = installations.find(i => i.id === plant.installation_id);
  const warehouse = warehouses.find(w => w.id === plant.warehouse_id);
  const predecessorGenetic = predecessor ? genetics.find(g => g.id === predecessor.genetic_id) : null;
  const chemotype = plant.chemotype_code ? CHEMOTYPES[plant.chemotype_code as ChemotypeCode] : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/plantas"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="text-sm text-muted-foreground">Detalle de Planta</span>
        </div>

        <div className="card-elevated p-6 space-y-5">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-mono">{plant.serial_number}</h1>
                {plant.name && <p className="text-sm text-muted-foreground">{plant.name}</p>}
                <div className="mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATE_COLORS[plant.state] || 'bg-gray-100 text-gray-800'}`}>
                    {STATE_LABELS[plant.state] || plant.state}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setShowQR(true)} title="Ver QR">
                <QrCode className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setShowMove(true)} title="Mover planta">
                <MoveRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Genetic Info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Dna className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Genética</p>
                <p className="font-semibold">{genetic?.name || 'Sin genética asignada'}</p>
                {genetic?.description && <p className="text-xs text-muted-foreground mt-1">{genetic.description}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FlaskConical className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Quimiotipo</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono">
                    {chemotype?.name || `Tipo ${plant.chemotype_code}`}
                  </Badge>
                  {genetic && (
                    <span className="text-xs text-muted-foreground">
                      THC: {genetic.thc_range || '-'} | CBD: {genetic.cbd_range || '-'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Identification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Nº de Lote</p>
                <p className="font-medium text-sm">{plant.lot_number}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha de Siembra</p>
                <p className="font-medium text-sm">
                  {format(new Date(plant.planting_date), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Ubicación actual</p>
              <p className="font-medium text-sm">
                {warehouse?.name || 'Desconocida'} → {installation?.name || 'Desconocida'}
              </p>
            </div>
          </div>

          {/* Predecessor */}
          {predecessor && (
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Planta Madre</p>
                <Link to={`/planta/${predecessor.id}`} className="font-medium text-sm text-primary hover:underline">
                  {predecessor.serial_number}
                  {predecessorGenetic && <span className="text-muted-foreground"> ({predecessorGenetic.name})</span>}
                </Link>
              </div>
            </div>
          )}

          {/* Clones */}
          {clones.length > 0 && (
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Esquejes generados ({clones.length})</p>
                <div className="flex flex-wrap gap-1">
                  {clones.map(c => (
                    <Link key={c.id} to={`/planta/${c.id}`}>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono hover:bg-muted/70">{c.serial_number}</code>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {plant.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notas</p>
                <p className="text-sm">{plant.notes}</p>
              </div>
            </>
          )}

          {/* Timestamps */}
          <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
            <span>Creado: {format(new Date(plant.created_at), 'dd/MM/yyyy HH:mm')}</span>
            <span>Actualizado: {format(new Date(plant.updated_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
        </div>

        {/* Activity history */}
        {activityLogs.length > 0 && (
          <div className="card-elevated p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Historial de actividad</h2>
            </div>
            <div className="space-y-3">
              {activityLogs.map((log, index) => {
                const isMove = log.type === 'movimiento';
                const isCosecha = log.type === 'cosecha';
                const isEsquejado = log.type === 'esquejado';
                return (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        isMove ? 'bg-blue-100' : isCosecha ? 'bg-yellow-100' : isEsquejado ? 'bg-green-100' : 'bg-muted'
                      }`}>
                        {isMove ? <ArrowRight className="h-4 w-4 text-blue-600" /> :
                         isCosecha ? <Leaf className="h-4 w-4 text-yellow-600" /> :
                         isEsquejado ? <GitBranch className="h-4 w-4 text-green-600" /> :
                         <Clock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      {index < activityLogs.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1 min-h-[16px]" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-sm text-foreground">{log.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                        {' · '}
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* QR Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Código QR</DialogTitle>
            <DialogDescription>{plant.serial_number}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(plantUrl)}`}
              alt="QR Code"
              className="w-48 h-48 border rounded-lg"
            />
            <p className="text-xs text-muted-foreground text-center break-all">{plantUrl}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQR(false)}>Cerrar</Button>
            <Button onClick={handlePrintQR} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Plant Dialog */}
      <Dialog open={showMove} onOpenChange={setShowMove}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mover Planta</DialogTitle>
            <DialogDescription>Seleccioná la nueva ubicación para {plant.serial_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sala destino</Label>
              <Select value={moveWarehouseId} onValueChange={v => { setMoveWarehouseId(v); setMoveInstallationId(''); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar sala" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {moveWarehouseId && (
              <div className="space-y-2">
                <Label>Locación destino</Label>
                <Select value={moveInstallationId} onValueChange={setMoveInstallationId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar locación" /></SelectTrigger>
                  <SelectContent>
                    {filteredInstallations.map(inst => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}{inst.state ? ` (${STATE_LABELS[inst.state] || inst.state})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {moveInstallationId && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">Nuevo estado: </span>
                <span className="font-medium">
                  {STATE_LABELS[installations.find(i => i.id === moveInstallationId)?.state || ''] || 'Sin estado'}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMove(false)}>Cancelar</Button>
            <Button
              onClick={() => moveMutation.mutate()}
              disabled={!moveInstallationId || moveMutation.isPending}
            >
              {moveMutation.isPending ? 'Moviendo...' : 'Mover Planta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
