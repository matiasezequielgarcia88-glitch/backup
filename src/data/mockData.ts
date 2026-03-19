import { Warehouse, Installation, Plant, ActivityLog, PlantState, Genetic, ChemotypeCode, PlantMaterial } from '@/types/cultivation';

// Mock Warehouses
export const mockWarehouses: Warehouse[] = [
  {
    id: 'wh-1',
    name: 'Sala de Cultivo Principal',
    description: 'Instalación principal de cultivo indoor',
    type: 'indoor',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'wh-2',
    name: 'Invernadero Norte',
    description: 'Invernadero para fase vegetativa',
    type: 'invernadero',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'wh-3',
    name: 'Banco de Germoplasma',
    description: 'Conservación de plantas madre',
    type: 'indoor',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'wh-4',
    name: 'Área de Secado',
    description: 'Secado de materia vegetal',
    type: 'indoor',
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'wh-5',
    name: 'Área de Curado',
    description: 'Curado de materia vegetal',
    type: 'indoor',
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'wh-6',
    name: 'Almacenamiento',
    description: 'Almacenamiento de materia vegetal procesada',
    type: 'indoor',
    createdAt: new Date('2024-03-01'),
  },
];

// Mock Installations
export const mockInstallations: Installation[] = [
  // Sala Principal
  { id: 'inst-1', warehouseId: 'wh-1', name: 'Carpa 1 - Floración', state: 'floracion', createdAt: new Date('2024-01-15') },
  { id: 'inst-2', warehouseId: 'wh-1', name: 'Carpa 2 - Floración', state: 'floracion', createdAt: new Date('2024-01-15') },
  { id: 'inst-3', warehouseId: 'wh-1', name: 'Módulo Vegetativo A', state: 'vegetativo', createdAt: new Date('2024-01-20') },
  // Invernadero
  { id: 'inst-4', warehouseId: 'wh-2', name: 'Cama Caliente 1', state: 'vegetativo', createdAt: new Date('2024-02-01') },
  { id: 'inst-5', warehouseId: 'wh-2', name: 'Mesa de Propagación', state: 'esqueje', createdAt: new Date('2024-02-05') },
  // Banco Germoplasma
  { id: 'inst-6', warehouseId: 'wh-3', name: 'Estantería Madres 1', state: 'madre', createdAt: new Date('2024-01-01') },
  { id: 'inst-7', warehouseId: 'wh-3', name: 'Estantería Madres 2', state: 'madre', createdAt: new Date('2024-01-01') },
  // Área de Secado (no state - post-harvest)
  { id: 'inst-8', warehouseId: 'wh-4', name: 'Sala de Secado 1', createdAt: new Date('2024-03-01') },
  { id: 'inst-9', warehouseId: 'wh-4', name: 'Sala de Secado 2', createdAt: new Date('2024-03-01') },
  // Área de Curado
  { id: 'inst-10', warehouseId: 'wh-5', name: 'Sala de Curado 1', createdAt: new Date('2024-03-01') },
  { id: 'inst-11', warehouseId: 'wh-5', name: 'Sala de Curado 2', createdAt: new Date('2024-03-01') },
  // Almacenamiento
  { id: 'inst-12', warehouseId: 'wh-6', name: 'Estante A', createdAt: new Date('2024-03-01') },
  { id: 'inst-13', warehouseId: 'wh-6', name: 'Estante B', createdAt: new Date('2024-03-01') },
];

// Genetics with chemotype codes - multiple genetics can share a chemotype
export const mockGenetics: Genetic[] = [
  // Chemotype I (THC dominant)
  { id: 'gen-1', name: 'OG Kush', chemotypeCode: 'I', thcRange: '20-25%', cbdRange: '<1%', description: 'Híbrido clásico, aromático' },
  { id: 'gen-2', name: 'Amnesia Haze', chemotypeCode: 'I', thcRange: '22-24%', cbdRange: '<1%', description: 'Sativa dominante, efectos cerebrales' },
  { id: 'gen-3', name: 'Girl Scout Cookies', chemotypeCode: 'I', thcRange: '25-28%', cbdRange: '<1%', description: 'Alta potencia, dulce' },
  // Chemotype II (THC/CBD balanced)
  { id: 'gen-4', name: 'Cannatonic', chemotypeCode: 'II', thcRange: '6-9%', cbdRange: '6-17%', description: 'Ratio balanceado THC:CBD' },
  { id: 'gen-5', name: 'Harlequin', chemotypeCode: 'II', thcRange: '4-7%', cbdRange: '8-16%', description: 'CBD ligeramente dominante' },
  // Chemotype III (CBD dominant)
  { id: 'gen-6', name: 'Charlotte\'s Web', chemotypeCode: 'III', thcRange: '<0.3%', cbdRange: '17-20%', description: 'CBD puro, uso medicinal' },
  { id: 'gen-7', name: 'ACDC', chemotypeCode: 'III', thcRange: '<1%', cbdRange: '14-20%', description: 'Alta concentración CBD' },
  { id: 'gen-8', name: 'Critical Mass CBD', chemotypeCode: 'III', thcRange: '5%', cbdRange: '5-10%', description: 'Alto rendimiento, balanceado' },
];

// Generate serial number based on genetic code
const generateSerialNumber = (genetic: Genetic, index: number): string => {
  const prefix = genetic.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const chemotype = genetic.chemotypeCode;
  const year = '25';
  return `${prefix}${chemotype}-${year}${String(index).padStart(5, '0')}`;
};

// Generate lot number
const generateLotNumber = (genetic: Genetic, date: Date): string => {
  const prefix = genetic.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}${dateStr}`;
};

// Initial Mock Plants
export const initialMockPlants: Plant[] = [
  // Mother plants in Germoplasma (one per genetic)
  ...mockGenetics.slice(0, 6).map((genetic, i) => ({
    id: `plant-m-${i + 1}`,
    name: `${genetic.name} Madre ${i + 1}`,
    serialNumber: generateSerialNumber(genetic, i + 1),
    lotNumber: generateLotNumber(genetic, new Date('2024-06-15')),
    geneticId: genetic.id,
    chemotypeCode: genetic.chemotypeCode,
    state: 'madre' as PlantState,
    plantingDate: new Date('2024-06-15'),
    installationId: i < 3 ? 'inst-6' : 'inst-7',
    warehouseId: 'wh-3',
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2025-01-15'),
  })),
  // Clones in propagation
  ...Array.from({ length: 20 }, (_, i) => {
    const genetic = mockGenetics[i % 6];
    return {
      id: `plant-c-${i + 1}`,
      name: `${genetic.name} Esqueje ${i + 1}`,
      serialNumber: generateSerialNumber(genetic, 100 + i + 1),
      lotNumber: generateLotNumber(genetic, new Date('2025-01-10')),
      geneticId: genetic.id,
      chemotypeCode: genetic.chemotypeCode,
      state: 'esqueje' as PlantState,
      plantingDate: new Date('2025-01-10'),
      predecessorId: `plant-m-${(i % 6) + 1}`,
      installationId: 'inst-5',
      warehouseId: 'wh-2',
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-15'),
    };
  }),
  // Vegetative plants
  ...Array.from({ length: 15 }, (_, i) => {
    const genetic = mockGenetics[i % 6];
    return {
      id: `plant-v-${i + 1}`,
      name: `${genetic.name} Veg ${i + 1}`,
      serialNumber: generateSerialNumber(genetic, 200 + i + 1),
      lotNumber: generateLotNumber(genetic, new Date('2024-12-20')),
      geneticId: genetic.id,
      chemotypeCode: genetic.chemotypeCode,
      state: 'vegetativo' as PlantState,
      plantingDate: new Date('2024-12-20'),
      predecessorId: `plant-m-${(i % 6) + 1}`,
      installationId: i < 8 ? 'inst-3' : 'inst-4',
      warehouseId: i < 8 ? 'wh-1' : 'wh-2',
      createdAt: new Date('2024-12-20'),
      updatedAt: new Date('2025-01-15'),
    };
  }),
  // Flowering plants
  ...Array.from({ length: 24 }, (_, i) => {
    const genetic = mockGenetics[i % 6];
    return {
      id: `plant-f-${i + 1}`,
      name: `${genetic.name} Flor ${i + 1}`,
      serialNumber: generateSerialNumber(genetic, 300 + i + 1),
      lotNumber: generateLotNumber(genetic, new Date('2024-11-15')),
      geneticId: genetic.id,
      chemotypeCode: genetic.chemotypeCode,
      state: 'floracion' as PlantState,
      plantingDate: new Date('2024-11-15'),
      predecessorId: `plant-m-${(i % 6) + 1}`,
      installationId: i < 12 ? 'inst-1' : 'inst-2',
      warehouseId: 'wh-1',
      createdAt: new Date('2024-11-15'),
      updatedAt: new Date('2025-01-15'),
    };
  }),
];

// Initial Mock Activity Logs
export const initialMockActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    type: 'esquejado',
    description: 'Generación de 10 esquejes de OG Kush',
    plantIds: ['plant-c-1', 'plant-c-2', 'plant-c-3'],
    sourceInstallationId: 'inst-6',
    targetInstallationId: 'inst-5',
    userId: 'user-1',
    metadata: { motherPlantId: 'plant-m-1', quantity: 10 },
    createdAt: new Date('2025-01-10T09:30:00'),
  },
  {
    id: 'log-2',
    type: 'movimiento',
    description: 'Traslado de 8 plantas a fase vegetativa',
    plantIds: ['plant-v-1', 'plant-v-2'],
    sourceInstallationId: 'inst-5',
    targetInstallationId: 'inst-3',
    userId: 'user-1',
    createdAt: new Date('2025-01-08T14:00:00'),
  },
  {
    id: 'log-3',
    type: 'cambio_estado',
    description: 'Cambio a floración - 12 plantas Carpa 1',
    plantIds: ['plant-f-1', 'plant-f-2'],
    sourceInstallationId: 'inst-3',
    targetInstallationId: 'inst-1',
    userId: 'user-1',
    createdAt: new Date('2025-01-05T10:00:00'),
  },
  {
    id: 'log-4',
    type: 'sanitario',
    description: 'Aplicación preventiva de aceite de neem',
    plantIds: [],
    targetInstallationId: 'inst-1',
    userId: 'user-1',
    metadata: { product: 'Aceite de Neem', dosage: '5ml/L' },
    createdAt: new Date('2025-01-12T08:00:00'),
  },
  {
    id: 'log-5',
    type: 'esquejado',
    description: 'Generación de 15 esquejes de Amnesia Haze',
    plantIds: ['plant-c-7', 'plant-c-8'],
    sourceInstallationId: 'inst-6',
    targetInstallationId: 'inst-5',
    userId: 'user-1',
    metadata: { motherPlantId: 'plant-m-2', quantity: 15 },
    createdAt: new Date('2025-01-15T11:30:00'),
  },
];

// Helper functions
export const getPlantsByState = (plants: Plant[]): Record<PlantState, number> => {
  return plants.reduce(
    (acc, plant) => {
      acc[plant.state] = (acc[plant.state] || 0) + 1;
      return acc;
    },
    { madre: 0, esqueje: 0, vegetativo: 0, floracion: 0 } as Record<PlantState, number>
  );
};

export const getPlantsByGenetic = (plants: Plant[]): Record<string, number> => {
  return plants.reduce(
    (acc, plant) => {
      const genetic = mockGenetics.find(g => g.id === plant.geneticId);
      const name = genetic?.name || 'Desconocido';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
};

export const getPlantsByChemotype = (plants: Plant[]): Record<ChemotypeCode, number> => {
  return plants.reduce(
    (acc, plant) => {
      acc[plant.chemotypeCode] = (acc[plant.chemotypeCode] || 0) + 1;
      return acc;
    },
    { I: 0, II: 0, III: 0, IV: 0, V: 0 } as Record<ChemotypeCode, number>
  );
};

export const getGeneticById = (id: string): Genetic | undefined => {
  return mockGenetics.find(g => g.id === id);
};

export const getInstallationsByWarehouse = (warehouseId: string): Installation[] => {
  return mockInstallations.filter((inst) => inst.warehouseId === warehouseId);
};

export const getPlantsByInstallation = (plants: Plant[], installationId: string): Plant[] => {
  return plants.filter((plant) => plant.installationId === installationId);
};

// Generate new clone serial numbers
export const generateCloneSerialNumbers = (
  motherPlant: Plant,
  quantity: number,
  existingPlants: Plant[]
): string[] => {
  const genetic = mockGenetics.find(g => g.id === motherPlant.geneticId);
  if (!genetic) return [];
  
  const maxIndex = existingPlants.reduce((max, p) => {
    const match = p.serialNumber.match(/-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);

  return Array.from({ length: quantity }, (_, i) => 
    generateSerialNumber(genetic, maxIndex + i + 1)
  );
};

// Generate plant material code from plant serial number
export const generateMaterialCode = (plantSerialNumber: string, index: number): string => {
  return `MV-${plantSerialNumber}-${String(index).padStart(2, '0')}`;
};

// Initial Mock Plant Materials
export const initialMockPlantMaterials: PlantMaterial[] = [
  // Some materials from flowering plants in Secado
  ...Array.from({ length: 6 }, (_, i) => {
    const plant = initialMockPlants.find(p => p.id === `plant-f-${i + 1}`);
    return {
      id: `mat-${i + 1}`,
      code: generateMaterialCode(plant?.serialNumber || '', 1),
      plantId: `plant-f-${i + 1}`,
      weightGrams: Math.round((50 + Math.random() * 150) * 10) / 10,
      state: 'secado' as const,
      installationId: i < 3 ? 'inst-8' : 'inst-9',
      warehouseId: 'wh-4',
      createdAt: new Date('2025-01-20'),
      updatedAt: new Date('2025-01-25'),
    };
  }),
  // Some materials in Curado
  ...Array.from({ length: 4 }, (_, i) => {
    const plant = initialMockPlants.find(p => p.id === `plant-f-${i + 7}`);
    return {
      id: `mat-${i + 7}`,
      code: generateMaterialCode(plant?.serialNumber || '', 1),
      plantId: `plant-f-${i + 7}`,
      weightGrams: Math.round((30 + Math.random() * 100) * 10) / 10,
      state: 'curado' as const,
      installationId: i < 2 ? 'inst-10' : 'inst-11',
      warehouseId: 'wh-5',
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-28'),
    };
  }),
  // Some materials in Almacenamiento
  ...Array.from({ length: 3 }, (_, i) => {
    const plant = initialMockPlants.find(p => p.id === `plant-f-${i + 11}`);
    return {
      id: `mat-${i + 11}`,
      code: generateMaterialCode(plant?.serialNumber || '', 1),
      plantId: `plant-f-${i + 11}`,
      weightGrams: Math.round((20 + Math.random() * 80) * 10) / 10,
      state: 'almacenado' as const,
      installationId: i < 2 ? 'inst-12' : 'inst-13',
      warehouseId: 'wh-6',
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-02-01'),
    };
  }),
];

// Get materials by installation
export const getMaterialsByInstallation = (materials: PlantMaterial[], installationId: string): PlantMaterial[] => {
  return materials.filter((mat) => mat.installationId === installationId);
};
