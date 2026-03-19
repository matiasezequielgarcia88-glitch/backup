import * as XLSX from 'xlsx';
import { Plant, PlantMaterial, ActivityLog, CHEMOTYPES } from '@/types/cultivation';
import { mockGenetics, mockWarehouses, mockInstallations } from '@/data/mockData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const getGeneticName = (geneticId: string) =>
  mockGenetics.find(g => g.id === geneticId)?.name || 'Desconocida';

const getChemotype = (geneticId: string) => {
  const gen = mockGenetics.find(g => g.id === geneticId);
  return gen ? CHEMOTYPES[gen.chemotypeCode]?.name : '-';
};

const getWarehouseName = (id: string) =>
  mockWarehouses.find(w => w.id === id)?.name || '-';

const getInstallationName = (id: string) =>
  mockInstallations.find(i => i.id === id)?.name || '-';

function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

// 1. Declaración Jurada Semestral
export function exportDeclaracionJurada(plants: Plant[], materials: PlantMaterial[]) {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const semester = now.getMonth() < 6 ? '1er' : '2do';
  const year = now.getFullYear();

  // Summary sheet
  const byState: Record<string, number> = {};
  const byGenetic: Record<string, number> = {};
  const byChemotype: Record<string, number> = {};

  plants.forEach(p => {
    byState[p.state] = (byState[p.state] || 0) + 1;
    const gName = getGeneticName(p.geneticId);
    byGenetic[gName] = (byGenetic[gName] || 0) + 1;
    const cName = getChemotype(p.geneticId);
    byChemotype[cName] = (byChemotype[cName] || 0) + 1;
  });

  const summaryData = [
    ['DECLARACIÓN JURADA SEMESTRAL'],
    ['Registro de Plantas de Cannabis para Uso Medicinal'],
    [],
    ['Período', `${semester} Semestre ${year}`],
    ['Fecha de Emisión', format(now, 'dd/MM/yyyy', { locale: es })],
    ['Total de Plantas', plants.length],
    ['Plantas en Floración', byState['floracion'] || 0],
    ['Genéticas Diferentes', Object.keys(byGenetic).length],
    [],
    ['DESGLOSE POR ESTADO'],
    ['Estado', 'Cantidad', 'Porcentaje'],
    ...Object.entries(byState).map(([state, count]) => [
      state.charAt(0).toUpperCase() + state.slice(1),
      count,
      `${((count / plants.length) * 100).toFixed(1)}%`,
    ]),
    [],
    ['DESGLOSE POR QUIMIOTIPO'],
    ['Quimiotipo', 'Cantidad'],
    ...Object.entries(byChemotype).filter(([, c]) => c > 0).map(([name, count]) => [name, count]),
    [],
    ['DESGLOSE POR GENÉTICA'],
    ['Genética', 'Quimiotipo', 'Cantidad', 'Porcentaje'],
    ...Object.entries(byGenetic).map(([name, count]) => {
      const gen = mockGenetics.find(g => g.name === name);
      return [
        name,
        gen ? CHEMOTYPES[gen.chemotypeCode]?.name : '-',
        count,
        `${((count / plants.length) * 100).toFixed(1)}%`,
      ];
    }),
    [],
    ['MATERIA VEGETAL'],
    ['Área', 'Total Gramos', 'Lotes'],
    ...(['wh-4', 'wh-5', 'wh-6'] as const).map(whId => {
      const mats = materials.filter(m => m.warehouseId === whId);
      return [
        getWarehouseName(whId),
        Math.round(mats.reduce((s, m) => s + m.weightGrams, 0) * 10) / 10,
        mats.length,
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Declaración Jurada');

  // Plants detail sheet
  const plantRows = plants.map(p => ({
    'Nro. Serie': p.serialNumber,
    'Lote': p.lotNumber,
    'Genética': getGeneticName(p.geneticId),
    'Quimiotipo': getChemotype(p.geneticId),
    'Estado': p.state,
    'Fecha Plantación': format(p.plantingDate, 'dd/MM/yyyy'),
    'Locación': getWarehouseName(p.warehouseId),
    'Instalación': getInstallationName(p.installationId),
  }));
  const ws2 = XLSX.utils.json_to_sheet(plantRows);
  ws2['!cols'] = Array(8).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Plantas');

  saveWorkbook(wb, `Declaracion_Jurada_${semester}Sem_${year}.xlsx`);
}

// 2. Reporte de Actividades
export function exportActivityReport(logs: ActivityLog[]) {
  const wb = XLSX.utils.book_new();

  const rows = logs.map(log => ({
    'Fecha': format(log.createdAt, 'dd/MM/yyyy HH:mm', { locale: es }),
    'Tipo': log.type,
    'Descripción': log.description,
    'Origen': log.sourceInstallationId ? getInstallationName(log.sourceInstallationId) : '-',
    'Destino': log.targetInstallationId ? getInstallationName(log.targetInstallationId) : '-',
    'Plantas Involucradas': log.plantIds.length,
    'Metadata': log.metadata ? JSON.stringify(log.metadata) : '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 45 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Actividades');

  saveWorkbook(wb, `Reporte_Actividades_${format(new Date(), 'yyyyMMdd')}.xlsx`);
}

// 3. Inventario Completo
export function exportInventory(plants: Plant[], materials: PlantMaterial[]) {
  const wb = XLSX.utils.book_new();

  // Plants sheet
  const plantRows = plants.map(p => ({
    'Nro. Serie': p.serialNumber,
    'Lote': p.lotNumber,
    'Genética': getGeneticName(p.geneticId),
    'Quimiotipo': getChemotype(p.geneticId),
    'Estado': p.state,
    'Fecha Plantación': format(p.plantingDate, 'dd/MM/yyyy'),
    'Locación': getWarehouseName(p.warehouseId),
    'Instalación': getInstallationName(p.installationId),
    'Notas': p.notes || '',
    'Última Actualización': format(p.updatedAt, 'dd/MM/yyyy HH:mm'),
  }));
  const ws1 = XLSX.utils.json_to_sheet(plantRows);
  ws1['!cols'] = Array(10).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws1, 'Plantas');

  // Materials sheet
  const matRows = materials.map(m => {
    const plant = plants.find(p => p.id === m.plantId);
    return {
      'Código': m.code,
      'Planta Origen': plant?.serialNumber || '-',
      'Genética': plant ? getGeneticName(plant.geneticId) : '-',
      'Peso (g)': m.weightGrams,
      'Estado': m.state,
      'Locación': getWarehouseName(m.warehouseId),
      'Instalación': getInstallationName(m.installationId),
      'Última Actualización': format(m.updatedAt, 'dd/MM/yyyy HH:mm'),
    };
  });
  const ws2 = XLSX.utils.json_to_sheet(matRows);
  ws2['!cols'] = Array(8).fill({ wch: 22 });
  XLSX.utils.book_append_sheet(wb, ws2, 'Materia Vegetal');

  saveWorkbook(wb, `Inventario_Completo_${format(new Date(), 'yyyyMMdd')}.xlsx`);
}
